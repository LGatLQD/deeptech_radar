import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const SORT_COLUMNS: Record<string, string> = {
  rank_position: 'rank_position',
  combined_score: 'combined_score',
  core_score: 'core_score',
  alignment_score: 'alignment_score',
  date_of_creation: 'date_of_creation',
  company_name: 'company_name',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get('q') || '').trim();
    const stage = searchParams.getAll('stage');
    const hub = searchParams.getAll('hub');
    const category = searchParams.getAll('category');
    const validatedOnly = searchParams.get('validated_only') === 'true';
    const sortKey = searchParams.get('sort_key') || 'rank_position';
    const sortDir =
      (searchParams.get('sort_dir') || 'asc').toLowerCase() === 'desc'
        ? 'DESC'
        : 'ASC';

    const orderColumn = SORT_COLUMNS[sortKey] || 'rank_position';

    const conditions: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (q) {
      conditions.push(`(
        v.company_name ILIKE $${i}
        OR v.company_number ILIKE $${i}
        OR COALESCE(v.registered_locality, '') ILIKE $${i}
        OR v.tech_hub ILIKE $${i}
        OR EXISTS (
          SELECT 1
          FROM unnest(COALESCE(v.display_categories, ARRAY[]::text[])) AS cat
          WHERE cat ILIKE $${i}
        )
      )`);
      values.push(`%${q}%`);
      i++;
    }

    if (stage.length > 0) {
      conditions.push(`v.stage_estimate = ANY($${i})`);
      values.push(stage);
      i++;
    }

    if (hub.length > 0) {
      conditions.push(`v.tech_hub = ANY($${i})`);
      values.push(hub);
      i++;
    }

    if (category.length > 0) {
      conditions.push(`v.display_categories && $${i}::text[]`);
      values.push(category);
      i++;
    }

    if (validatedOnly) {
      conditions.push(`v.cross_ref_promote = true`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      WITH filtered AS (
        SELECT *
        FROM investment_tool_view v
        ${whereClause}
      ),
      ranked AS (
        SELECT
          *,
          ROW_NUMBER() OVER (ORDER BY combined_score DESC, company_name ASC) AS rank_position,
          COUNT(*) OVER () AS total_ranked
        FROM filtered
      ),
      directors AS (
        SELECT
          o.company_number,
          json_agg(
            json_build_object(
              'name', o.name,
              'role', o.role,
              'linkedin_url', NULL
            )
            ORDER BY
              CASE WHEN o.role ILIKE '%director%' THEN 0 ELSE 1 END,
              o.appointed_on NULLS LAST,
              o.name
          ) AS directors
        FROM officers o
        WHERE o.name IS NOT NULL
          AND COALESCE(o.name, '') <> ''
          AND o.resigned_on IS NULL
        GROUP BY o.company_number
      )
      SELECT
        r.*,
        d.directors
      FROM ranked r
      LEFT JOIN directors d
        ON r.company_number = d.company_number
      ORDER BY ${orderColumn} ${sortDir}, r.company_name ASC
      LIMIT 300
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM investment_tool_view v
      ${whereClause}
    `;

    const [rowsRes, countRes] = await Promise.all([
      pool.query(sql, values),
      pool.query(countSql, values),
    ]);

    return NextResponse.json({
      rows: rowsRes.rows,
      total: countRes.rows[0]?.total ?? 0,
      returned: rowsRes.rows.length,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to load investment tool data' },
      { status: 500 }
    );
  }
}
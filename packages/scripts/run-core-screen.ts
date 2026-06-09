import '../config/env';
import { pool } from '../db';
import { scoreCompany } from '../scoring/level2-core';

const FETCH_BATCH_SIZE = 5000;
const WRITE_BATCH_SIZE = 500;

type ScoredRow = {
  company_number: string;
  sic_score: number;
  primary_sic_category: string;
  sic_categories: string[];
  keyword_categories: string[];
  sector_categories: string[];
  keyword_score: number;
  cluster_score: number;
  recency_score: number;
  core_score: number;
  confidence_band: string;
  promoted_to_enrichment: boolean;
};

// Writes one multi-row INSERT per batch instead of one INSERT per company.
// Mirrors the insertBatch() pattern already used in import-bulk.ts.
async function insertScoredBatch(rows: ScoredRow[]) {
  if (rows.length === 0) return;

  const values: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  for (const r of rows) {
    values.push(
      `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`
    );

    params.push(
      r.company_number,
      r.sic_score,
      r.primary_sic_category,
      r.sic_categories,
      r.keyword_categories,
      r.sector_categories,
      r.keyword_score,
      r.cluster_score,
      r.recency_score,
      r.core_score,
      r.confidence_band,
      r.promoted_to_enrichment
    );
  }

  await pool.query(
    `
    INSERT INTO core_screen_results (
      company_number,
      sic_score,
      primary_sic_category,
      sic_categories,
      keyword_categories,
      sector_categories,
      keyword_score,
      cluster_score,
      recency_score,
      core_score,
      confidence_band,
      promoted_to_enrichment
    )
    VALUES ${values.join(', ')}
    ON CONFLICT (company_number) DO UPDATE SET
      sic_score = EXCLUDED.sic_score,
      primary_sic_category = EXCLUDED.primary_sic_category,
      sic_categories = EXCLUDED.sic_categories,
      keyword_categories = EXCLUDED.keyword_categories,
      sector_categories = EXCLUDED.sector_categories,
      keyword_score = EXCLUDED.keyword_score,
      cluster_score = EXCLUDED.cluster_score,
      recency_score = EXCLUDED.recency_score,
      core_score = EXCLUDED.core_score,
      confidence_band = EXCLUDED.confidence_band,
      promoted_to_enrichment = EXCLUDED.promoted_to_enrichment
    `,
    params
  );
}

async function run() {
  console.log('Starting full Level 2 scoring...');

  const countRes = await pool.query(
    'SELECT COUNT(*)::int AS count FROM companies'
  );
  const total = countRes.rows[0].count as number;

  console.log(`Total companies to score: ${total.toLocaleString()}`);

  let offset = 0;
  let processed = 0;

  while (true) {
    const res = await pool.query(
      `
      SELECT
        company_number,
        company_name,
        sic_codes,
        registered_postcode
      FROM companies
      ORDER BY company_number
      LIMIT $1 OFFSET $2
      `,
      [FETCH_BATCH_SIZE, offset]
    );

    const rows = res.rows;
    if (rows.length === 0) break;

    // Score every company in this fetch-batch first (pure CPU work, no DB calls)...
    const scored: ScoredRow[] = rows.map((company) => {
      const result = scoreCompany({
        company_name: company.company_name,
        sic_codes: company.sic_codes || [],
        registered_postcode: company.registered_postcode,
      });

      return {
        company_number: company.company_number,
        sic_score: result.sicScore,
        primary_sic_category: result.primarySicCategory,
        sic_categories: result.sicCategories,
        keyword_categories: result.keywordCategories,
        sector_categories: result.sectorCategories,
        keyword_score: result.keywordScore,
        cluster_score: result.clusterScore,
        recency_score: result.recencyScore,
        core_score: result.coreScore,
        confidence_band: result.confidenceBand,
        promoted_to_enrichment: result.promotedToEnrichment,
      };
    });

    // ...then write the results out in small multi-row INSERTs, so a fetch-batch
    // of 5,000 results in ~10 database round trips instead of 5,000.
    for (let i = 0; i < scored.length; i += WRITE_BATCH_SIZE) {
      await insertScoredBatch(scored.slice(i, i + WRITE_BATCH_SIZE));
      processed += Math.min(WRITE_BATCH_SIZE, scored.length - i);
    }

    offset += rows.length;

    console.log(
      `Processed ${processed.toLocaleString()} / ${total.toLocaleString()} (${((processed / total) * 100).toFixed(2)}%)`
    );
  }

  console.log(`Finished. Processed ${processed.toLocaleString()} companies.`);
  await pool.end();
}

run().catch(async (err) => {
  console.error('Level 2 scoring failed');
  console.error(err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
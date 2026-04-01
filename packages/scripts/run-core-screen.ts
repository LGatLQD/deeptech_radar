import '../config/env';
import { pool } from '../db';
import { scoreCompany } from '../scoring/level2-core';

const BATCH_SIZE = 5000;

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
      [BATCH_SIZE, offset]
    );

    const rows = res.rows;
    if (rows.length === 0) break;

    for (const company of rows) {
      const result = scoreCompany({
        company_name: company.company_name,
        sic_codes: company.sic_codes || [],
        registered_postcode: company.registered_postcode,
      });

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
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
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
        [
          company.company_number,
          result.sicScore,
          result.primarySicCategory,
          result.sicCategories,
          result.keywordCategories,
          result.sectorCategories,
          result.keywordScore,
          result.clusterScore,
          result.recencyScore,
          result.coreScore,
          result.confidenceBand,
          result.promotedToEnrichment,
        ]
      );

      processed++;
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
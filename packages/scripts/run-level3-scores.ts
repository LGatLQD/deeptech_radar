import '../config/env';
import { pool } from '../db';
import { scoreEnrichedCompany } from '../scoring/level3-enrichment';

const COMPANY_LIMIT = 11000;

async function run() {
  console.log('Starting Level 3 scoring...');

  const res = await pool.query(
    `
    SELECT
      c.company_number,
      c.company_name
    FROM companies c
    JOIN core_screen_results r
      ON c.company_number = r.company_number
    WHERE r.promoted_to_enrichment = true
    ORDER BY r.core_score DESC, c.company_number ASC
    LIMIT $1
    `,
    [COMPANY_LIMIT]
  );

  const companies = res.rows;
  console.log(`Companies selected for Level 3 scoring: ${companies.length}`);

  let processed = 0;

  for (const company of companies) {
    const companyNumber = company.company_number as string;

    const filingsRes = await pool.query(
      `SELECT * FROM filings WHERE company_number = $1 ORDER BY filing_date DESC NULLS LAST`,
      [companyNumber]
    );

    const officersRes = await pool.query(
      `SELECT * FROM officers WHERE company_number = $1`,
      [companyNumber]
    );

    const pscsRes = await pool.query(
      `SELECT * FROM pscs WHERE company_number = $1`,
      [companyNumber]
    );

    const chargesRes = await pool.query(
      `SELECT * FROM charges WHERE company_number = $1`,
      [companyNumber]
    );

    const result = scoreEnrichedCompany({
      filings: filingsRes.rows,
      officers: officersRes.rows,
      pscs: pscsRes.rows,
      charges: chargesRes.rows,
    });

    await pool.query(
      `
      INSERT INTO enrichment_results (
        company_number,
        cap_table_score,
        team_score,
        activity_score,
        alignment_score,
        stage_estimate,
        stage_confidence,
        why_selected,
        risk_flags,
        enriched_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
      ON CONFLICT (company_number) DO UPDATE SET
        cap_table_score = EXCLUDED.cap_table_score,
        team_score = EXCLUDED.team_score,
        activity_score = EXCLUDED.activity_score,
        alignment_score = EXCLUDED.alignment_score,
        stage_estimate = EXCLUDED.stage_estimate,
        stage_confidence = EXCLUDED.stage_confidence,
        why_selected = EXCLUDED.why_selected,
        risk_flags = EXCLUDED.risk_flags,
        enriched_at = NOW()
      `,
      [
        companyNumber,
        result.capTableScore,
        result.teamScore,
        result.activityScore,
        result.alignmentScore,
        result.stageEstimate,
        result.stageConfidence,
        JSON.stringify(result.whySelected),
        JSON.stringify(result.riskFlags),
      ]
    );

    processed++;

    if (processed % 50 === 0) {
      console.log(`Processed ${processed} / ${companies.length}`);
    }
  }

  console.log(`Finished Level 3 scoring for ${processed} companies.`);
  await pool.end();
}

run().catch(async (err) => {
  console.error('Level 3 scoring failed');
  console.error(err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
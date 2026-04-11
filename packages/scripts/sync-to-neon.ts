import '../config/env';
import { Pool } from 'pg';

const localPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
});

const BATCH_SIZE = 200;

async function getLocalViewNumbers(): Promise<string[]> {
  const res = await localPool.query(`
    SELECT company_number FROM investment_tool_view
  `);
  return res.rows.map((r: { company_number: string }) => r.company_number);
}

async function syncCompanies(numbers: string[]) {
  console.log('Syncing companies...');
  for (let i = 0; i < numbers.length; i += BATCH_SIZE) {
    const batch = numbers.slice(i, i + BATCH_SIZE);
    const res = await localPool.query(
      `SELECT * FROM companies WHERE company_number = ANY($1)`,
      [batch]
    );
    for (const r of res.rows) {
      await neonPool.query(`
        INSERT INTO companies (company_number, company_name, company_status, company_type, date_of_creation, jurisdiction, registered_postcode, registered_locality, registered_region, sic_codes, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (company_number) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          company_status = EXCLUDED.company_status,
          registered_postcode = EXCLUDED.registered_postcode,
          registered_locality = EXCLUDED.registered_locality,
          sic_codes = EXCLUDED.sic_codes,
          updated_at = EXCLUDED.updated_at
      `, [r.company_number, r.company_name, r.company_status, r.company_type, r.date_of_creation, r.jurisdiction, r.registered_postcode, r.registered_locality, r.registered_region, JSON.stringify(r.sic_codes), r.created_at, r.updated_at]);
    }
    console.log(`  Companies: ${Math.min(i + BATCH_SIZE, numbers.length)} / ${numbers.length}`);
  }
}

async function syncCoreScreenResults(numbers: string[]) {
  console.log('Syncing core screen results...');
  for (let i = 0; i < numbers.length; i += BATCH_SIZE) {
    const batch = numbers.slice(i, i + BATCH_SIZE);
    const res = await localPool.query(
      `SELECT * FROM core_screen_results WHERE company_number = ANY($1)`,
      [batch]
    );
    for (const r of res.rows) {
      await neonPool.query(`
        INSERT INTO core_screen_results (company_number, core_score, sic_score, keyword_score, cluster_score, recency_score, primary_sic_category, sic_categories, keyword_categories, sector_categories, confidence_band, promotion_reason, promoted_to_enrichment, cross_ref_promote, screened_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (company_number) DO UPDATE SET
          core_score = EXCLUDED.core_score,
          sic_score = EXCLUDED.sic_score,
          keyword_score = EXCLUDED.keyword_score,
          cluster_score = EXCLUDED.cluster_score,
          promoted_to_enrichment = EXCLUDED.promoted_to_enrichment,
          cross_ref_promote = EXCLUDED.cross_ref_promote
      `, [r.company_number, r.core_score, r.sic_score, r.keyword_score, r.cluster_score, r.recency_score, r.primary_sic_category, r.sic_categories, r.keyword_categories, r.sector_categories, r.confidence_band, r.promotion_reason, r.promoted_to_enrichment, r.cross_ref_promote, r.screened_at]);
    }
    console.log(`  Core results: ${Math.min(i + BATCH_SIZE, numbers.length)} / ${numbers.length}`);
  }
}

async function syncEnrichmentResults(numbers: string[]) {
  console.log('Syncing enrichment results...');
  for (let i = 0; i < numbers.length; i += BATCH_SIZE) {
    const batch = numbers.slice(i, i + BATCH_SIZE);
    const res = await localPool.query(
      `SELECT * FROM enrichment_results WHERE company_number = ANY($1)`,
      [batch]
    );
    for (const r of res.rows) {
      await neonPool.query(`
        INSERT INTO enrichment_results (company_number, funding_activity_score, cap_table_score, team_score, debt_score, activity_score, investment_relevance_score, alignment_score, stage_estimate, stage_confidence, why_selected, risk_flags, enriched_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (company_number) DO UPDATE SET
          cap_table_score = EXCLUDED.cap_table_score,
          team_score = EXCLUDED.team_score,
          activity_score = EXCLUDED.activity_score,
          alignment_score = EXCLUDED.alignment_score,
          stage_estimate = EXCLUDED.stage_estimate,
          stage_confidence = EXCLUDED.stage_confidence,
          why_selected = EXCLUDED.why_selected,
          risk_flags = EXCLUDED.risk_flags,
          enriched_at = EXCLUDED.enriched_at
      `, [r.company_number, r.funding_activity_score ?? 0, r.cap_table_score, r.team_score, r.debt_score ?? 0, r.activity_score, r.investment_relevance_score ?? 0, r.alignment_score, r.stage_estimate, r.stage_confidence, JSON.stringify(r.why_selected), JSON.stringify(r.risk_flags), r.enriched_at]);
    }
    console.log(`  Enrichment: ${Math.min(i + BATCH_SIZE, numbers.length)} / ${numbers.length}`);
  }
}

async function syncChildTable(numbers: string[], table: string) {
  console.log(`Syncing ${table}...`);
  // Clear all existing rows in Neon first to avoid ID conflicts from previous runs
  await neonPool.query(`TRUNCATE ${table} RESTART IDENTITY`);
  for (let i = 0; i < numbers.length; i += BATCH_SIZE) {
    const batch = numbers.slice(i, i + BATCH_SIZE);
    const res = await localPool.query(
      `SELECT * FROM ${table} WHERE company_number = ANY($1)`,
      [batch]
    );
    for (const r of res.rows) {
      const keys = Object.keys(r).filter((k) => k !== 'id');
      const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
      const values = keys.map((k) => {
        const v = r[k];
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) return JSON.stringify(v);
        if (Array.isArray(v)) return JSON.stringify(v);
        return v;
      });
      await neonPool.query(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
    console.log(`  ${table}: ${Math.min(i + BATCH_SIZE, numbers.length)} / ${numbers.length}`);
  }
}

async function removeDeletedFromNeon(localNumbers: Set<string>) {
  console.log('Removing dissolved companies from Neon...');
  const res = await neonPool.query(`SELECT company_number FROM companies`);
  const neonNumbers: string[] = res.rows.map((r: { company_number: string }) => r.company_number);
  const toDelete = neonNumbers.filter((n) => !localNumbers.has(n));

  if (toDelete.length === 0) {
    console.log('  Nothing to remove from Neon.');
    return;
  }

  console.log(`  Removing ${toDelete.length} companies from Neon...`);
  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const batch = toDelete.slice(i, i + BATCH_SIZE);
    await neonPool.query(
      `DELETE FROM companies WHERE company_number = ANY($1)`,
      [batch]
    );
  }
  console.log(`  Removed ${toDelete.length} dissolved companies from Neon.`);
}

async function run() {
  console.log('Starting Neon sync...');

  if (!process.env.NEON_DATABASE_URL || process.env.NEON_DATABASE_URL === 'your-neon-connection-string-here') {
    throw new Error('NEON_DATABASE_URL is not set in .env');
  }

  const childTablesOnly = process.argv.includes('--child-tables-only');
  const fromArg = process.argv.find(a => a.startsWith('--from='));
  const fromTable = fromArg ? fromArg.split('=')[1] : null;
  const childTables = ['filings', 'officers', 'pscs', 'charges'];
  const startIdx = fromTable ? childTables.indexOf(fromTable) : 0;

  const numbers = await getLocalViewNumbers();
  console.log(`Companies to sync: ${numbers.length.toLocaleString()}`);

  if (!childTablesOnly) {
    await syncCompanies(numbers);
    await syncCoreScreenResults(numbers);
    await syncEnrichmentResults(numbers);
  } else {
    console.log('Skipping companies/core/enrichment (--child-tables-only mode)');
  }
  for (let i = startIdx; i < childTables.length; i++) {
    await syncChildTable(numbers, childTables[i]);
  }
  await removeDeletedFromNeon(new Set(numbers));

  console.log('Neon sync complete.');
  await localPool.end();
  await neonPool.end();
}

run().catch(async (err) => {
  console.error('Neon sync failed:', err);
  try {
    await localPool.end();
    await neonPool.end();
  } catch {}
  process.exit(1);
});

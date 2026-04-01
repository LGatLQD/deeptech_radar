import '../config/env';
import { pool } from '../db';
import {
  fetchFilingHistory,
  fetchOfficers,
  fetchPSCs,
  fetchCharges,
} from '../ch-client';

const CALL_DELAY_MS = 700;
const COMPANY_LIMIT = 11000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeFetch<T>(
  fn: () => Promise<T>,
  label: string,
  companyNumber: string
): Promise<T | null> {
  try {
    const result = await fn();
    await sleep(CALL_DELAY_MS);
    return result;
  } catch (err: any) {
    console.error(
      `Failed ${label} for ${companyNumber}:`,
      err.response?.data || err.message || err
    );
    await sleep(CALL_DELAY_MS);
    return null;
  }
}

async function storeFilings(companyNumber: string, payload: any) {
  const items = payload?.items || [];
  if (!items.length) return;

  for (const item of items) {
    await pool.query(
      `
      INSERT INTO filings (
        company_number,
        transaction_id,
        filing_type,
        category,
        filing_date,
        description,
        raw_json
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        companyNumber,
        item.transaction_id ?? null,
        item.type ?? null,
        item.category ?? null,
        item.date ?? null,
        item.description ?? null,
        JSON.stringify(item),
      ]
    );
  }
}

async function storeOfficers(companyNumber: string, payload: any) {
  const items = payload?.items || [];
  if (!items.length) return;

  for (const item of items) {
    await pool.query(
      `
      INSERT INTO officers (
        company_number,
        name,
        role,
        appointed_on,
        resigned_on,
        nationality,
        occupation,
        raw_json
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        companyNumber,
        item.name ?? null,
        item.officer_role ?? null,
        item.appointed_on ?? null,
        item.resigned_on ?? null,
        item.nationality ?? null,
        item.occupation ?? null,
        JSON.stringify(item),
      ]
    );
  }
}

async function storePSCs(companyNumber: string, payload: any) {
  const items = payload?.items || [];
  if (!items.length) return;

  for (const item of items) {
    await pool.query(
      `
      INSERT INTO pscs (
        company_number,
        name,
        kind,
        notified_on,
        ceased_on,
        natures_of_control,
        raw_json
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        companyNumber,
        item.name ?? item.ceased_on ?? null,
        item.kind ?? null,
        item.notified_on ?? null,
        item.ceased_on ?? null,
        JSON.stringify(item.natures_of_control || []),
        JSON.stringify(item),
      ]
    );
  }
}

async function storeCharges(companyNumber: string, payload: any) {
  const items = payload?.items || [];
  if (!items.length) return;

  for (const item of items) {
    await pool.query(
      `
      INSERT INTO charges (
        company_number,
        charge_code,
        created_on,
        status,
        persons_entitled,
        classification_description,
        raw_json
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        companyNumber,
        item.charge_code ?? null,
        item.created_on ?? null,
        item.status ?? null,
        JSON.stringify(item.persons_entitled || []),
        item.classification?.description ?? null,
        JSON.stringify(item),
      ]
    );
  }
}

async function run() {
  console.log('Starting delta raw enrichment...');

  const res = await pool.query(
    `
    SELECT
      c.company_number,
      c.company_name,
      r.core_score
    FROM companies c
    JOIN core_screen_results r
      ON c.company_number = r.company_number
    WHERE (r.promoted_to_enrichment = true OR COALESCE(r.cross_ref_promote, false) = true)
      AND NOT EXISTS (
        SELECT 1
        FROM filings f
        WHERE f.company_number = c.company_number
      )
    ORDER BY r.core_score DESC, c.company_number ASC
    LIMIT $1
    `,
    [COMPANY_LIMIT]
  );

  const companies = res.rows;
  console.log(`Companies selected for enrichment: ${companies.length}`);

  let processed = 0;

  for (const company of companies) {
    const companyNumber = company.company_number as string;
    console.log(`Enriching ${companyNumber} - ${company.company_name}`);

    await pool.query('BEGIN');

    try {
      const filings = await safeFetch(
        () => fetchFilingHistory(companyNumber),
        'filing history',
        companyNumber
      );
      if (filings) await storeFilings(companyNumber, filings);

      const officers = await safeFetch(
        () => fetchOfficers(companyNumber),
        'officers',
        companyNumber
      );
      if (officers) await storeOfficers(companyNumber, officers);

      const pscs = await safeFetch(
        () => fetchPSCs(companyNumber),
        'pscs',
        companyNumber
      );
      if (pscs) await storePSCs(companyNumber, pscs);

      const charges = await safeFetch(
        () => fetchCharges(companyNumber),
        'charges',
        companyNumber
      );
      if (charges) await storeCharges(companyNumber, charges);

      await pool.query('COMMIT');
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error(`Enrichment transaction failed for ${companyNumber}:`, err);
    }

    processed++;

    if (processed % 25 === 0) {
      console.log(`Processed ${processed} / ${companies.length}`);
    }
  }

  console.log(`Finished raw enrichment for ${processed} companies.`);
  await pool.end();
}

run().catch(async (err) => {
  console.error('Raw enrichment failed');
  console.error(err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
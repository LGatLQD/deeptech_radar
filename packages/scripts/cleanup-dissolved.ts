import '../config/env';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { pool } from '../db';

const LOG_PATH = path.resolve(process.cwd(), 'dissolved-log.md');

const FILE_PATH =
  process.argv[2] ||
  '/Users/macbook/Downloads/BasicCompanyDataAsOneFile-2026-04-01.csv';

type CsvRow = {
  CompanyNumber?: string;
};

async function buildActiveSet(): Promise<Set<string>> {
  console.log(`Reading active company numbers from: ${FILE_PATH}`);

  const activeSet = new Set<string>();

  const stream = fs.createReadStream(FILE_PATH).pipe(
    csv({ mapHeaders: ({ header }) => header.trim() })
  );

  for await (const rawRow of stream) {
    const row = rawRow as CsvRow;
    const num = (row.CompanyNumber || '').trim();
    if (num) activeSet.add(num);
  }

  console.log(`Active companies in snapshot: ${activeSet.size.toLocaleString()}`);
  return activeSet;
}

async function run() {
  console.log('Starting dissolved company cleanup...');

  const activeSet = await buildActiveSet();

  // Fetch all company numbers currently in our DB
  const res = await pool.query('SELECT company_number FROM companies');
  const dbNumbers: string[] = res.rows.map((r) => r.company_number);
  console.log(`Companies in DB: ${dbNumbers.length.toLocaleString()}`);

  // Find companies in DB that are absent from the new snapshot
  const dissolved = dbNumbers.filter((n) => !activeSet.has(n));
  console.log(`Companies to remove (dissolved/struck off): ${dissolved.length.toLocaleString()}`);

  if (dissolved.length === 0) {
    console.log('Nothing to remove.');
    await pool.end();
    return;
  }

  // Fetch company names before deleting so we can log them
  const nameRes = await pool.query(
    `SELECT company_number, company_name FROM companies WHERE company_number = ANY($1)`,
    [dissolved]
  );
  const nameMap: Record<string, string> = {};
  for (const r of nameRes.rows as { company_number: string; company_name: string }[]) {
    nameMap[r.company_number] = r.company_name;
  }

  // Append to dissolved-log.md
  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `\n## ${date} — ${dissolved.length} companies removed\n`,
    ...dissolved.map((n) => `- ${n} — ${nameMap[n] ?? 'Unknown'}`),
    '',
  ];
  fs.appendFileSync(LOG_PATH, lines.join('\n'));
  console.log(`Logged ${dissolved.length} dissolved companies to dissolved-log.md`);

  // Delete in batches — CASCADE handles filings, officers, pscs, charges,
  // core_screen_results and enrichment_results automatically
  const BATCH_SIZE = 500;
  let removed = 0;

  for (let i = 0; i < dissolved.length; i += BATCH_SIZE) {
    const batch = dissolved.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map((_, idx) => `$${idx + 1}`).join(', ');
    await pool.query(
      `DELETE FROM companies WHERE company_number IN (${placeholders})`,
      batch
    );
    removed += batch.length;
    console.log(`Removed ${removed} / ${dissolved.length}`);
  }

  console.log(`Cleanup complete. Removed ${removed} dissolved companies.`);
  await pool.end();
}

run().catch(async (err) => {
  console.error('Cleanup failed:', err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});

import '../config/env';
import fs from 'fs';
import csv from 'csv-parser';
import { pool } from '../db';

const FILE_PATH =
  process.argv[2] ||
  '/Users/macbook/Downloads/BasicCompanyDataAsOneFile-2026-04-01.csv';

const BATCH_SIZE = 1000;

type CsvRow = {
  CompanyName?: string;
  CompanyNumber?: string;
  'RegAddress.PostCode'?: string;
  'RegAddress.PostTown'?: string;
  'RegAddress.County'?: string;
  CompanyCategory?: string;
  CompanyStatus?: string;
  IncorporationDate?: string;
  'SICCode.SicText_1'?: string;
  'SICCode.SicText_2'?: string;
  'SICCode.SicText_3'?: string;
  'SICCode.SicText_4'?: string;
};

function parseUkDate(value?: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split('/');
  if (parts.length !== 3) return null;

  const [dd, mm, yyyy] = parts;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);

  if (!day || !month || !year) return null;

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function toIsoDate(value?: string): string | null {
  const date = parseUkDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

function extractSicCodes(row: CsvRow): string[] {
  const fields = [
    row['SICCode.SicText_1'],
    row['SICCode.SicText_2'],
    row['SICCode.SicText_3'],
    row['SICCode.SicText_4'],
  ];

  const codes = fields
    .map((v) => (v || '').trim())
    .filter(Boolean)
    .map((v) => {
      const match = v.match(/^(\d{5})\s*-/);
      return match ? match[1] : null;
    })
    .filter((v): v is string => Boolean(v));

  return [...new Set(codes)];
}

function isEligible(row: CsvRow): boolean {
  const companyNumber = (row.CompanyNumber || '').trim();
  const category = (row.CompanyCategory || '').trim().toLowerCase();
  const status = (row.CompanyStatus || '').trim().toLowerCase();
  const incorporationDate = parseUkDate(row.IncorporationDate);

  if (!companyNumber) return false;
  if (category !== 'private limited company') return false;
  if (status !== 'active') return false;
  if (!incorporationDate) return false;

  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  return incorporationDate >= fiveYearsAgo;
}

async function insertBatch(batch: CsvRow[]) {
  if (batch.length === 0) return;

  const values: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  for (const row of batch) {
    values.push(
      `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, NOW(), NOW())`
    );

    params.push(
      (row.CompanyNumber || '').trim(),
      (row.CompanyName || '').trim(),
      (row.CompanyStatus || '').trim() || null,
      'ltd',
      toIsoDate(row.IncorporationDate),
      'United Kingdom',
      (row['RegAddress.PostCode'] || '').trim() || null,
      (row['RegAddress.PostTown'] || '').trim() || null,
      JSON.stringify(extractSicCodes(row))
    );
  }

  await pool.query(
    `
    INSERT INTO companies (
      company_number,
      company_name,
      company_status,
      company_type,
      date_of_creation,
      jurisdiction,
      registered_postcode,
      registered_locality,
      sic_codes,
      created_at,
      updated_at
    )
    VALUES ${values.join(', ')}
    ON CONFLICT (company_number) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      company_status = EXCLUDED.company_status,
      company_type = EXCLUDED.company_type,
      date_of_creation = EXCLUDED.date_of_creation,
      jurisdiction = EXCLUDED.jurisdiction,
      registered_postcode = EXCLUDED.registered_postcode,
      registered_locality = EXCLUDED.registered_locality,
      sic_codes = EXCLUDED.sic_codes,
      updated_at = NOW()
    `,
    params
  );
}

async function run() {
  console.log('Starting bulk import...');

  const stream = fs.createReadStream(FILE_PATH).pipe(
    csv({
      mapHeaders: ({ header }) => header.trim(),
    })
  );

  let batch: CsvRow[] = [];
  let processed = 0;
  let eligible = 0;
  let inserted = 0;
  let samplePrinted = false;

  for await (const rawRow of stream) {
    const row = rawRow as CsvRow;
    processed++;

    if (!samplePrinted) {
      console.log('Sample row keys:', Object.keys(row));
      console.log('Sample CompanyCategory:', row.CompanyCategory);
      console.log('Sample CompanyStatus:', row.CompanyStatus);
      console.log('Sample IncorporationDate:', row.IncorporationDate);
      samplePrinted = true;
    }

    if (!isEligible(row)) continue;

    eligible++;
    batch.push(row);

    if (batch.length >= BATCH_SIZE) {
      await insertBatch(batch);
      inserted += batch.length;
      batch = [];

      if (inserted % 10000 === 0) {
        console.log(`Processed ${processed} | Eligible ${eligible} | Inserted ${inserted}`);
      }
    }
  }

  if (batch.length > 0) {
    await insertBatch(batch);
    inserted += batch.length;
  }

  console.log(`Finished. Processed ${processed}, eligible ${eligible}, inserted ${inserted}`);

  await pool.end();
}

run().catch(async (err) => {
  console.error('Import failed');
  console.error(err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});

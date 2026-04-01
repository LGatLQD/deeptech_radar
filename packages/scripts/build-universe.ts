import '../config/env';
import axios from 'axios';
import { pool } from '../db';

const BASE_URL = 'https://api.company-information.service.gov.uk';

const apiKey = (process.env.COMPANIES_HOUSE_API_KEY || '').trim();

if (!apiKey) {
  throw new Error('COMPANIES_HOUSE_API_KEY is not set');
}

const auth = {
  username: apiKey,
  password: '',
};

type CHSearchCompany = {
  company_name?: string;
  company_number?: string;
  company_status?: string;
  company_type?: string;
  date_of_creation?: string;
  jurisdiction?: string;
  sic_codes?: string[];
  registered_office_address?: {
    postal_code?: string;
    locality?: string;
    region?: string;
  };
};

type CHSearchResponse = {
  items?: CHSearchCompany[];
  total_results?: number;
  start_index?: number;
  items_per_page?: number;
};

function isEligibleCompany(c: CHSearchCompany): boolean {
  if (!c.company_number || !c.company_name) return false;
  if ((c.company_status || '').toLowerCase() !== 'active') return false;
  if ((c.company_type || '').toLowerCase() !== 'ltd') return false;
  if (!c.date_of_creation) return false;

  const created = new Date(c.date_of_creation);
  if (Number.isNaN(created.getTime())) return false;

  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  return created >= fiveYearsAgo;
}

async function fetchCompaniesByDateRange(
  fromDate: string,
  toDate: string,
  startIndex = 0,
  size = 100,
): Promise<CHSearchResponse> {
  const response = await axios.get<CHSearchResponse>(
    `${BASE_URL}/advanced-search/companies`,
    {
      auth,
      params: {
        incorporated_from: fromDate,
        incorporated_to: toDate,
        company_status: 'active',
        company_type: 'ltd',
        size,
        start_index: startIndex,
      },
    },
  );

  return response.data;
}

async function upsertCompany(c: CHSearchCompany): Promise<void> {
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
      registered_region,
      sic_codes,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
    ON CONFLICT (company_number)
    DO UPDATE SET
      company_name = EXCLUDED.company_name,
      company_status = EXCLUDED.company_status,
      company_type = EXCLUDED.company_type,
      date_of_creation = EXCLUDED.date_of_creation,
      jurisdiction = EXCLUDED.jurisdiction,
      registered_postcode = EXCLUDED.registered_postcode,
      registered_locality = EXCLUDED.registered_locality,
      registered_region = EXCLUDED.registered_region,
      sic_codes = EXCLUDED.sic_codes,
      updated_at = NOW()
    `,
    [
      c.company_number,
      c.company_name,
      c.company_status ?? null,
      c.company_type ?? null,
      c.date_of_creation ?? null,
      c.jurisdiction ?? null,
      c.registered_office_address?.postal_code ?? null,
      c.registered_office_address?.locality ?? null,
      c.registered_office_address?.region ?? null,
      JSON.stringify(c.sic_codes || []),
    ],
  );
}

async function run(): Promise<void> {
  const fromDate = process.argv[2];
  const toDate = process.argv[3];
  const pageSize = 100;

  if (!fromDate || !toDate) {
    throw new Error(
      'Usage: npx tsx packages/scripts/build-universe.ts YYYY-MM-DD YYYY-MM-DD',
    );
  }

  console.log(`Building universe from ${fromDate} to ${toDate}...`);

  let startIndex = 0;
  let fetched = 0;
  let eligible = 0;
  let inserted = 0;

  while (true) {
    const data = await fetchCompaniesByDateRange(
      fromDate,
      toDate,
      startIndex,
      pageSize,
    );

    const items = data.items || [];

    if (items.length === 0) break;

    fetched += items.length;

    for (const company of items) {
      if (!isEligibleCompany(company)) continue;

      eligible += 1;
      await upsertCompany(company);
      inserted += 1;
    }

    console.log(
      `Fetched: ${fetched} | Eligible: ${eligible} | Upserted: ${inserted}`,
    );

    startIndex += items.length;

    if (items.length < pageSize) break;

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log('Universe build complete');
  console.log({ fetched, eligible, inserted });

  await pool.end();
}

run().catch(async (err) => {
  console.error('Universe build failed');
  console.error(err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
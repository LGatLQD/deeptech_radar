import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { wokeloFetch } from "@/lib/wokelo";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function cleanCompanyName(name: string): string {
  return name
    .replace(/\bLIMITED\b/gi, "")
    .replace(/\bLTD\b/gi, "")
    .replace(/\bPLC\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(limited|ltd|plc|inc|llc|gmbh|sa|ag)\b/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameLooksReliable(inputName: string, candidateName: string): boolean {
  const input = normaliseName(inputName);
  const candidate = normaliseName(candidateName);

  if (!input || !candidate) return false;
  if (input === candidate) return true;

  const inputWords = input.split(" ").filter((w) => w.length > 1);
  const candidateWords = new Set(
    candidate.split(" ").filter((w) => w.length > 1)
  );

  const overlap = inputWords.filter((w) => candidateWords.has(w)).length;
  const overlapRatio = overlap / inputWords.length;

  return overlapRatio >= 0.75;
}

function isUkCompany(candidate: any): boolean {
  const countryCode = String(candidate?.country_code || "").toUpperCase();
  const country = String(candidate?.country || "").toLowerCase();
  const hq = String(candidate?.hq || "").toLowerCase();

  return (
    countryCode === "GB" ||
    countryCode === "UK" ||
    country.includes("united kingdom") ||
    hq.includes("united kingdom") ||
    hq.includes("england") ||
    hq.includes("scotland") ||
    hq.includes("wales")
  );
}

function enrichedLooksUk(result: any): boolean {
  const location = String(result?.data?.firmographics?.location || "").toLowerCase();

  return (
    location.includes("united kingdom") ||
    location.includes("england") ||
    location.includes("scotland") ||
    location.includes("wales")
  );
}

export async function POST(req: NextRequest) {
  try {
    const { company, company_number } = await req.json();

    if (!company || !company_number) {
      return NextResponse.json(
        { success: false, error: "company and company_number are required" },
        { status: 400 }
      );
    }

    const existing = await pool.query(
      `
      SELECT
        company_number,
        company_name,
        matched_company,
        snapshot_json,
        updated_at
      FROM wokelo_snapshots
      WHERE company_number = $1
      `,
      [company_number]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];

      return NextResponse.json({
        success: true,
        source: "database",
        inputCompany: row.company_name,
        matchedCompany: row.matched_company,
        result: row.snapshot_json,
        updatedAt: row.updated_at,
      });
    }

    const searchQuery = cleanCompanyName(company);

    const search = await wokeloFetch(
      `/api/enterprise/company/search?query=${encodeURIComponent(
        searchQuery
      )}&search_by=name&company_type=all`
    );

    const candidates = Array.isArray(search?.data) ? search.data : [];

    console.log(
      candidates.map((c: any) => ({
        name: c.name,
        reliable: nameLooksReliable(company, c.name),
        uk: isUkCompany(c),
      }))
    );

    const match = candidates.find(
      (candidate: any) =>
        isUkCompany(candidate) &&
        nameLooksReliable(company, candidate?.name || "")
    );

    if (!match?.permalink) {
      return NextResponse.json(
        {
          success: false,
          error: `No reliable UK Wokelo company match found for ${company}`,
          searchQuery,
          candidates: candidates.slice(0, 10),
        },
        { status: 404 }
      );
    }

    const result = await wokeloFetch(
      "/api/enterprise/company/enrich/single/",
      {
        method: "POST",
        body: JSON.stringify({
          company: match.permalink,
          sections: [
            "firmographics",
            "funding",
            "headcount",
            "gtm_and_business_model",
            "uk_private_company_financials",
            "acquisitions",
            "website_traffic",
          ],
        }),
      }
    );

    if (!enrichedLooksUk(result)) {
      return NextResponse.json(
        {
          success: false,
          error: `Wokelo returned a non-UK company for ${company}`,
          searchQuery,
          matchedCompany: match,
          result,
        },
        { status: 404 }
      );
    }

    await pool.query(
      `
      INSERT INTO wokelo_snapshots (
        company_number,
        company_name,
        matched_company,
        snapshot_json,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (company_number)
      DO UPDATE SET
        company_name = EXCLUDED.company_name,
        matched_company = EXCLUDED.matched_company,
        snapshot_json = EXCLUDED.snapshot_json,
        updated_at = NOW()
      `,
      [company_number, company, JSON.stringify(match), JSON.stringify(result)]
    );

    return NextResponse.json({
      success: true,
      source: "wokelo",
      inputCompany: company,
      searchQuery,
      matchedCompany: match,
      result,
      saved: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
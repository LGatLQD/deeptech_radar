import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});


export async function GET(req: NextRequest) {
  try {
    const companyNumber = req.nextUrl.searchParams.get("company_number");

    if (!companyNumber) {
      return NextResponse.json(
        { success: false, error: "company_number is required" },
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
      [companyNumber]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({
        success: true,
        found: false,
      });
    }

    const row = existing.rows[0];

    return NextResponse.json({
      success: true,
      found: true,
      companyNumber: row.company_number,
      companyName: row.company_name,
      matchedCompany: row.matched_company,
      result: row.snapshot_json,
      updatedAt: row.updated_at,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
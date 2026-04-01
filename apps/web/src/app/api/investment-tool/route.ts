import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  const res = await pool.query(`
    SELECT *
    FROM investment_tool_view
    LIMIT 10000
  `);

  return NextResponse.json({ rows: res.rows });
}
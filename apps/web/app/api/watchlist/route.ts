import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  const res = await pool.query('SELECT company_number, reason, added_at FROM watchlist');
  return NextResponse.json({ rows: res.rows });
}

export async function POST(req: NextRequest) {
  const { company_number, reason } = await req.json();
  await pool.query(
    'INSERT INTO watchlist (company_number, reason) VALUES ($1, $2) ON CONFLICT (company_number) DO UPDATE SET reason = $2, added_at = NOW()',
    [company_number, reason]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { company_number } = await req.json();
  await pool.query('DELETE FROM watchlist WHERE company_number = $1', [company_number]);
  return NextResponse.json({ ok: true });
}

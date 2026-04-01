import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});
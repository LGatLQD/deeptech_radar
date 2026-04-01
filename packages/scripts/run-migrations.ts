import fs from 'fs';
import path from 'path';
import { pool } from '../db';

async function run() {
  const migrationsDir = path.resolve(__dirname, '../../infra/migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;

    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');

    console.log(`Running migration: ${file}`);
    await pool.query(sql);
    console.log(`Completed: ${file}`);
  }

  await pool.end();
  console.log('All migrations complete');
}

run().catch(async (err) => {
  console.error('Migration failed');
  console.error(err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
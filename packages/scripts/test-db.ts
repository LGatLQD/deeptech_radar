import { pool } from '../db';

async function run() {
  console.log('Starting DB test...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);

  const result = await pool.query('SELECT NOW() AS now');
  console.log('DB response:', result.rows[0]);

  await pool.end();
  console.log('Done');
}

run().catch(async (err) => {
  console.error('DB test failed:');
  console.error(err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});

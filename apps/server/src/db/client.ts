import 'dotenv/config';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to start the server.');
}

export const pool = new Pool({ connectionString: databaseUrl });

export async function connectDatabase(): Promise<void> {
  await pool.query('SELECT 1');
}

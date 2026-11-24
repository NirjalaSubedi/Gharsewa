import 'dotenv/config';
import { pool } from '../config/db.js';

async function migrate(): Promise<void> {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS citizenship_phot TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name_en VARCHAR(100) NOT NULL UNIQUE,
      name_np VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      taker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
      task_description TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      scheduled_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      message_text TEXT NOT NULL,
      quote_amount NUMERIC(12,2),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.end();
  console.log('Database migration completed.');
}

migrate().catch(async (error) => {
  console.error('Database migration failed:', error);
  await pool.end();
  process.exitCode = 1;
});

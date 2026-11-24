import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

async function seed(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@gharsewa.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD is required.');

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(`
    INSERT INTO users (
      name,email,password,role,is_email_verified,verification_status,location,created_at
    )
    VALUES ('GharSewa Admin',$1,$2,'admin',TRUE,'not_required','Nepal',NOW())
    ON CONFLICT (email) DO UPDATE SET
      password=EXCLUDED.password,
      role='admin',
      is_email_verified=TRUE,
      verification_status='not_required',
      last_login_at=COALESCE(users.last_login_at, NOW())
  `, [email, passwordHash]);
  await pool.end();
  console.log('Database seed completed.');
}

seed().catch(async (error) => {
  console.error('Database seed failed:', error);
  await pool.end();
  process.exitCode = 1;
});

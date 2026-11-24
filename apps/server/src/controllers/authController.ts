import crypto from 'node:crypto';
import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { sendNotification } from '../services/emailService.js';
import type { AuthenticatedRequest } from '../types/index.js';

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase().max(255),
  password: z.string().min(8).max(72),
  location: z.string().trim().min(2).max(255).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  role: z.enum(['taker', 'provider']).default('taker'),
  citizenshipPhoto: z.string().trim().min(1).max(500).optional()
}).superRefine((value, ctx) => {
  if (value.role === 'provider' && !value.citizenshipPhoto) {
    ctx.addIssue({ code: 'custom', path: ['citizenshipPhoto'], message: 'Citizenship photo is required for providers' });
  }
});

const verifySchema = z.object({
  email: z.string().trim().email().toLowerCase().max(255),
  otp: z.string().trim().regex(/^\d{6}$/)
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1).max(72)
}).transform((value) => ({ ...value, email: value.email.toLowerCase() }));

function createToken(user: { id: number; email: string; role: 'taker' | 'provider' | 'admin' }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required.');
  return jwt.sign(user, secret, { expiresIn: '7d' });
}

export async function register(req: import('express').Request, res: Response): Promise<void> {
  const body = registerSchema.parse(req.body);
  const existing = await pool.query('SELECT id FROM users WHERE email=$1', [body.email]);
  if (existing.rowCount) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const otp = crypto.randomInt(100000, 1000000).toString();
  await pool.query(`
    INSERT INTO users (
      name, email, password, role, latitude, longitude,
      is_email_verified, otp_code, otp_expires_at,
      location, citizenship_phot, verification_status, created_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,FALSE,$7,NOW()+INTERVAL '10 minutes',$8,$9,$10,NOW())
  `, [
    body.name, body.email, passwordHash, body.role,
    body.latitude ?? null, body.longitude ?? null, otp,
    body.location ?? null,
    body.role === 'provider' ? body.citizenshipPhoto : null,
    body.role === 'provider' ? 'pending' : 'not_required'
  ]);

  await sendNotification({
    subject: 'Verify your GharSewa email',
    text: `Your GharSewa verification code is ${otp}. It expires in 10 minutes.`,
    to: body.email
  });
  res.status(201).json({ message: 'Verification code sent to your email', email: body.email });
}

export async function verifyEmail(req: import('express').Request, res: Response): Promise<void> {
  const body = verifySchema.parse(req.body);
  const result = await pool.query(`
    SELECT id, email, role, otp_code, otp_expires_at, is_email_verified
    FROM users WHERE email=$1
  `, [body.email]);
  if (!result.rowCount) {
    res.status(400).json({ error: 'User or verification code not found' });
    return;
  }
  const user = result.rows[0];
  if (user.is_email_verified) {
    res.status(400).json({ error: 'Email is already verified' });
    return;
  }
  if (!user.otp_code || !user.otp_expires_at || new Date(user.otp_expires_at).getTime() < Date.now()) {
    res.status(400).json({ error: 'Verification code expired' });
    return;
  }
  if (user.otp_code !== body.otp) {
    res.status(400).json({ error: 'Invalid verification code' });
    return;
  }

  await pool.query(
    'UPDATE users SET is_email_verified=TRUE, otp_code=NULL, otp_expires_at=NULL WHERE id=$1',
    [user.id]
  );

  await sendNotification({
    subject: user.role === 'provider' ? 'Provider registration received' : 'Welcome to GharSewa',
    text: user.role === 'provider'
      ? 'Your email is verified. An admin must verify your citizenship photo before you can log in.'
      : 'Your email has been verified and your account is ready.',
    to: body.email
  });

  res.json({
    message: user.role === 'provider'
      ? 'Email verified. Provider account awaits admin verification.'
      : 'Email verified successfully.',
    token: user.role === 'provider' ? null : createToken({ id: user.id, email: user.email, role: user.role })
  });
}

export const verifyOtp = verifyEmail;

export async function login(req: import('express').Request, res: Response): Promise<void> {
  const body = loginSchema.parse(req.body);
  const result = await pool.query(`
    SELECT id,name,email,password,role,is_email_verified,verification_status
    FROM users WHERE email=$1
  `, [body.email]);
  if (!result.rowCount) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const user = result.rows[0];
  if (!await bcrypt.compare(body.password, user.password)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  if (!user.is_email_verified) {
    res.status(403).json({ error: 'Email verification required' });
    return;
  }
  if (user.role === 'provider' && user.verification_status !== 'verified') {
    res.status(403).json({ error: 'Provider account is awaiting admin verification' });
    return;
  }
  await pool.query('UPDATE users SET last_login_at=NOW() WHERE id=$1', [user.id]);
  res.json({
    token: createToken({ id: user.id, email: user.email, role: user.role }),
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await pool.query(`
    SELECT id,name,email,location,latitude,longitude,role,is_email_verified,
           citizenship_phot,verification_status,verified_by,verified_at,rejection_reason,
           created_at,last_login_at
    FROM users WHERE id=$1
  `, [req.user!.id]);
  res.json(result.rows[0] ?? null);
}

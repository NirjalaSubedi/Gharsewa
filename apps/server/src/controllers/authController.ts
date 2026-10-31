import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { sendNotification } from '../services/emailService.js';
import type { UserRole } from '../types/index.js';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required to start the server.');
  }
  return secret;
}
const jwtSecret = getJwtSecret();

const credentials = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});

const registerSchema = credentials.extend({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20),
  role: z.enum(['taker', 'provider']).default('taker')
});

function parseBody<T extends z.ZodType>(schema: T, input: unknown, res: Response): z.infer<T> | undefined {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid request',
      details: parsed.error.flatten()
    });
    return undefined;
  }
  return parsed.data;
}

function isEmailConflict(error: unknown): boolean {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505' &&
    'constraint' in error &&
    error.constraint === 'users_email_key';
}

function createToken(id: number, email: string, role: UserRole): string {
  return jwt.sign({ id, email, role }, jwtSecret, { expiresIn: '7d' });
}

export async function register(req: Request, res: Response): Promise<void> {
  const body = parseBody(registerSchema, req.body, res);
  if (!body) return;

  const passwordHash = await bcrypt.hash(body.password, 12);
  let result;
  try {
    result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, phone`,
      [body.name, body.email, passwordHash, body.role, body.phone]
    );
  } catch (error) {
    if (isEmailConflict(error)) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }
    throw error;
  }

  const user = result.rows[0] as { id: number; email: string; role: UserRole };
  await sendNotification({
    subject: `New GharSewa registration: ${user.email}`,
    text: `A new ${user.role} account was registered.\nName: ${body.name}\nEmail: ${user.email}\nPhone: ${body.phone}`
  });
  res.status(201).json({
    user: result.rows[0],
    token: createToken(user.id, user.email, user.role)
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = parseBody(credentials, req.body, res);
  if (!body) return;

  const result = await pool.query(
    'SELECT id, name, email, password_hash, role, phone FROM users WHERE email = $1',
    [body.email]
  );
  const user = result.rows[0] as
    | { id: number; name: string; email: string; password_hash: string; role: UserRole; phone: string }
    | undefined;

  if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const { password_hash: _passwordHash, ...safeUser } = user;
  await sendNotification({
    subject: `GharSewa login: ${user.email}`,
    text: `A ${user.role} account logged in.\nEmail: ${user.email}`
  });
  res.json({
    user: safeUser,
    token: createToken(user.id, user.email, user.role)
  });
}

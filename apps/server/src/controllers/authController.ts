import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { sendNotification } from '../services/emailService.js';
import type { AuthenticatedRequest, UserRole } from '../types/index.js';

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

const accountUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().email().transform((value) => value.toLowerCase()).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
  password: z.string().min(8).max(128).optional()
}).refine((body) => Object.keys(body).length > 0, {
  message: 'At least one account field is required'
});

const accountIdSchema = z.coerce.number().int().positive();

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
    text: `Your GharSewa account was registered successfully.\nName: ${body.name}\nEmail: ${user.email}\nRole: ${user.role}`,
    to: user.email
  });
  res.status(201).json({
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
    text: `You logged in to your GharSewa account successfully.\nEmail: ${user.email}`,
    to: user.email
  });
  res.json({
    user: safeUser,
    token: createToken(user.id, user.email, user.role)
  });
}

export async function listUsers(_req: Request, res: Response): Promise<void> {
  const result = await pool.query(
    'SELECT id, name, email, role, phone FROM users ORDER BY id'
  );
  res.json({ users: result.rows });
}

export async function getAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  const accountId = req.params.id ? accountIdSchema.parse(req.params.id) : req.user!.id;

  if (req.user!.role !== 'admin' && req.user!.id !== accountId) {
    res.status(403).json({ error: 'You can only view your own account' });
    return;
  }

  const result = await pool.query(
    'SELECT id, name, email, role, phone FROM users WHERE id = $1',
    [accountId]
  );
  if (!result.rowCount) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: result.rows[0] });
}

export async function updateAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  const accountId = req.params.id ? accountIdSchema.parse(req.params.id) : req.user!.id;
  if (req.user!.id !== accountId) {
    res.status(403).json({ error: 'You can only update your own account' });
    return;
  }

  const body = parseBody(accountUpdateSchema, req.body, res);
  if (!body) return;

  const values: unknown[] = [];
  const assignments: string[] = [];
  if (body.name !== undefined) {
    values.push(body.name);
    assignments.push(`name = $${values.length}`);
  }
  if (body.email !== undefined) {
    values.push(body.email);
    assignments.push(`email = $${values.length}`);
  }
  if (body.phone !== undefined) {
    values.push(body.phone);
    assignments.push(`phone = $${values.length}`);
  }
  if (body.password !== undefined) {
    values.push(await bcrypt.hash(body.password, 12));
    assignments.push(`password_hash = $${values.length}`);
  }

  values.push(accountId);
  let result;
  try {
    result = await pool.query(
      `UPDATE users
       SET ${assignments.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, name, email, role, phone`,
      values
    );
  } catch (error) {
    if (isEmailConflict(error)) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }
    throw error;
  }

  if (!result.rowCount) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: result.rows[0] });
}

export async function deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  const accountId = req.params.id ? accountIdSchema.parse(req.params.id) : req.user!.id;
  if (req.user!.id !== accountId) {
    res.status(403).json({ error: 'You can only delete your own account' });
    return;
  }

  const result = await pool.query(
    'DELETE FROM users WHERE id = $1 RETURNING id, name, email, role, phone',
    [accountId]
  );
  if (!result.rowCount) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ message: 'Account deleted successfully', user: result.rows[0] });
}

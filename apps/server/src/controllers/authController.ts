import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../config/db.js';
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

function createToken(id: number, email: string, role: UserRole): string {
  return jwt.sign({ id, email, role }, jwtSecret, { expiresIn: '7d' });
}

export async function register(req: Request, res: Response): Promise<void> {
  const body = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(body.password, 12);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, phone`,
    [body.name, body.email, passwordHash, body.role, body.phone]
  );
  const user = result.rows[0] as { id: number; email: string; role: UserRole };
  res.status(201).json({
    user: result.rows[0],
    token: createToken(user.id, user.email, user.role)
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = credentials.parse(req.body);
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
  res.json({
    user: safeUser,
    token: createToken(user.id, user.email, user.role)
  });
}

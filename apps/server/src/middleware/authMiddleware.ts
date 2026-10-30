import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthenticatedRequest, AuthenticatedUser, UserRole } from '../types/index.js';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required to start the server.');
  }
  return secret;
}
const jwtSecret = getJwtSecret();

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;

  if (!token) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof payload.id !== 'number' ||
      typeof payload.email !== 'string' ||
      !['taker', 'provider', 'admin'].includes(payload.role as string)
    ) {
      res.status(401).json({ error: 'Invalid authentication token' });
      return;
    }
    req.user = payload as AuthenticatedUser;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export function requireRole(...roles: UserRole[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

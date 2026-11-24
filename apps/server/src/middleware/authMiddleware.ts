import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthenticatedRequest, AuthUserPayload, UserRole } from '../controllers/authController.js';

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'JWT_SECRET is not configured' });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

  if (!token) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof decoded.id !== 'number' ||
      typeof decoded.email !== 'string' ||
      !['taker', 'provider', 'admin'].includes(String(decoded.role))
    ) {
      res.status(401).json({ error: 'Invalid authentication token' });
      return;
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role as UserRole
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
import type { Request } from 'express';

export type UserRole = 'taker' | 'provider' | 'admin';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

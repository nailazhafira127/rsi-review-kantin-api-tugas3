import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import { verifyToken, type AuthUser, type Role } from '../auth/jwt.ts';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header) return next(new AppError(401, 'Token autentikasi tidak ditemukan'));

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return next(new AppError(401, 'Format Authorization harus: Bearer <token>'));
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(new AppError(401, 'Token tidak valid atau sudah kedaluwarsa'));
  }
};

export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new AppError(401, 'Belum login'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Anda tidak memiliki akses ke endpoint ini'));
    }
    next();
  };

  // Dipakai controller lama: getAuthenticatedUser(req) atau getAuthenticatedUser(res)
export function getAuthenticatedUser(target: Request | Response): AuthUser {
  const req = 'locals' in target ? (target as Response).req : (target as Request);
  if (!req.user) throw new AppError(401, 'Belum login');
  return req.user;
}
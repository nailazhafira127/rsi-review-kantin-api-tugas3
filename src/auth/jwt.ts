import 'dotenv/config';
import jwt from 'jsonwebtoken';

export type Role = 'admin' | 'owner' | 'customer';
export interface AuthUser {
  id: number;
  role: Role;
}

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32 || secret.startsWith('replace-with')) {
  throw new Error('JWT_SECRET belum diatur di .env (minimal 32 karakter, bukan placeholder).');
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, secret!, {
    algorithm: 'HS256',
    subject: String(user.id),
    expiresIn: '1h',
  });
}

export function verifyToken(token: string): AuthUser {
  const payload = jwt.verify(token, secret!, { algorithms: ['HS256'] });
  if (
    typeof payload === 'string' ||
    !payload.sub ||
    !['admin', 'owner', 'customer'].includes(payload.role)
  ) {
    throw new Error('Payload token tidak valid');
  }
  return { id: Number(payload.sub), role: payload.role as Role };
}
import bcrypt from 'bcryptjs';
import { AppError } from '../errors/AppError.ts';
import { signToken } from '../auth/jwt.ts';
import { UserRepository } from '../repositories/userRepository.ts';
import { isUniqueViolation } from '../utils/dbError.ts';

const repo = new UserRepository();

const toProfile = (u: { id: number; name: string; email: string; role: string }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});

export class AuthService {
  async register(input: { name: string; email: string; password: string }) {
    if (await repo.findByEmail(input.email)) throw new AppError(409, 'Email sudah terdaftar');

    const passwordHash = await bcrypt.hash(input.password, 10);
    try {
      const user = await repo.create({ name: input.name, email: input.email, passwordHash });
      return toProfile(user);
    } catch (err) {
      if (isUniqueViolation(err)) throw new AppError(409, 'Email sudah terdaftar');
      throw err;
    }
  }

  async login(input: { email: string; password: string }) {
    const user = await repo.findByEmail(input.email);
    const ok = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
    if (!user || !ok) throw new AppError(401, 'Email atau password salah');

    const token = signToken({ id: user.id, role: user.role });
    return { token, user: toProfile(user) };
  }

  async me(userId: number) {
    const user = await repo.findById(userId);
    if (!user) throw new AppError(401, 'User tidak ditemukan');
    return toProfile(user);
  }
}
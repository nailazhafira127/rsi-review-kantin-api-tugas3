import { z } from 'zod';

export const createUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email().max(150),
    password: z.string().min(8).max(128),
    role: z.enum(['admin', 'owner', 'customer']),
  })
  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const registerSchema = z
  .object({
    name: z.string().trim().min(3, 'name minimal 3 karakter').max(100, 'name maksimal 100 karakter'),
    email: z.string().trim().toLowerCase().email('email harus berupa email yang valid').max(150),
    password: z.string().min(8, 'password minimal 8 karakter').max(128),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('email harus berupa email yang valid'),
    password: z.string().min(1, 'password wajib diisi'),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
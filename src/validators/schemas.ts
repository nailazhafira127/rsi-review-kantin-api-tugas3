import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const str = (field: string) =>
  z.string({
    error: (iss) => (iss.input === undefined ? `${field} wajib diisi` : `${field} harus berupa teks`),
  });

const num = (field: string) =>
  z.number({
    error: (iss) => (iss.input === undefined ? `${field} wajib diisi` : `${field} harus berupa angka`),
  });

// ---------- params ----------
export const idParamSchema = z.object({
  id: z.coerce
    .number({ error: 'id harus berupa angka' })
    .int('id harus bilangan bulat')
    .positive('id harus lebih dari 0'),
});

// ---------- stalls ----------
export const listStallsQuerySchema = z.object({
  search: str('search').trim().max(100, 'search maksimal 100 karakter').optional(),
  category: str('category').trim().max(50, 'category maksimal 50 karakter').optional(),
  page: z.coerce
    .number({ error: 'page harus berupa angka' })
    .int('page harus bilangan bulat')
    .min(1, 'page minimal 1')
    .default(1),
  limit: z.coerce
    .number({ error: 'limit harus berupa angka' })
    .int('limit harus bilangan bulat')
    .min(1, 'limit minimal 1')
    .max(100, 'limit maksimal 100')
    .default(10),
});

export const createStallBodySchema = z.object({
  name: str('name').trim().min(3, 'name minimal 3 karakter').max(100, 'name maksimal 100 karakter'),
  category: str('category').trim().max(50, 'category maksimal 50 karakter').optional(),
  location: str('location').trim().max(100, 'location maksimal 100 karakter').optional(),
  description: str('description').trim().max(1000, 'description maksimal 1000 karakter').optional(),
});

export const updateStallBodySchema = createStallBodySchema.partial();

// ---------- reviews ----------
export const createReviewBodySchema = z.object({
  rating: num('rating')
    .int('rating harus bilangan bulat')
    .min(1, 'rating minimal 1')
    .max(5, 'rating maksimal 5'),
  comment: str('comment').trim().max(1000, 'comment maksimal 1000 karakter').optional(),
});

// ---------- auth ----------
export const registerBodySchema = z.object({
  name: str('name').trim().min(3, 'name minimal 3 karakter').max(100, 'name maksimal 100 karakter'),
  email: str('email')
    .trim()
    .toLowerCase()
    .max(150, 'email maksimal 150 karakter')
    .email('email format tidak valid'),
  password: str('password')
    .min(8, 'password minimal 8 karakter')
    .max(72, 'password maksimal 72 karakter'),
});

export const loginBodySchema = z.object({
  email: str('email').trim().toLowerCase().email('email format tidak valid'),
  password: str('password').min(1, 'password wajib diisi'),
});
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Menambahkan method `.openapi()` ke semua type zod.
// Wajib dipanggil SEBELUM schema memakai `.openapi({ ... })`.
extendZodWithOpenApi(z);

// ------------------------------------------------------------------ params
// id pada /:id selalu coerce dari string query/path menjadi angka.
export const idParamSchema = z.object({
  id: z.coerce
    .number({ error: 'id harus berupa angka' })
    .int('id harus bilangan bulat')
    .positive('id harus lebih dari 0')
    .openapi({ example: 3, description: 'ID kantin' }),
});

// ------------------------------------------------------------------- query
// Search & category opsional; page/limit punya default (zod.default = bila absent).
export const stallQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .openapi({ description: 'Cari berdasarkan nama kantin' }),
  category: z
    .string()
    .trim()
    .max(50)
    .optional()
    .openapi({ description: 'Filter kategori kantin', example: 'Minuman' }),
  page: z.coerce
    .number({ error: 'page harus berupa angka' })
    .int('page harus bilangan bulat')
    .min(1, 'page minimal 1')
    .default(1)
    .openapi({ description: 'Nomor halaman (default 1)', example: 1 }),
  limit: z.coerce
    .number({ error: 'limit harus berupa angka' })
    .int('limit harus bilangan bulat')
    .min(1, 'limit minimal 1')
    .max(100, 'limit maksimal 100')
    .default(10)
    .openapi({ description: 'Jumlah data per halaman (maks 100)', example: 10 }),
});

// -------------------------------------------------------------------- body
export const createStallSchema = z
  .object({
    name: z
      .string({ error: 'name wajib diisi' })
      .trim()
      .min(3, 'name minimal 3 karakter')
      .max(100, 'name maksimal 100 karakter')
      .openapi({ example: 'Kantin Baru', description: 'Nama kantin' }),
    category: z.string().trim().max(50).optional().openapi({
      example: 'Nasi',
      description: 'Kategori kantin (mis. Nasi, Bakso, Minuman)',
    }),
    location: z.string().trim().max(100).optional().openapi({ example: 'Kantin FK', description: 'Lokasi kantin' }),
    description: z.string().trim().max(1000).optional().openapi({
      example: 'Nasi goreng dadakan',
      description: 'Deskripsi kantin',
    }),
  })
  // .strict() menolak (atau membuang) kunci yang tidak dikenal.
  .strict();

// Semua kolom opsional untuk PUT (update sebagian).
export const updateStallSchema = createStallSchema.partial();

// ------------------------------------------------------------------ types
export type IdParam = z.infer<typeof idParamSchema>;
export type StallQuery = z.infer<typeof stallQuerySchema>;
export type CreateStallInput = z.infer<typeof createStallSchema>;
export type UpdateStallInput = z.infer<typeof updateStallSchema>;
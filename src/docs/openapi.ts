import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  createReviewBodySchema,
  createStallBodySchema,
  idParamSchema,
  listStallsQuerySchema,
  loginBodySchema,
  registerBodySchema,
  updateStallBodySchema,
} from '../validators/schemas.ts';
import { createUserSchema } from '../schemas/userSchema.ts';
import {
  createAuditLogSchema,
  createLikeSchema,
  createMenuItemSchema,
  flagStatusSchema,
  updateMenuItemSchema,
} from '../schemas/resourceSchema.ts';

const registry = new OpenAPIRegistry();

// ------------------------------------------------------------ keamanan
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});
const bearer = [{ bearerAuth: [] }];

// ------------------------------------------------------------ schema respons
const stallSchema = registry.register(
  'Stall',
  z.object({
    id: z.number().openapi({ example: 1 }),
    ownerId: z.number().openapi({ example: 2 }),
    name: z.string().openapi({ example: 'Kantin Bu Tini' }),
    category: z.string().nullable().openapi({ example: 'Kwetiau' }),
    location: z.string().nullable().openapi({ example: 'Kantin FKIP' }),
    description: z.string().nullable().openapi({ example: 'Kedai kwetiau goreng & kuah' }),
    avgRating: z.number().openapi({ example: 4.5 }),
    reviewCount: z.number().openapi({ example: 2 }),
    isPopular: z.boolean().openapi({ example: false }),
  }),
);

const menuSchema = registry.register(
  'Menu',
  z.object({
    id: z.number().openapi({ example: 1 }),
    stallId: z.number().openapi({ example: 2 }),
    name: z.string().openapi({ example: 'Kwetiau Goreng Spesial' }),
    price: z.number().openapi({ example: 15000 }),
    isAvailable: z.boolean().openapi({ example: true }),
  }),
);

const userProfileSchema = registry.register(
  'UserProfile',
  z.object({
    id: z.number().openapi({ example: 1 }),
    name: z.string().openapi({ example: 'Nama Pengguna' }),
    email: z.string().openapi({ example: 'user@example.com' }),
    role: z.enum(['admin', 'owner', 'customer']).openapi({ example: 'customer' }),
  }),
);

const errorSchema = registry.register(
  'ErrorResponse',
  z.object({
    status: z.string().openapi({ example: 'fail' }),
    message: z.string().openapi({ example: 'Validasi gagal' }),
    errors: z
      .array(z.object({ field: z.string(), message: z.string() }))
      .optional()
      .openapi({ example: [{ field: 'name', message: 'name minimal 3 karakter' }] }),
  }),
);

// ------------------------------------------------------------ schema body
// Schema yang sama dipakai untuk validasi di handler dan dokumentasi di sini.
const registerInput = registry.register('RegisterInput', registerBodySchema);
const loginInput = registry.register('LoginInput', loginBodySchema);
const stallInput = registry.register('StallInput', createStallBodySchema);
const stallUpdate = registry.register('StallUpdate', updateStallBodySchema);
const stallReviewInput = registry.register('StallReviewInput', createReviewBodySchema);

const userInput = registry.register('UserInput', createUserSchema);
const menuItemInput = registry.register('MenuItemInput', createMenuItemSchema);
const menuItemUpdate = registry.register('MenuItemUpdate', updateMenuItemSchema);
const likeInput = registry.register('LikeInput', createLikeSchema);
const flagStatusInput = registry.register('FlagStatusInput', flagStatusSchema);
const auditLogInput = registry.register('AuditLogInput', createAuditLogSchema);

// ------------------------------------------------------------ schema envelope
const dataListResponse = z.object({ status: z.literal('success'), data: z.array(z.unknown()) });
const dataResponse = z.object({ status: z.literal('success'), data: z.unknown() });

const stallListResponse = registry.register(
  'StallListResponse',
  z.object({
    status: z.literal('success'),
    meta: z.object({
      page: z.number().openapi({ example: 1 }),
      limit: z.number().openapi({ example: 10 }),
      total: z.number().openapi({ example: 10 }),
    }),
    data: z.array(stallSchema),
  }),
);
const stallDetailResponse = registry.register(
  'StallDetailResponse',
  z.object({ status: z.literal('success'), data: stallSchema }),
);
const menuListResponse = registry.register(
  'MenuListResponse',
  z.object({ status: z.literal('success'), data: z.array(menuSchema) }),
);
const profileResponse = registry.register(
  'ProfileResponse',
  z.object({ status: z.literal('success'), data: userProfileSchema }),
);
const loginResponse = registry.register(
  'LoginResponse',
  z.object({
    status: z.literal('success'),
    data: z.object({
      token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
      user: userProfileSchema,
    }),
  }),
);

// ------------------------------------------------------------ helper
const ok = (description: string, schema: z.ZodType) => ({
  description,
  content: { 'application/json': { schema } },
});
const fail = (description: string) => ok(description, errorSchema);
const jsonBody = (schema: z.ZodType, description?: string) => ({
  body: { required: true, description, content: { 'application/json': { schema } } },
});

const e401 = { 401: fail('Token tidak ada / tidak valid / kedaluwarsa') };
const e403Role = { 403: fail('Role tidak memiliki akses ke endpoint ini') };
const e403Admin = { 403: fail('Hanya admin yang boleh mengakses') };
const adminOnly = { ...e401, ...e403Admin };

// ============================================================ SYSTEM
registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['SYSTEM'],
  summary: 'Cek kesehatan server & database',
  responses: {
    200: ok('Server dan database terhubung', z.object({ status: z.literal('success'), message: z.string() })),
  },
});

// ============================================================ AUTH (publik)
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/register',
  tags: ['AUTH'],
  summary: 'Registrasi akun (selalu role customer)',
  request: jsonBody(registerInput, 'Data akun baru'),
  responses: {
    201: ok('Akun berhasil dibuat', profileResponse),
    400: fail('Validasi gagal'),
    409: fail('Email sudah terdaftar'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/login',
  tags: ['AUTH'],
  summary: 'Login, mengembalikan JWT',
  request: jsonBody(loginInput, 'Email dan password'),
  responses: {
    200: ok('Login berhasil', loginResponse),
    400: fail('Validasi gagal'),
    401: fail('Email atau password salah'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/auth/me',
  tags: ['AUTH'],
  summary: 'Profil user dari token (semua role)',
  security: bearer,
  responses: { 200: ok('Profil user', profileResponse), ...e401 },
});

// ============================================================ STALLS
registry.registerPath({
  method: 'get',
  path: '/api/v1/stalls',
  tags: ['STALLS'],
  summary: 'Daftar kantin (publik)',
  description: 'Daftar kantin dengan filter `search`/`category` dan pagination.',
  request: { query: listStallsQuerySchema },
  responses: { 200: ok('Daftar kantin + meta pagination', stallListResponse), 400: fail('Query tidak valid') },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/stalls/{id}',
  tags: ['STALLS'],
  summary: 'Detail kantin (publik)',
  request: { params: idParamSchema },
  responses: {
    200: ok('Detail kantin', stallDetailResponse),
    400: fail('Parameter id tidak valid'),
    404: fail('Kantin tidak ditemukan'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/stalls',
  tags: ['STALLS'],
  summary: 'Tambah kantin (owner, admin)',
  security: bearer,
  request: jsonBody(stallInput, 'Data kantin baru. ownerId diambil dari token.'),
  responses: {
    201: ok('Kantin berhasil dibuat', stallDetailResponse),
    400: fail('Validasi gagal'),
    ...e401,
    ...e403Role,
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/stalls/{id}',
  tags: ['STALLS'],
  summary: 'Update kantin (owner pemilik, admin)',
  security: bearer,
  request: { params: idParamSchema, ...jsonBody(stallUpdate, 'Data yang diubah (boleh sebagian)') },
  responses: {
    200: ok('Kantin ter-update', stallDetailResponse),
    400: fail('Validasi gagal'),
    ...e401,
    403: fail('Bukan pemilik kantin / role tidak sesuai'),
    404: fail('Kantin tidak ditemukan'),
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/stalls/{id}',
  tags: ['STALLS'],
  summary: 'Hapus kantin (admin)',
  security: bearer,
  request: { params: idParamSchema },
  responses: {
    200: ok('Kantin terhapus', z.object({ status: z.literal('success'), message: z.string() })),
    400: fail('Parameter id tidak valid'),
    ...adminOnly,
    404: fail('Kantin tidak ditemukan'),
    409: fail('Kantin masih punya data terkait'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/stalls/{id}/menus',
  tags: ['STALLS'],
  summary: 'Daftar menu sebuah kantin (owner pemilik, admin)',
  security: bearer,
  request: { params: idParamSchema },
  responses: {
    200: ok('Daftar menu milik kantin', menuListResponse),
    400: fail('Parameter id tidak valid'),
    ...e401,
    403: fail('Bukan pemilik kantin / role tidak sesuai'),
    404: fail('Kantin tidak ditemukan'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/stalls/{id}/reviews',
  tags: ['STALLS'],
  summary: 'Tambah review ke kantin (semua role yang login)',
  security: bearer,
  request: { params: idParamSchema, ...jsonBody(stallReviewInput, 'Rating 1..5 dan komentar opsional. userId dari token.') },
  responses: {
    201: ok('Review berhasil dibuat', dataResponse),
    400: fail('Validasi gagal'),
    ...e401,
    404: fail('Kantin tidak ditemukan'),
    409: fail('Anda sudah mereview kantin ini'),
  },
});

// ============================================================ USERS (admin)
registry.registerPath({
  method: 'get', path: '/api/v1/users', tags: ['USERS'], summary: 'Daftar pengguna (admin)',
  security: bearer,
  responses: { 200: ok('Daftar pengguna', dataListResponse), ...adminOnly },
});
registry.registerPath({
  method: 'post', path: '/api/v1/users', tags: ['USERS'], summary: 'Tambah pengguna (admin)',
  security: bearer, request: jsonBody(userInput),
  responses: { 201: ok('Pengguna berhasil dibuat', dataResponse), 400: fail('Body tidak valid'), ...adminOnly },
});

// ============================================================ MENU ITEMS (admin)
registry.registerPath({
  method: 'get', path: '/api/v1/menu-items', tags: ['MENU_ITEMS'], summary: 'Daftar menu (join stall) (admin)',
  security: bearer,
  responses: { 200: ok('Daftar menu dengan nama kantin', dataListResponse), ...adminOnly },
});
registry.registerPath({
  method: 'post', path: '/api/v1/menu-items', tags: ['MENU_ITEMS'], summary: 'Tambah menu (admin)',
  security: bearer, request: jsonBody(menuItemInput),
  responses: { 201: ok('Menu berhasil dibuat', dataResponse), 400: fail('Body tidak valid'), ...adminOnly },
});
registry.registerPath({
  method: 'get', path: '/api/v1/menu-items/{id}', tags: ['MENU_ITEMS'], summary: 'Detail menu (admin)',
  security: bearer, request: { params: idParamSchema },
  responses: { 200: ok('Detail menu dengan nama kantin', dataResponse), 400: fail('Parameter id tidak valid'), ...adminOnly, 404: fail('Menu tidak ditemukan') },
});
registry.registerPath({
  method: 'put', path: '/api/v1/menu-items/{id}', tags: ['MENU_ITEMS'], summary: 'Ubah menu (admin)',
  security: bearer, request: { params: idParamSchema, ...jsonBody(menuItemUpdate) },
  responses: { 200: ok('Menu diperbarui', dataResponse), 400: fail('Input tidak valid'), ...adminOnly, 404: fail('Menu tidak ditemukan') },
});
registry.registerPath({
  method: 'delete', path: '/api/v1/menu-items/{id}', tags: ['MENU_ITEMS'], summary: 'Hapus menu (admin)',
  security: bearer, request: { params: idParamSchema },
  responses: { 200: ok('Menu dihapus', dataResponse), 400: fail('Parameter id tidak valid'), ...adminOnly, 404: fail('Menu tidak ditemukan') },
});

// ============================================================ REVIEWS (admin)
registry.registerPath({
  method: 'get', path: '/api/v1/reviews', tags: ['REVIEWS'], summary: 'Daftar review (join user) (admin)',
  security: bearer,
  responses: { 200: ok('Daftar review dengan nama pengguna', dataListResponse), ...adminOnly },
});
registry.registerPath({
  method: 'delete', path: '/api/v1/reviews/{id}', tags: ['REVIEWS'], summary: 'Hapus review (admin)',
  security: bearer, request: { params: idParamSchema },
  responses: { 200: ok('Review dihapus', dataResponse), 400: fail('Parameter id tidak valid'), ...adminOnly, 404: fail('Review tidak ditemukan') },
});

// ============================================================ LIKES (admin)
registry.registerPath({
  method: 'post', path: '/api/v1/likes', tags: ['LIKES'], summary: 'Beri like pada review (admin)',
  security: bearer, request: jsonBody(likeInput),
  responses: { 201: ok('Like berhasil dibuat', dataResponse), 400: fail('Body tidak valid'), ...adminOnly },
});
registry.registerPath({
  method: 'delete', path: '/api/v1/likes/{id}', tags: ['LIKES'], summary: 'Hapus like (admin)',
  security: bearer, request: { params: idParamSchema },
  responses: { 200: ok('Like dihapus', dataResponse), 400: fail('Parameter id tidak valid'), ...adminOnly, 404: fail('Like tidak ditemukan') },
});

// ============================================================ FLAGS (admin)
registry.registerPath({
  method: 'get', path: '/api/v1/flags', tags: ['FLAGS'], summary: 'Daftar laporan review (admin)',
  security: bearer,
  responses: { 200: ok('Daftar flags', dataListResponse), ...adminOnly },
});
registry.registerPath({
  method: 'put', path: '/api/v1/flags/{id}', tags: ['FLAGS'], summary: 'Perbarui status laporan (admin)',
  security: bearer, request: { params: idParamSchema, ...jsonBody(flagStatusInput) },
  responses: { 200: ok('Status laporan diperbarui', dataResponse), 400: fail('Input tidak valid'), ...adminOnly, 404: fail('Flag tidak ditemukan') },
});

// ============================================================ AUDIT LOGS (admin)
registry.registerPath({
  method: 'get', path: '/api/v1/audit-logs', tags: ['AUDIT_LOGS'], summary: 'Daftar audit log (admin)',
  security: bearer,
  responses: { 200: ok('Daftar audit log', dataListResponse), ...adminOnly },
});
registry.registerPath({
  method: 'post', path: '/api/v1/audit-logs', tags: ['AUDIT_LOGS'], summary: 'Catat aktivitas audit (admin)',
  security: bearer, request: jsonBody(auditLogInput),
  responses: { 201: ok('Audit log berhasil dibuat', dataResponse), 400: fail('Body tidak valid'), ...adminOnly },
});

// ============================================================ generate
// Dokumen OpenAPI 3.0 dibangkitkan in-memory dan disajikan langsung di /docs.
export const openApiDocument = new OpenApiGeneratorV3(registry.definitions).generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'Review Kantin API',
    version: '1.0.0',
    description:
      'Dokumentasi OpenAPI 3.0 yang dibangkitkan dari schema zod. ' +
      'Klik **Authorize**, lalu isi token dari `POST /api/v1/auth/login`.',
  },
  servers: [{ url: '/' }],
});
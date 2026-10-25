# Hands-on 2 — Akses Database dengan Drizzle ORM

Hands-on ini mengganti akses data dari query SQL manual menjadi **ORM (Drizzle)**,
tetap memakai arsitektur berlapis (Repository → Service → Controller → Router).

> File ini adalah sumber langkah utama.

## Prinsip

- **Skema DDL tetap dikelola di `../db/*.sql`** (recall ERD di SQL Server).
- Drizzle dipakai untuk **query bertipe** dari aplikasi.
- `src/db/schema.ts` **ditulis manual**, bukan hasil `drizzle-kit pull`. Alasannya:
  intropeksi (`pull`) Drizzle untuk MSSQL masih **RC** dan belum stabil.

## Prasyarat

- Node.js **>= 22.18.0**, npm
- SQL Server aktif + database sudah disiapkan:

```powershell
sqlcmd -S localhost -E -C -i ..\db\00-setup-mixed-mode.sql       # sekali saja
sqlcmd -S localhost -E -C -i ..\db\01-create-database-and-user.sql
sqlcmd -S localhost -E -C -i ..\db\02-schema.sql
sqlcmd -S localhost -E -C -i ..\db\03-seed.sql
```

---

## Langkah 1 — Buat project & install dependencies

```bash
npm init -y
npm install express mssql dotenv drizzle-orm@1.0.0-rc.5-5935859 swagger-ui-express @asteasolutions/zod-to-openapi zod
npm install -D typescript @types/express @types/mssql @types/node tsx drizzle-kit@1.0.0-rc.5-5935859 @types/swagger-ui-express
```

> Versi `drizzle-orm`/`drizzle-kit` dipatok ke RC yang sudah diuji. Drizzle untuk MSSQL
> masih preview, jadi API bisa berubah.

### `package.json`

```json
{
  "main": "src/index.ts",
  "scripts": {
    "start": "tsx src/index.ts",
    "prestart": "npm run docs:gen",
    "dev": "tsx watch src/index.ts",
    "predev": "npm run docs:gen",
    "docs:gen": "tsx src/docs/swagger.ts"
  },
  "type": "commonjs"
}
```

## Langkah 2 — Konfigurasi `.env`

```powershell
Copy-Item .env.example .env
```

```
PORT=3000
DB_SERVER=localhost
DB_PORT=1433
DB_USER=praktikum_user
DB_PASSWORD=Praktikum2026!
DB_NAME=review_kantin
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
JWT_SECRET=<ganti-dengan-secret-random-minimal-32-karakter>
```

> Nilai yang mengandung `#` wajib dibungkus tanda kutip (dotenv menganggap `#` komentar).
> Buat `JWT_SECRET` unik, misalnya dengan
> `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
> Jangan gunakan teks placeholder tersebut sebagai secret sebenarnya.

## Langkah 3 — Definisikan schema (`src/db/schema.ts`)

Kita memetakan tabel SQL Server ke objek TypeScript memakai `mssqlTable` dan
builder kolom `mssql-core`.

```ts
import { mssqlTable, int, bit, nvarchar, decimal, datetime2 } from 'drizzle-orm/mssql-core';

export const users = mssqlTable('USERS', {
  id: int('id').primaryKey().identity(),
  name: nvarchar('name', { length: 100 }).notNull(),
  email: nvarchar('email', { length: 150 }).notNull().unique(),
  passwordHash: nvarchar('password_hash', { length: 255 }).notNull(),
  role: nvarchar('role', { length: 20, enum: ['admin', 'owner', 'customer'] }).notNull(),
  createdAt: datetime2('created_at'),
});

export const stalls = mssqlTable('STALLS', {
  id: int('id').primaryKey().identity(),
  ownerId: int('owner_id').notNull().references(() => users.id),
  name: nvarchar('name', { length: 100 }).notNull(),
  category: nvarchar('category', { length: 50 }),
  location: nvarchar('location', { length: 100 }),
  description: nvarchar('description', { length: 'max' }),
  avgRating: decimal('avg_rating', { precision: 3, scale: 2 }).notNull(),
  reviewCount: int('review_count').notNull(),
  createdAt: datetime2('created_at'),
});

export const menuItems = mssqlTable('MENU_ITEMS', {
  id: int('id').primaryKey().identity(),
  stallId: int('stall_id').notNull().references(() => stalls.id),
  name: nvarchar('name', { length: 100 }).notNull(),
  price: int('price').notNull(),
  isAvailable: bit('is_available').notNull(),
});
```

`src/db/schema.ts` juga memuat `reviews`, `likes`, `flags`, dan `auditLogs`
(tabel lain dari ERD yang belum dipakai di hands-on ini).

## Langkah 4 — Inisialisasi koneksi (`src/db/index.ts`)

```ts
import 'dotenv/config';
import mssql from 'mssql';
import { drizzle } from 'drizzle-orm/node-mssql';
import * as schema from './schema.ts';

const config: mssql.config = {
  server: process.env.DB_SERVER ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 1433),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

let poolPromise: Promise<mssql.ConnectionPool> | null = null;
let dbPromise: ReturnType<typeof buildDb> | null = null;

async function buildDb() {
  poolPromise ??= mssql.connect(config);
  const pool = await poolPromise;
  return drizzle({ client: pool, schema });
}

export function getDb() {
  if (!dbPromise) {
    dbPromise = buildDb().catch((error) => {
      dbPromise = null;
      poolPromise = null;
      throw error;
    });
  }
  return dbPromise;
}
```

## Langkah 5 — Repository dengan query builder

`src/repositories/stallRepository.ts`:

```ts
import { and, count, eq, like, type SQL } from 'drizzle-orm';
import { getDb } from '../db/index.ts';
import { stalls } from '../db/schema.ts';

export class StallRepository {
  async findAll(params: FindAllParams) {
    const db = await getDb();

    const conditions: SQL[] = [];
    if (params.search) conditions.push(like(stalls.name, `%${params.search}%`));
    if (params.category) conditions.push(eq(stalls.category, params.category));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const offset = (params.page - 1) * params.limit;

    // MSSQL: pagination = ORDER BY + OFFSET ... FETCH NEXT
    const rows = await db
      .select()
      .from(stalls)
      .where(where)
      .orderBy(stalls.id)
      .offset(offset)
      .fetch(params.limit);

    const totals = await db.select({ total: count() }).from(stalls).where(where);

    return { rows, total: Number(totals[0]?.total ?? 0) };
  }

  async create(input: CreateStallInput) {
    const db = await getDb();
    const rows = await db.insert(stalls).output().values({ /* ... */ });
    return rows[0];
  }
}
```

Join contoh (menu items) — `src/repositories/menuItemRepository.ts`:

```ts
import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.ts';
import { menuItems } from '../db/schema.ts';

export class MenuItemRepository {
  async findByStallId(stallId: number) {
    const db = await getDb();
    return db.select().from(menuItems).where(eq(menuItems.stallId, stallId));
  }
}
```

## Langkah 6 — Service (mapping + logika bisnis)

`src/services/stallService.ts` memetakan row DB menjadi DTO camelCase dan menghitung
`isPopular` (rating ≥ 4.7). Perhatikan: `decimal` dari driver berbentuk **string**,
jadi di-`Number(...)`.

```ts
private toDto(row: StallRow): StallResponseDto {
  const avgRating = Number(row.avgRating);
  return { ...row, avgRating, isPopular: avgRating >= 4.7 };
}
```

## Langkah 7 — Controller, Router, dan Entry point

- `src/controllers/stallController.ts` — handler Express, memetakan `STALL_NOT_FOUND` → 404.
- `src/routes/stallRouter.ts` — pemetaan endpoint.
- `src/index.ts` — server Express, halaman indeks API, dan `GET /health` (`SELECT 1` via Drizzle).

## Langkah 8 — Jalankan & uji

```bash
npm run dev
```

Secara default server berjalan pada port `3000`. Jika port tersebut sudah dipakai,
atur `PORT=3001` (atau port lain yang tersedia) di file `.env`.

| Method | Endpoint | Hasil |
| --- | --- | --- |
| GET | `/` | `200` informasi API dan daftar endpoint |
| GET | `/api/v1` | `200` daftar endpoint API |
| GET | `/health` | `200` koneksi DB OK |
| GET | `/docs` | Swagger UI |
| GET | `/api/v1/stalls?search=&category=&page=&limit=` | `200` daftar + `meta {page,limit,total}` |
| GET | `/api/v1/stalls/:id` | `200` detail, `404` bila tak ada |
| POST | `/api/v1/auth/register` | `201` registrasi akun customer |
| POST | `/api/v1/auth/login` | `200` JWT dan profil user |
| GET | `/api/v1/auth/me` | `200` profil dari JWT; perlu login |
| POST | `/api/v1/stalls` | `201` stall baru; owner/admin |
| PUT | `/api/v1/stalls/:id` | `200` stall ter-update; owner pemilik/admin |
| DELETE | `/api/v1/stalls/:id` | `200` stall terhapus; admin |
| POST | `/api/v1/stalls/:id/reviews` | `201` review; perlu login |
| GET | `/api/v1/stalls/:id/menus` | `200` daftar menu; owner pemilik/admin |

Semua endpoint terlindungi menerima header `Authorization: Bearer <token>`.
Registrasi publik selalu membuat role `customer`; role `owner` dan `admin` tidak
bisa dipilih lewat request registrasi dan harus diberikan oleh administrator.
Permintaan tanpa token atau token yang tidak valid mendapat `401`; user yang
login tetapi role atau kepemilikannya tidak sesuai mendapat `403`. Identitas
reviewer dan pemilik kantin berasal dari token, bukan dari body request.

Endpoint manajemen selain tabel di atas (users, menu-items, reviews, likes,
flags, dan audit-logs) hanya dapat diakses `admin`.

Contoh alur:

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "Nama Pengguna",
  "email": "user@example.com",
  "password": "password-minimal-8"
}
```

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password-minimal-8"
}
```

Kirim nilai `data.token` dari respons login pada header `Authorization` dengan
skema `Bearer` untuk endpoint yang mewajibkan login.

Contoh:

```bash
curl.exe "http://localhost:3000/api/v1/stalls?category=Minuman&limit=2&page=1"
```

---

## Dokumentasi API (Swagger UI)

Dokumentasi dibangun dari schema Zod menggunakan **`@asteasolutions/zod-to-openapi`**
dan disajikan lewat **`swagger-ui-express`** di `http://localhost:3000/docs`.

Alur:

1. `src/docs/openapi.ts` menyusun spesifikasi OpenAPI dari schema dan endpoint API.
2. `npm run docs:gen` — menghasilkan `src/docs/swagger-output.json`.
3. `npm run dev` — menyajikan spec tersebut di `/docs`.
   (`predev`/`prestart` otomatis menjalankan `docs:gen` sebelum server start.)

File terkait:

- `src/docs/openapi.ts` — definisi endpoint, skema, dan autentikasi Bearer JWT.
- `src/docs/swagger.ts` — menulis dokumen OpenAPI ke file JSON.
- `src/docs/swagger-output.json` — **hasil generate**; jangan diedit manual.
- `src/routes/` — endpoint beserta middleware validasi dan otorisasi.
- `src/middlewares/authenticate.ts` — verifikasi JWT dan pemeriksaan role.
- `src/index.ts` — menyajikan Swagger UI pada `/docs`.

Buka `/docs`, lalu klik **Try it out** untuk mengisi parameter/body dan mengirim request.

---

## Catatan penting: perbedaan API Drizzle untuk MSSQL

Bila terbiasa dengan contoh Drizzle (Postgres/MySQL), ada beberapa perbedaan:

- **Pagination**: MSSQL memakai `.orderBy(...).offset(n).fetch(m)` — **bukan** `.limit()`.
  `.offset()` wajib didahului `.orderBy()`. Ada juga `.top(n)`.
- **Mengembalikan row saat insert/update/delete**: memakai `.output()` (bukan `.returning()`).
  Untuk insert, `.output()` dipanggil **sebelum** `.values()`.
- **`decimal`** dikembalikan sebagai **string** oleh driver; konversi ke `Number` bila perlu.
- **`drizzle-kit pull`** (introspeksi) untuk MSSQL masih RC dan belum stabil, sehingga
  `schema.ts` ditulis manual dan DDL tetap di `../db/*.sql`.

## Struktur Project

```
hands-on-2-orm-drizzle/
├─ README.md
├─ .env.example
├─ drizzle.config.ts          # konfigurasi drizzle-kit (referensi)
├─ package.json  tsconfig.json
└─ src/
   ├─ db/
   │  ├─ schema.ts            # pemetaan tabel (manual)
   │  └─ index.ts            # koneksi Drizzle
   ├─ docs/
   │  ├─ openapi.ts            # spesifikasi OpenAPI
   │  ├─ swagger.ts            # generator JSON OpenAPI
   │  └─ swagger-output.json  # hasil generate (gitignored)
   ├─ auth/jwt.ts             # pembuatan dan verifikasi JWT
   ├─ dtos/stallDto.ts
   ├─ repositories/
   │  ├─ stallRepository.ts
   │  └─ menuItemRepository.ts
   ├─ services/stallService.ts
   ├─ controllers/stallController.ts
   ├─ routes/stallRouter.ts
   └─ index.ts
```

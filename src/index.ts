import 'dotenv/config';
import express, { type Request, type Response, type Application } from 'express';
import { sql } from 'drizzle-orm';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './docs/swagger-output.json';
import { getDb } from './db/index.ts';
import { authRouter } from './routes/authRouter.ts';
import { stallRouter } from './routes/stallRouter.ts';
import { userRouter } from './routes/userRouter.ts';
import { menuItemRouter } from './routes/menuItemRouter.ts';
import { reviewRouter } from './routes/reviewRouter.ts';
import { likeRouter } from './routes/likeRouter.ts';
import { flagRouter } from './routes/flagRouter.ts';
import { auditLogRouter } from './routes/auditLogRouter.ts';
import { authenticate, authorize } from './middlewares/authenticate.ts';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.ts';

const app: Application = express();
const PORT: number = Number(process.env.PORT ?? 3000);

app.use(express.json());

// Dokumentasi API (Swagger UI) dari dokumen yang dibangkitkan oleh docs:gen.
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument as any, {
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .wrapper { max-width: 1000px; padding: 0 24px; }
      .swagger-ui .info { margin: 20px 0 12px; }
      .swagger-ui .info hgroup.main { margin: 0; }
      .swagger-ui .info .title { font-size: 28px; }
      .swagger-ui .info .title small { display: none; }
      .swagger-ui .info .description { display: none; }
      .swagger-ui .filter-container { padding: 8px 0 12px; }
      .swagger-ui .opblock-tag { margin: 0; padding: 12px 16px; }
      .swagger-ui .opblock { margin: 0 0 8px; box-shadow: none; }
      .swagger-ui .opblock .opblock-summary { padding: 8px 12px; }
      .swagger-ui section.models { display: none; }
      @media (max-width: 600px) {
        .swagger-ui .wrapper { padding: 0 12px; }
        .swagger-ui .info .title { font-size: 24px; }
      }
    `,
    swaggerOptions: {
      docExpansion: 'full',
      defaultModelsExpandDepth: -1,
      displayRequestDuration: true,
      filter: true,
      persistAuthorization: true, // token tidak hilang saat halaman di-refresh
      showExtensions: false,
      showCommonExtensions: false,
    },
  }),
);

app.get('/health', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    await db.execute(sql`SELECT 1 AS ok`);
    res.status(200).json({ status: 'success', message: 'Server dan database terhubung' });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Gagal terhubung ke database',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// publik + login
app.use('/api/v1/auth', authRouter);

// aturan per endpoint ada di stallRouter (publik / owner / admin / semua role login)
app.use('/api/v1/stalls', stallRouter);

// khusus admin: 401 tanpa token, 403 kalau bukan admin
const adminOnly = [authenticate, authorize('admin')];
app.use('/api/v1/users', ...adminOnly, userRouter);
app.use('/api/v1/menu-items', ...adminOnly, menuItemRouter);
app.use('/api/v1/reviews', ...adminOnly, reviewRouter);
app.use('/api/v1/likes', ...adminOnly, likeRouter);
app.use('/api/v1/flags', ...adminOnly, flagRouter);
app.use('/api/v1/audit-logs', ...adminOnly, auditLogRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
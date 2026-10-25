import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, ValidationError } from '../errors/AppError.ts';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, 'Endpoint tidak ditemukan'));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ValidationError) {
    res.status(400).json({ status: 'fail', message: err.message, errors: err.errors });
    return;
  }

  // JSON body rusak (ditolak express.json)
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({
      status: 'fail',
      message: 'Validasi gagal',
      errors: [{ field: 'body', message: 'body harus berupa JSON yang valid' }],
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ status: 'fail', message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ status: 'error', message: 'Terjadi kesalahan pada server' });
};
import type { RequestHandler } from 'express';
import { ReviewService } from '../services/reviewService.ts';

const service = new ReviewService();

// dipakai stallRouter: POST /stalls/:id/reviews (semua role yang login)
export const create: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated;
  const review = await service.create(req.user!.id, params.id, body);
  res.status(201).json({ status: 'success', data: review });
};

// dipakai reviewRouter: GET /reviews dan DELETE /reviews/:id (admin)
export class ReviewController {
  getAll: RequestHandler = async (_req, res) => {
    const data = await service.list();
    res.status(200).json({ status: 'success', data });
  };

  remove: RequestHandler = async (_req, res) => {
    await service.remove(res.locals.validated.params.id);
    res.status(200).json({ status: 'success', message: 'Review berhasil dihapus' });
  };
}
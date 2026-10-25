import { Router } from 'express';
import { validate } from '../middlewares/validate.ts';
import { authenticate, authorize } from '../middlewares/authenticate.ts';
import {
  createReviewBodySchema,
  createStallBodySchema,
  idParamSchema,
  listStallsQuerySchema,
  updateStallBodySchema,
} from '../validators/schemas.ts';
import * as stall from '../controllers/stallController.ts';
import * as review from '../controllers/reviewController.ts';

export const stallRouter = Router();

// publik
stallRouter.get('/', validate({ query: listStallsQuerySchema }), stall.list);
stallRouter.get('/:id', validate({ params: idParamSchema }), stall.getById);

// owner, admin
stallRouter.post(
  '/',
  authenticate,
  authorize('owner', 'admin'),
  validate({ body: createStallBodySchema }),
  stall.create,
);

// owner (miliknya, dicek di service), admin
stallRouter.put(
  '/:id',
  authenticate,
  authorize('owner', 'admin'),
  validate({ params: idParamSchema, body: updateStallBodySchema }),
  stall.update,
);

// admin
stallRouter.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate({ params: idParamSchema }),
  stall.remove,
);

// semua role yang login
stallRouter.post(
  '/:id/reviews',
  authenticate,
  validate({ params: idParamSchema, body: createReviewBodySchema }),
  review.create,
);

// owner pemilik / admin
stallRouter.get(
  '/:id/menus',
  authenticate,
  authorize('owner', 'admin'),
  validate({ params: idParamSchema }),
  stall.menus,
);
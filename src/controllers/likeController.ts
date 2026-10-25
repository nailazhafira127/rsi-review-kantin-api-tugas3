import type { Request, Response } from 'express';
import { getValidated } from '../middlewares/validate.ts';
import type { IdParam } from '../schemas/stallSchema.ts';
import type { CreateLikeInput } from '../schemas/resourceSchema.ts';
import { LikeService } from '../services/likeService.ts';
import { getAuthenticatedUser } from '../middlewares/authenticate.ts';

export class LikeController {
  constructor(private readonly service = new LikeService()) {}

  create = async (_req: Request, res: Response): Promise<void> => {
    const input = getValidated<CreateLikeInput>(res, 'body');
    const user = getAuthenticatedUser(res);
    res.status(201).json({
      status: 'success',
      data: await this.service.createLike({ ...input, userId: user.id }),
    });
  };
  remove = async (_req: Request, res: Response): Promise<void> => {
    const { id } = getValidated<IdParam>(res, 'params');
    res.status(200).json({ status: 'success', data: await this.service.deleteLike(id) });
  };
}
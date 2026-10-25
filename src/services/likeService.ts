import { NotFoundError } from '../errors/NotFoundError.ts';
import { LikeRepository } from '../repositories/likeRepository.ts';
import type { CreateLikeInput } from '../schemas/resourceSchema.ts';

export class LikeService {
  constructor(private readonly repository = new LikeRepository()) {}

  async createLike(input: CreateLikeInput & { userId: number }) {
    const like = await this.repository.create(input);
    if (!like) throw new NotFoundError('Like gagal dibuat');
    return like;
  }

  async deleteLike(id: number) {
    const like = await this.repository.remove(id);
    if (!like) throw new NotFoundError('Like tidak ditemukan');
    return like;
  }
}
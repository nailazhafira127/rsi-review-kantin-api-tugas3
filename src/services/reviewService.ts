import { AppError } from '../errors/AppError.ts';
import { ReviewRepository } from '../repositories/reviewRepository.ts';
import { StallRepository } from '../repositories/stallRepository.ts';
import { isForeignKeyViolation, isUniqueViolation } from '../utils/dbError.ts';

const reviewRepo = new ReviewRepository();
const stallRepo = new StallRepository();

export class ReviewService {
  list() {
    return reviewRepo.findAll();
  }

  async create(userId: number, stallId: number, input: { rating: number; comment?: string }) {
    if (!(await stallRepo.findById(stallId))) throw new AppError(404, 'Warung tidak ditemukan');
    try {
      // userId dari token, BUKAN dari body
      return await reviewRepo.create({ stallId, userId, ...input });
    } catch (err) {
      if (isUniqueViolation(err)) throw new AppError(409, 'Anda sudah mereview warung ini');
      throw err;
    }
  }

  async remove(id: number) {
    if (!(await reviewRepo.findById(id))) throw new AppError(404, 'Review tidak ditemukan');
    try {
      await reviewRepo.delete(id);
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new AppError(409, 'Review masih punya data terkait (like/flag) sehingga tidak bisa dihapus');
      }
      throw err;
    }
  }
}
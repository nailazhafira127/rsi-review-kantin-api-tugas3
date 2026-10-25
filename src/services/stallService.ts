import { AppError } from '../errors/AppError.ts';
import type { AuthUser } from '../auth/jwt.ts';
import { StallRepository } from '../repositories/stallRepository.ts';
import { MenuItemRepository } from '../repositories/menuItemRepository.ts';
import { isForeignKeyViolation } from '../utils/dbError.ts';
import type {
  CreateStallInput,
  FindAllParams,
  StallResponseDto,
  StallRow,
  UpdateStallInput,
} from '../dtos/stallDto.ts';

const repo = new StallRepository();
const menuRepo = new MenuItemRepository();

export class StallService {
  private toDto(row: StallRow): StallResponseDto {
    const avgRating = Number(row.avgRating);
    return { ...row, avgRating, isPopular: avgRating >= 4.7 };
  }

  private async getOrThrow(id: number) {
    const stall = await repo.findById(id);
    if (!stall) throw new AppError(404, 'Warung tidak ditemukan');
    return stall;
  }

  private assertCanManage(user: AuthUser, stall: StallRow) {
    if (user.role === 'admin') return;
    if (user.role === 'owner' && stall.ownerId === user.id) return;
    throw new AppError(403, 'Anda hanya boleh mengelola warung milik sendiri');
  }

  async list(params: FindAllParams) {
    const { rows, total } = await repo.findAll(params);
    return {
      data: rows.map((r) => this.toDto(r)),
      meta: { page: params.page, limit: params.limit, total },
    };
  }

  async getById(id: number) {
    return this.toDto(await this.getOrThrow(id));
  }

  async create(user: AuthUser, input: CreateStallInput) {
    // ownerId dari token, bukan dari body
    return this.toDto(await repo.create({ ...input, ownerId: user.id }));
  }

  async update(user: AuthUser, id: number, input: UpdateStallInput) {
    const stall = await this.getOrThrow(id);
    this.assertCanManage(user, stall);
    if (Object.keys(input).length === 0) return this.toDto(stall);
    const updated = await repo.update(id, input);
    return this.toDto(updated!);
  }

  async remove(id: number) {
    await this.getOrThrow(id);
    try {
      await repo.delete(id);
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new AppError(409, 'Warung masih punya data terkait (menu/review) sehingga tidak bisa dihapus');
      }
      throw err;
    }
  }

  async getMenus(user: AuthUser, id: number) {
    const stall = await this.getOrThrow(id);
    this.assertCanManage(user, stall);
    return menuRepo.findByStallId(id);
  }
}
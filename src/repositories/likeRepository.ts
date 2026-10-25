import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.ts';
import { likes } from '../db/schema.ts';
import type { CreateLikeInput } from '../schemas/resourceSchema.ts';

export class LikeRepository {
  async create(input: CreateLikeInput & { userId: number }) {
    const db = await getDb();
    const rows = await db.insert(likes).output().values(input);
    return rows[0];
  }

  async remove(id: number) {
    const db = await getDb();
    const rows = await db.delete(likes).where(eq(likes.id, id)).output();
    return rows[0];
  }
}
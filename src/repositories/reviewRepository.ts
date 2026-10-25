import { eq, sql } from 'drizzle-orm';
import { getDb } from '../db/index.ts';
import { reviews, stalls, users } from '../db/schema.ts';

export class ReviewRepository {
  // daftar review + nama pengguna (join)
  async findAll() {
    const db = await getDb();
    return db
      .select({
        id: reviews.id,
        stallId: reviews.stallId,
        userId: reviews.userId,
        userName: users.name,
        rating: reviews.rating,
        comment: reviews.comment,
        likeCount: reviews.likeCount,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .orderBy(reviews.id);
  }

  async findById(id: number) {
    const db = await getDb();
    const rows = await db.select().from(reviews).where(eq(reviews.id, id));
    return rows[0];
  }

  async create(input: { stallId: number; userId: number; rating: number; comment?: string }) {
    const db = await getDb();
    const rows = await db
      .insert(reviews)
      .output()
      .values({
        stallId: input.stallId,
        userId: input.userId,
        rating: input.rating,
        comment: input.comment ?? null,
        likeCount: 0, // kolom notNull tanpa default
      });

    await this.syncStall(input.stallId);
    return rows[0];
  }

  async delete(id: number) {
    const db = await getDb();
    const existing = await this.findById(id);
    await db.delete(reviews).where(eq(reviews.id, id));
    if (existing) await this.syncStall(existing.stallId);
  }

  // Sinkronkan rata-rata & jumlah review di STALLS
  // (hapus method ini kalau di DB-mu sudah ada trigger yang mengurusnya)
  private async syncStall(stallId: number) {
    const db = await getDb();
    const agg = await db
      .select({
        avg: sql<number | null>`avg(cast(${reviews.rating} as float))`,
        total: sql<number>`count(*)`,
      })
      .from(reviews)
      .where(eq(reviews.stallId, stallId));

    await db
      .update(stalls)
      .set({
        avgRating: Number(agg[0]?.avg ?? 0).toFixed(2),
        reviewCount: Number(agg[0]?.total ?? 0),
      })
      .where(eq(stalls.id, stallId));
  }
}
import { and, count, eq, like, type SQL } from 'drizzle-orm';
import { getDb } from '../db/index.ts';
import { stalls } from '../db/schema.ts';
import type { CreateStallInput, FindAllParams, UpdateStallInput } from '../dtos/stallDto.ts';

export class StallRepository {
  async findAll(params: FindAllParams) {
    const db = await getDb();

    const conditions: SQL[] = [];
    if (params.search) conditions.push(like(stalls.name, `%${params.search}%`));
    if (params.category) conditions.push(eq(stalls.category, params.category));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const offset = (params.page - 1) * params.limit;

    const rows = await db
      .select()
      .from(stalls)
      .where(where)
      .orderBy(stalls.id)
      .offset(offset)
      .fetch(params.limit);

    const totals = await db.select({ total: count() }).from(stalls).where(where);
    return { rows, total: Number(totals[0]?.total ?? 0) };
  }

  async findById(id: number) {
    const db = await getDb();
    const rows = await db.select().from(stalls).where(eq(stalls.id, id));
    return rows[0];
  }

  async create(input: CreateStallInput & { ownerId: number }) {
    const db = await getDb();
    const rows = await db
      .insert(stalls)
      .output()
      .values({
        ownerId: input.ownerId,
        name: input.name,
        category: input.category ?? null,
        location: input.location ?? null,
        description: input.description ?? null,
        avgRating: '0',
        reviewCount: 0,
      });
    return rows[0];
  }

  async update(id: number, input: UpdateStallInput) {
    const db = await getDb();
    await db.update(stalls).set(input).where(eq(stalls.id, id));
    return this.findById(id);
  }

  async delete(id: number) {
    const db = await getDb();
    await db.delete(stalls).where(eq(stalls.id, id));
  }
}
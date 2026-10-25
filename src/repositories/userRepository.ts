import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.ts';
import { users } from '../db/schema.ts';

type Role = 'admin' | 'owner' | 'customer';

export class UserRepository {
  // tanpa passwordHash, jangan pernah dikirim ke client
  async findAll() {
    const db = await getDb();
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.id);
  }

  async findByEmail(email: string) {
    const db = await getDb();
    const rows = await db.select().from(users).where(eq(users.email, email));
    return rows[0];
  }

  async findById(id: number) {
    const db = await getDb();
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0];
  }

  async create(input: { name: string; email: string; passwordHash: string; role?: Role }) {
    const db = await getDb();
    const rows = await db
      .insert(users)
      .output()
      .values({ ...input, role: input.role ?? 'customer' });
    return rows[0];
  }
}
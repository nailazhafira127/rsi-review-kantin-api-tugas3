import { getDb } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';
import type { CreateAuditLogInput } from '../schemas/resourceSchema.ts';

export interface CreateAuditLogRecord extends Omit<CreateAuditLogInput, 'metadata'> {
  userId: number;
  metadata: string | null;
}

export class AuditLogRepository {
  async findAll() {
    const db = await getDb();
    return db.select().from(auditLogs).orderBy(auditLogs.id);
  }

  async create(input: CreateAuditLogRecord) {
    const db = await getDb();
    const rows = await db.insert(auditLogs).output().values(input);
    return rows[0];
  }
}
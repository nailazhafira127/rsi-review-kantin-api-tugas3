import { NotFoundError } from '../errors/NotFoundError.ts';
import { AuditLogRepository } from '../repositories/auditLogRepository.ts';
import type { CreateAuditLogInput } from '../schemas/resourceSchema.ts';

export class AuditLogService {
  constructor(private readonly repository = new AuditLogRepository()) {}

  getAuditLogs() {
    return this.repository.findAll();
  }

  async createAuditLog(input: CreateAuditLogInput & { userId: number }) {
    const row = await this.repository.create({
      ...input,
      metadata: input.metadata == null ? null : JSON.stringify(input.metadata),
    });
    if (!row) throw new NotFoundError('Audit log gagal dibuat');
    return row;
  }
}
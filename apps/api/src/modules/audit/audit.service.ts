import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

export interface AuditLogData {
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  userId?: string;
  userType?: string;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
  ) {}

  async log(data: AuditLogData): Promise<AuditLog> {
    const log = this.auditLogRepo.create(data);
    return this.auditLogRepo.save(log);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string, limit = 50): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findRecent(limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}

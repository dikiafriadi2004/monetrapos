import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { AuditLog } from './audit-log.entity';

export interface AuditLogData {
  companyId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  userId?: string;
  userType?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
  ) {}

  /**
   * Log an audit event
   */
  async log(data: AuditLogData): Promise<AuditLog> {
    const log = this.auditLogRepo.create(data);
    return this.auditLogRepo.save(log);
  }

  /**
   * Find audit logs by entity
   */
  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find audit logs by user
   */
  async findByUser(userId: string, limit = 50): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find recent audit logs
   */
  async findRecent(limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find audit logs by company with pagination and filters
   */
  async findByCompany(
    companyId: string,
    filters: AuditLogFilters = {},
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.dateFrom && filters.dateTo) {
      where.createdAt = Between(filters.dateFrom, filters.dateTo);
    } else if (filters.dateFrom) {
      where.createdAt = Between(filters.dateFrom, new Date());
    }

    const [data, total] = await this.auditLogRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find audit logs by date range
   */
  async findByDateRange(
    companyId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: {
        companyId,
        createdAt: Between(dateFrom, dateTo),
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find audit logs by action
   */
  async findByAction(
    companyId: string,
    action: string,
    limit = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { companyId, action },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find audit logs by entity type
   */
  async findByEntityType(
    companyId: string,
    entityType: string,
    limit = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { companyId, entityType },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find audit logs by multiple actions
   */
  async findByActions(
    companyId: string,
    actions: string[],
    limit = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: {
        companyId,
        action: In(actions),
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}

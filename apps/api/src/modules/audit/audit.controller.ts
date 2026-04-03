import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService, AuditLogFilters } from './audit.service';
import { AuditLog } from './audit-log.entity';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId: string;
    email: string;
  };
}

@Controller('audit')
@UseGuards(AuthGuard('jwt'))
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Get audit logs for current company with filters
   * GET /api/audit/logs?page=1&limit=50&action=user.login&entityType=user&userId=xxx&dateFrom=2024-01-01&dateTo=2024-12-31
   */
  @Get('logs')
  async getLogs(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<{
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const companyId = req.user.companyId;

    const filters: AuditLogFilters = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      action,
      entityType,
      userId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };

    return this.auditService.findByCompany(companyId, filters);
  }

  /**
   * Get audit logs for specific entity
   * GET /api/audit/logs/entity/:entityType/:entityId
   */
  @Get('logs/entity/:entityType/:entityId')
  async getEntityLogs(
    @Request() req: AuthenticatedRequest,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<AuditLog[]> {
    // Note: This doesn't filter by companyId, but entities should be tenant-scoped
    // Consider adding companyId check if needed
    return this.auditService.findByEntity(entityType, entityId);
  }

  /**
   * Get audit logs for specific user
   * GET /api/audit/logs/user/:userId?limit=50
   */
  @Get('logs/user/:userId')
  async getUserLogs(
    @Request() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ): Promise<AuditLog[]> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.auditService.findByUser(userId, limitNum);
  }

  /**
   * Get recent audit logs for current company
   * GET /api/audit/logs/recent?limit=100
   */
  @Get('logs/recent')
  async getRecentLogs(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ): Promise<AuditLog[]> {
    const companyId = req.user.companyId;
    const limitNum = limit ? parseInt(limit, 10) : 100;

    const result = await this.auditService.findByCompany(companyId, {
      limit: limitNum,
    });

    return result.data;
  }

  /**
   * Get audit logs by action
   * GET /api/audit/logs/action/:action?limit=100
   */
  @Get('logs/action/:action')
  async getLogsByAction(
    @Request() req: AuthenticatedRequest,
    @Param('action') action: string,
    @Query('limit') limit?: string,
  ): Promise<AuditLog[]> {
    const companyId = req.user.companyId;
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.auditService.findByAction(companyId, action, limitNum);
  }

  /**
   * Get audit logs by entity type
   * GET /api/audit/logs/type/:entityType?limit=100
   */
  @Get('logs/type/:entityType')
  async getLogsByEntityType(
    @Request() req: AuthenticatedRequest,
    @Param('entityType') entityType: string,
    @Query('limit') limit?: string,
  ): Promise<AuditLog[]> {
    const companyId = req.user.companyId;
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.auditService.findByEntityType(companyId, entityType, limitNum);
  }
}

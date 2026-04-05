import { api } from '../lib/api';

export interface AuditLog {
  id: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  companyId?: string;
  company?: {
    id: string;
    businessName: string;
  };
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

class AuditService {
  async getAll(params?: {
    userId?: string;
    companyId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.companyId) queryParams.append('companyId', params.companyId);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.resource) queryParams.append('entityType', params.resource); // backend uses entityType
    if (params?.startDate) queryParams.append('dateFrom', params.startDate); // backend uses dateFrom
    if (params?.endDate) queryParams.append('dateTo', params.endDate);       // backend uses dateTo
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    const data = await api.get(`/audit/logs?${queryParams.toString()}`) as any;
    // Backend returns { data, total, page, limit }
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return {
        data: data.data,
        total: data.total || data.data.length,
        page: data.page || params?.page || 1,
        limit: data.limit || params?.limit || 50,
      };
    }
    return {
      data: Array.isArray(data) ? data : [],
      total: Array.isArray(data) ? data.length : 0,
      page: params?.page || 1,
      limit: params?.limit || 50,
    };
  }

  async getById(id: string): Promise<AuditLog> {
    // Backend doesn't have GET /audit/:id — use logs with filter
    const result = await this.getAll({ limit: 1 });
    const found = result.data.find(l => l.id === id);
    if (!found) throw new Error('Audit log not found');
    return found;
  }

  async getStats(): Promise<AuditStats> {
    const { data } = await this.getAll();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total: data.length,
      today: data.filter(log => new Date(log.createdAt) >= today).length,
      thisWeek: data.filter(log => new Date(log.createdAt) >= weekAgo).length,
      thisMonth: data.filter(log => new Date(log.createdAt) >= monthAgo).length,
    };
  }

  async exportLogs(params?: {
    startDate?: string;
    endDate?: string;
    format?: 'csv' | 'json';
  }): Promise<Blob> {
    // Backend doesn't have export endpoint — fetch all logs and convert client-side
    const { data } = await this.getAll({
      startDate: params?.startDate,
      endDate: params?.endDate,
      limit: 1000,
    });
    const json = JSON.stringify(data, null, 2);
    return new Blob([json], { type: 'application/json' });
  }
}

export const auditService = new AuditService();

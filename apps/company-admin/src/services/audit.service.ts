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
    if (params?.resource) queryParams.append('resource', params.resource);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    const data = await api.get(`/audit?${queryParams.toString()}`) as any;
    return {
      data: Array.isArray(data) ? data : [],
      total: Array.isArray(data) ? data.length : 0,
      page: params?.page || 1,
      limit: params?.limit || 50,
    };
  }

  async getById(id: string): Promise<AuditLog> {
    return await api.get(`/audit/${id}`);
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
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.format) queryParams.append('format', params.format);

    return await api.get(`/audit/export?${queryParams.toString()}`, { responseType: 'blob' });
  }
}

export const auditService = new AuditService();

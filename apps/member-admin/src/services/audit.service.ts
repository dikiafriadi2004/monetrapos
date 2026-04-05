import apiClient, { unwrap } from '@/lib/api-client';

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  userEmail?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
}

export interface AuditLogParams {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

export const auditService = {
  getAll: async (params?: AuditLogParams): Promise<PaginatedAuditLogs | AuditLog[]> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.action) query.set('action', params.action);
    if (params?.entityType) query.set('entityType', params.entityType);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    return unwrap<PaginatedAuditLogs | AuditLog[]>(await apiClient.get(`/audit/logs?${query.toString()}`));
  },

  getById: async (id: string): Promise<AuditLog> =>
    unwrap<AuditLog>(await apiClient.get(`/audit/${id}`)),
};

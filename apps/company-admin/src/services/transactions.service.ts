import { api } from '../lib/api';

export interface PaymentTransaction {
  id: string;
  companyId: string;
  company?: {
    id: string;
    businessName: string;
    email: string;
  };
  subscriptionId?: string;
  subscription?: {
    id: string;
    plan?: {
      name: string;
    };
  };
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  paymentMethod: string;
  paymentGateway: 'midtrans' | 'xendit';
  externalId?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionStats {
  total: number;
  totalAmount: number;
  paid: number;
  paidAmount: number;
  pending: number;
  failed: number;
}

class TransactionsService {
  async getAll(params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: PaymentTransaction[]; total: number; page: number; limit: number }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    const data = await api.get(`/admin/transactions?${queryParams.toString()}`) as any;
    return {
      data: Array.isArray(data) ? data : [],
      total: Array.isArray(data) ? data.length : 0,
      page: params?.page || 1,
      limit: params?.limit || 20,
    };
  }

  async getById(id: string): Promise<PaymentTransaction> {
    return await api.get(`/admin/transactions/${id}`);
  }

  async getStats(): Promise<TransactionStats> {
    const { data } = await this.getAll();
    const paid = data.filter(t => t.status === 'paid');
    
    return {
      total: data.length,
      totalAmount: data.reduce((sum, t) => sum + t.amount, 0),
      paid: paid.length,
      paidAmount: paid.reduce((sum, t) => sum + t.amount, 0),
      pending: data.filter(t => t.status === 'pending').length,
      failed: data.filter(t => t.status === 'failed').length,
    };
  }

  async refund(id: string, reason?: string): Promise<PaymentTransaction> {
    return await api.post(`/admin/transactions/${id}/refund`, { reason });
  }
}

export const transactionsService = new TransactionsService();

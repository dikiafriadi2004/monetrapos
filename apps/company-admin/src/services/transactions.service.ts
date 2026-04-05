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
    // Use billing admin invoices as the source of truth for platform transactions
    const data = await api.get('/billing/admin/invoices') as any;
    const invoices = Array.isArray(data) ? data : [];

    // Map invoices to transaction format
    const mapped: PaymentTransaction[] = invoices.map((inv: any) => ({
      id: inv.id,
      companyId: inv.companyId,
      company: inv.company,
      subscriptionId: inv.subscriptionId,
      amount: Number(inv.total || 0),
      currency: 'IDR',
      status: inv.status === 'paid' ? 'paid' : inv.status === 'pending' ? 'pending' : inv.status === 'cancelled' ? 'failed' : 'pending',
      paymentMethod: 'xendit',
      paymentGateway: 'xendit' as const,
      externalId: inv.invoiceNumber,
      paidAt: inv.paidAt,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    }));

    // Apply filters
    let filtered = mapped;
    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter(t => t.status === params.status);
    }

    return {
      data: filtered,
      total: filtered.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
    };
  }

  async getById(id: string): Promise<PaymentTransaction> {
    const data = await api.get(`/billing/invoices/${id}`) as any;
    return {
      id: data.id,
      companyId: data.companyId,
      amount: Number(data.total || 0),
      currency: 'IDR',
      status: data.status === 'paid' ? 'paid' : 'pending',
      paymentMethod: 'xendit',
      paymentGateway: 'xendit' as const,
      externalId: data.invoiceNumber,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
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
    // Not implemented in backend yet
    throw new Error('Refund not available');
  }
}

export const transactionsService = new TransactionsService();

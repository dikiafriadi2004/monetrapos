import apiClient from '@/lib/api-client';
import { Subscription, SubscriptionHistory } from '@/types/subscription.types';

export type { Subscription, SubscriptionHistory };

export interface Invoice {
  id: string;
  invoiceNumber: string;
  companyId: string;
  subscriptionId: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  dueDate: string;
  paidAt?: string;
  invoicePdfUrl?: string;
  paymentUrl?: string;
}

class SubscriptionService {
  async getCurrentSubscription(): Promise<Subscription | null> {
    try {
      const res = await apiClient.get('/subscriptions/current');
      return res.data;
    } catch {
      return null;
    }
  }

  async getSubscriptionHistory(
    subscriptionId?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: SubscriptionHistory[]; total: number; page: number; limit: number }> {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (subscriptionId) q.append('subscriptionId', subscriptionId);
    const res = await apiClient.get(`/subscriptions/history?${q.toString()}`);
    return res.data;
  }

  async renewSubscription(durationMonths: number): Promise<{ paymentUrl: string; invoiceId: string }> {
    const res = await apiClient.post('/subscriptions/renew', { durationMonths });
    return res.data;
  }

  async cancelSubscription(reason?: string): Promise<any> {
    const res = await apiClient.post('/subscriptions/cancel', { reason });
    return res.data;
  }

  async reactivateSubscription(durationMonths?: number): Promise<any> {
    const res = await apiClient.post('/subscriptions/reactivate', { durationMonths });
    return res.data;
  }

  async changePlan(newPlanId: string): Promise<any> {
    const res = await apiClient.put('/subscriptions/change-plan', { newPlanId });
    return res.data;
  }

  async getInvoices(page: number = 1, limit: number = 10): Promise<{ data: Invoice[]; total: number }> {
    const res = await apiClient.get(`/billing/invoices?page=${page}&limit=${limit}`);
    // Handle both { data: [], total } and plain array
    if (Array.isArray(res.data)) {
      return { data: res.data, total: res.data.length };
    }
    return {
      data: res.data?.data || res.data?.invoices || [],
      total: res.data?.total || 0,
    };
  }

  async downloadInvoice(invoiceId: string): Promise<Blob> {
    const res = await apiClient.get(`/billing/invoices/${invoiceId}/download`, {
      responseType: 'blob',
    });
    return res.data;
  }
}

export const subscriptionService = new SubscriptionService();

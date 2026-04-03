import axios from 'axios';
import { Subscription, SubscriptionHistory } from '@/types/subscription.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

// Re-export for backward compatibility
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
  private getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  async getCurrentSubscription(): Promise<Subscription | null> {
    try {
      const response = await axios.get(
        `${API_URL}/subscriptions/current`,
        this.getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      return null;
    }
  }

  async getSubscriptionHistory(
    subscriptionId?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: SubscriptionHistory[]; total: number; page: number; limit: number }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (subscriptionId) {
      params.append('subscriptionId', subscriptionId);
    }

    const response = await axios.get(
      `${API_URL}/subscriptions/history?${params.toString()}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async renewSubscription(durationMonths: number): Promise<{ paymentUrl: string; invoiceId: string }> {
    const response = await axios.post(
      `${API_URL}/subscriptions/renew`,
      { durationMonths },
      this.getAuthHeader()
    );
    return response.data;
  }

  async getInvoices(page: number = 1, limit: number = 10): Promise<{ data: Invoice[]; total: number }> {
    const response = await axios.get(
      `${API_URL}/billing/invoices?page=${page}&limit=${limit}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async downloadInvoice(invoiceId: string): Promise<Blob> {
    const response = await axios.get(
      `${API_URL}/billing/invoices/${invoiceId}/download`,
      {
        ...this.getAuthHeader(),
        responseType: 'blob',
      }
    );
    return response.data;
  }
}

export const subscriptionService = new SubscriptionService();

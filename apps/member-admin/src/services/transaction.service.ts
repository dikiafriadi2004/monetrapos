import apiClient from '@/lib/api-client';
import { Transaction, TransactionItem } from '@/types';

export type PaymentMethodType = 'cash' | 'card' | 'transfer' | 'qris';

export interface CreateTransactionItemRequest {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  discount?: number;
  total?: number;
}

export interface CreateTransactionRequest {
  storeId: string;
  paymentMethod: PaymentMethodType;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  customerName?: string;
  customerId?: string;
  employeeId?: string;
  employeeName?: string;
  notes?: string;
  items: CreateTransactionItemRequest[];
}

export const transactionService = {
  async createTransaction(data: CreateTransactionRequest): Promise<Transaction> {
    const response = await apiClient.post<Transaction>('/transactions', data);
    return response.data;
  },

  async getTransactions(storeId: string, page = 1, limit = 20) {
    const response = await apiClient.get('/transactions', {
      params: { storeId, page, limit },
    });
    return response.data;
  },

  async getTransaction(id: string): Promise<Transaction> {
    const response = await apiClient.get<Transaction>(`/transactions/${id}`);
    return response.data;
  },

  async voidTransaction(id: string, reason: string): Promise<Transaction> {
    const response = await apiClient.patch<Transaction>(`/transactions/${id}/void`, { reason });
    return response.data;
  },
};

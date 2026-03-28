import api from '@/lib/api';
import { Transaction, TransactionItem, PaymentMethodType } from '@/types';

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
  items: TransactionItem[];
}

export const transactionService = {
  async createTransaction(data: CreateTransactionRequest): Promise<Transaction> {
    const response = await api.post<Transaction>('/transactions', data);
    return response.data;
  },

  async getTransactions(storeId: string, page = 1, limit = 20) {
    const response = await api.get('/transactions', {
      params: { storeId, page, limit },
    });
    return response.data;
  },

  async getTransaction(id: string): Promise<Transaction> {
    const response = await api.get<Transaction>(`/transactions/${id}`);
    return response.data;
  },

  async voidTransaction(id: string, reason: string): Promise<Transaction> {
    const response = await api.patch<Transaction>(`/transactions/${id}/void`, { reason });
    return response.data;
  },
};

import apiClient from '@/lib/api-client';
import { Transaction, TransactionItem } from '@/types';

export type PaymentMethodType = 'cash' | 'qris' | 'bank_transfer' | 'edc' | 'ewallet' | 'card' | 'transfer';

export interface CreateTransactionItemRequest {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;   // backend expects unitPrice, not price
  price?: number;      // alias for backward compat
  subtotal: number;
  discountAmount?: number;
  discount?: number;
  total?: number;
  notes?: string;
}

export interface CreateTransactionRequest {
  storeId: string;
  paymentMethod: PaymentMethodType;
  paymentMethods?: Array<{ method: PaymentMethodType; amount: number }>; // for split payment
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
  shiftId?: string;
  notes?: string;
  orderType?: string;
  tableId?: string;
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

  async getSalesReport(params: {
    storeId?: string;
    startDate: string;
    endDate: string;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    const response = await apiClient.get('/transactions/report', { params });
    return response.data;
  },

  async getByInvoiceNumber(invoiceNumber: string): Promise<Transaction> {
    const response = await apiClient.get<Transaction>(`/transactions/invoice/${invoiceNumber}`);
    return response.data;
  },
};

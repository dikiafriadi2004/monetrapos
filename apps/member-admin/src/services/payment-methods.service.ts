import apiClient from '@/lib/api-client';

export enum PaymentMethodType {
  CASH = 'cash',
  CARD = 'card',
  EWALLET = 'ewallet',
  BANK_TRANSFER = 'bank_transfer',
  QRIS = 'qris',
  OTHER = 'other',
}

export interface PaymentMethod {
  id: string;
  companyId: string;
  name: string;
  code: string;
  type: PaymentMethodType;
  iconUrl?: string;   // QRIS image URL stored here
  color?: string;
  description?: string;
  isActive: boolean;
  requiresReference: boolean;
  sortOrder: number;
  accountCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentMethodDto {
  name: string;
  code: string;
  type: PaymentMethodType;
  color?: string;
  description?: string;
  requiresReference?: boolean;
  sortOrder?: number;
  accountCode?: string;
}

export interface UpdatePaymentMethodDto {
  name?: string;
  color?: string;
  description?: string;
  requiresReference?: boolean;
  sortOrder?: number;
  accountCode?: string;
}

class PaymentMethodsService {
  async getAll(): Promise<PaymentMethod[]> {
    const res = await apiClient.get('/payment-methods');
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  }

  async getActive(): Promise<PaymentMethod[]> {
    const all = await this.getAll();
    return all.filter(m => m.isActive);
  }

  async getById(id: string): Promise<PaymentMethod> {
    const res = await apiClient.get(`/payment-methods/${id}`);
    return res.data;
  }

  async create(data: CreatePaymentMethodDto): Promise<PaymentMethod> {
    const res = await apiClient.post('/payment-methods', data);
    return res.data;
  }

  async update(id: string, data: UpdatePaymentMethodDto): Promise<PaymentMethod> {
    // Backend uses PATCH, not PUT
    const res = await apiClient.patch(`/payment-methods/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/payment-methods/${id}`);
  }

  async toggle(id: string): Promise<PaymentMethod> {
    // Backend uses PATCH /payment-methods/:id/toggle
    const res = await apiClient.patch(`/payment-methods/${id}/toggle`);
    return res.data;
  }
}

export const paymentMethodsService = new PaymentMethodsService();

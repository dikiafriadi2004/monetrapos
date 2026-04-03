import apiClient from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import {
  PaymentMethod,
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from '@/types/payment-method.types';

export const paymentMethodService = {
  /**
   * Get all payment methods for current company
   */
  async getAll(): Promise<PaymentMethod[]> {
    const response = await apiClient.get(API_ENDPOINTS.PAYMENT_METHODS.BASE);
    return response.data;
  },

  /**
   * Get active payment methods only
   */
  async getActive(): Promise<PaymentMethod[]> {
    const methods = await this.getAll();
    return methods.filter((m) => m.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  /**
   * Create a new payment method
   */
  async create(data: CreatePaymentMethodDto): Promise<PaymentMethod> {
    const response = await apiClient.post(API_ENDPOINTS.PAYMENT_METHODS.BASE, data);
    return response.data;
  },

  /**
   * Update a payment method
   */
  async update(id: string, data: UpdatePaymentMethodDto): Promise<PaymentMethod> {
    const response = await apiClient.patch(API_ENDPOINTS.PAYMENT_METHODS.BY_ID(id), data);
    return response.data;
  },

  /**
   * Toggle payment method active status
   */
  async toggle(id: string): Promise<PaymentMethod> {
    const response = await apiClient.patch(API_ENDPOINTS.PAYMENT_METHODS.TOGGLE(id));
    return response.data;
  },

  /**
   * Delete a payment method
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.PAYMENT_METHODS.BY_ID(id));
  },
};

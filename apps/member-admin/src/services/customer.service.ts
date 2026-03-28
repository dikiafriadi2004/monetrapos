import api from '@/lib/api';
import { Customer } from '@/types';

export const customerService = {
  async getCustomers(storeId?: string): Promise<Customer[]> {
    const response = await api.get<Customer[]>('/customers', {
      params: { storeId },
    });
    return response.data;
  },

  async searchCustomer(phone: string): Promise<Customer | null> {
    try {
      const customers = await this.getCustomers();
      return customers.find(c => c.phone === phone) || null;
    } catch (error) {
      return null;
    }
  },

  async addPoints(customerId: string, points: number, reason: string, transactionId?: string) {
    const response = await api.post('/customers/loyalty/add-points', {
      customerId,
      points,
      reason,
      transactionId,
    });
    return response.data;
  },

  async redeemPoints(customerId: string, points: number, transactionId: string) {
    const response = await api.post('/customers/loyalty/redeem-points', {
      customerId,
      points,
      transactionId,
    });
    return response.data;
  },

  async getPointsValue(points: number): Promise<number> {
    const response = await api.get(`/customers/loyalty/points-value/${points}`);
    return response.data.value;
  },
};

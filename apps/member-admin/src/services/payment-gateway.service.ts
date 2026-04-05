import axios from 'axios';
import apiClient from '@/lib/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

export interface PaymentGateway {
  gateway: 'xendit';
  name: string;
  enabled: boolean;
}

export interface PaymentGatewayPreference {
  gateway: 'xendit';
  available: PaymentGateway[];
}

class PaymentGatewayService {
  async getAvailableGateways(): Promise<{ gateways: PaymentGateway[] }> {
    const response = await axios.get(`${API_URL}/payment-gateway/available`);
    return response.data;
  }

  async getPreference(): Promise<PaymentGatewayPreference> {
    const res = await apiClient.get('/payment-gateway/preference');
    return res.data;
  }

  async setPreference(gateway: 'xendit'): Promise<{
    success: boolean;
    message: string;
    gateway: string;
  }> {
    const res = await apiClient.patch('/payment-gateway/preference', { gateway });
    return res.data;
  }
}

export const paymentGatewayService = new PaymentGatewayService();

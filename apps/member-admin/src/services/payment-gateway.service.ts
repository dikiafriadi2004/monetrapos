import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

export interface PaymentGateway {
  gateway: 'midtrans' | 'xendit';
  name: string;
  enabled: boolean;
}

export interface PaymentGatewayPreference {
  gateway: 'midtrans' | 'xendit';
  available: PaymentGateway[];
}

class PaymentGatewayService {
  private getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  /**
   * Get available payment gateways
   */
  async getAvailableGateways(): Promise<{ gateways: PaymentGateway[] }> {
    const response = await axios.get(
      `${API_URL}/payment-gateway/available`,
    );
    return response.data;
  }

  /**
   * Get current payment gateway preference
   */
  async getPreference(): Promise<PaymentGatewayPreference> {
    const response = await axios.get(
      `${API_URL}/payment-gateway/preference`,
      this.getAuthHeader(),
    );
    return response.data;
  }

  /**
   * Set payment gateway preference
   */
  async setPreference(gateway: 'midtrans' | 'xendit'): Promise<{
    success: boolean;
    message: string;
    gateway: string;
  }> {
    const response = await axios.put(
      `${API_URL}/payment-gateway/preference`,
      { gateway },
      this.getAuthHeader(),
    );
    return response.data;
  }
}

export const paymentGatewayService = new PaymentGatewayService();

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

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
  iconUrl?: string;
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
  private getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  /**
   * Get all payment methods
   */
  async getAll(): Promise<PaymentMethod[]> {
    const response = await axios.get(
      `${API_URL}/payment-methods`,
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Get active payment methods only
   */
  async getActive(): Promise<PaymentMethod[]> {
    const response = await axios.get(
      `${API_URL}/payment-methods?active=true`,
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Get payment method by ID
   */
  async getById(id: string): Promise<PaymentMethod> {
    const response = await axios.get(
      `${API_URL}/payment-methods/${id}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Create payment method
   */
  async create(data: CreatePaymentMethodDto): Promise<PaymentMethod> {
    const response = await axios.post(
      `${API_URL}/payment-methods`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Update payment method
   */
  async update(id: string, data: UpdatePaymentMethodDto): Promise<PaymentMethod> {
    const response = await axios.put(
      `${API_URL}/payment-methods/${id}`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Delete payment method
   */
  async delete(id: string): Promise<void> {
    await axios.delete(
      `${API_URL}/payment-methods/${id}`,
      this.getAuthHeader()
    );
  }

  /**
   * Toggle payment method active status
   */
  async toggle(id: string): Promise<PaymentMethod> {
    const response = await axios.put(
      `${API_URL}/payment-methods/${id}/toggle`,
      {},
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Upload icon/QRIS image
   */
  async uploadIcon(id: string, file: File): Promise<{ iconUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('access_token');
    const response = await axios.post(
      `${API_URL}/payment-methods/${id}/upload-icon`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * Update sort order
   */
  async updateSortOrder(items: Array<{ id: string; sortOrder: number }>): Promise<void> {
    await axios.put(
      `${API_URL}/payment-methods/sort-order`,
      { items },
      this.getAuthHeader()
    );
  }
}

export const paymentMethodsService = new PaymentMethodsService();

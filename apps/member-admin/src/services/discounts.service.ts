import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  BUY_X_GET_Y = 'buy_x_get_y',
}

export interface Discount {
  id: string;
  companyId: string;
  storeId?: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  value: number;
  promoCode?: string;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscountDto {
  storeId?: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  value: number;
  promoCode?: string;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
}

export interface UpdateDiscountDto {
  name?: string;
  description?: string;
  value?: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  usageLimit?: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
}

class DiscountsService {
  private getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  async getAll(params?: {
    storeId?: string;
    isActive?: boolean;
  }): Promise<Discount[]> {
    const queryParams = new URLSearchParams();
    if (params?.storeId) queryParams.append('store_id', params.storeId);
    if (params?.isActive !== undefined) queryParams.append('is_active', String(params.isActive));

    const response = await axios.get(
      `${API_URL}/discounts?${queryParams.toString()}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async getById(id: string): Promise<Discount> {
    const response = await axios.get(
      `${API_URL}/discounts/${id}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async create(data: CreateDiscountDto): Promise<Discount> {
    const response = await axios.post(
      `${API_URL}/discounts`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  async update(id: string, data: UpdateDiscountDto): Promise<Discount> {
    const response = await axios.patch(
      `${API_URL}/discounts/${id}`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await axios.delete(
      `${API_URL}/discounts/${id}`,
      this.getAuthHeader()
    );
  }

  async getUsageStats(id: string): Promise<any> {
    const response = await axios.get(
      `${API_URL}/discounts/${id}/stats`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async generatePromoCode(prefix?: string, length: number = 8): Promise<string> {
    const response = await axios.post(
      `${API_URL}/discounts/generate-code`,
      { prefix, length },
      this.getAuthHeader()
    );
    return response.data.promoCode;
  }

  async validatePromoCode(promoCode: string, totalAmount: number): Promise<any> {
    const response = await axios.post(
      `${API_URL}/discounts/validate`,
      { promoCode, totalAmount },
      this.getAuthHeader()
    );
    return response.data;
  }
}

export const discountsService = new DiscountsService();

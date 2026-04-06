import apiClient from '@/lib/api-client';

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
  async getAll(params?: { storeId?: string; isActive?: boolean }): Promise<Discount[]> {
    const q = new URLSearchParams();
    if (params?.storeId) q.append('store_id', params.storeId);
    if (params?.isActive !== undefined) q.append('is_active', String(params.isActive));
    const res = await apiClient.get(`/discounts?${q.toString()}`);
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  }

  async getById(id: string): Promise<Discount> {
    const res = await apiClient.get(`/discounts/${id}`);
    return res.data;
  }

  async create(data: CreateDiscountDto): Promise<Discount> {
    const res = await apiClient.post('/discounts', data);
    return res.data;
  }

  async update(id: string, data: UpdateDiscountDto): Promise<Discount> {
    const res = await apiClient.patch(`/discounts/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/discounts/${id}`);
  }

  async getUsageStats(id: string): Promise<any> {
    const res = await apiClient.get(`/discounts/${id}/stats`);
    return res.data;
  }

  async generatePromoCode(prefix?: string, length: number = 8): Promise<string> {
    const res = await apiClient.post('/discounts/generate-code', { prefix, length });
    return res.data.promoCode;
  }

  async validatePromoCode(promoCode: string, totalAmount: number): Promise<any> {
    const res = await apiClient.post('/discounts/validate', { promoCode, transactionTotal: totalAmount });
    return res.data;
  }
}

export const discountsService = new DiscountsService();

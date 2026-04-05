import apiClient from '@/lib/api-client';
import { Product, Category } from '@/types';

// Helper to get companyId from stored user
function getCompanyId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.companyId || null;
  } catch {
    return null;
  }
}

export const productService = {
  async getProducts(storeId: string, params?: {
    page?: number; limit?: number; search?: string;
    categoryId?: string; isActive?: boolean; lowStock?: boolean;
  }): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const response = await apiClient.get('/products', {
      params: { storeId, ...params },
    });
    // Backend returns { data, total, page, limit }
    return response.data;
  },

  async getProduct(id: string): Promise<Product> {
    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  async searchProducts(storeId: string, query: string): Promise<Product[]> {
    const response = await apiClient.get('/products', {
      params: { storeId, search: query, limit: 50 },
    });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.data || []);
  },

  async getProductByBarcode(storeId: string, barcode: string): Promise<Product> {
    const response = await apiClient.get<Product>(`/products/barcode/${barcode}`, {
      params: { storeId },
    });
    return response.data;
  },

  async getCategories(companyId: string, storeId?: string): Promise<Category[]> {
    const response = await apiClient.get('/categories', {
      params: { companyId, storeId },
    });
    return Array.isArray(response.data) ? response.data : (response.data?.data || []);
  },

  async getCategoryTree(companyId: string, storeId?: string): Promise<Category[]> {
    const response = await apiClient.get('/categories/tree', {
      params: { companyId, storeId },
    });
    return Array.isArray(response.data) ? response.data : (response.data?.data || []);
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const response = await apiClient.post<Product>('/products', data);
    return response.data;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const response = await apiClient.patch<Product>(`/products/${id}`, data);
    return response.data;
  },

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },

  async uploadImage(id: string, file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/products/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async bulkUpdatePrices(storeId: string, updates: Array<{ id: string; price: number; cost?: number }>) {
    const response = await apiClient.post('/products/bulk/prices', { storeId, updates });
    return response.data;
  },

  async bulkUpdateStock(storeId: string, updates: Array<{ id: string; stock: number }>) {
    const response = await apiClient.post('/products/bulk/stock', { storeId, updates });
    return response.data;
  },

  async bulkActivate(storeId: string, productIds: string[], isActive: boolean) {
    const response = await apiClient.post('/products/bulk/activate', { storeId, productIds, isActive });
    return response.data;
  },
};

import api from '@/lib/api';
import { Product, Category, PaginatedResponse } from '@/types';

export const productService = {
  async getProducts(storeId: string): Promise<Product[]> {
    const response = await api.get<Product[]>('/products', {
      params: { storeId },
    });
    return response.data;
  },

  async getProduct(id: string): Promise<Product> {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  },

  async searchProducts(storeId: string, query: string): Promise<Product[]> {
    const response = await api.get<Product[]>('/products', {
      params: { storeId, search: query },
    });
    return response.data;
  },

  async getProductByBarcode(storeId: string, barcode: string): Promise<Product> {
    const response = await api.get<Product>('/products/barcode/' + barcode, {
      params: { storeId },
    });
    return response.data;
  },

  async getCategories(storeId: string): Promise<Category[]> {
    const response = await api.get<Category[]>('/categories', {
      params: { storeId },
    });
    return response.data;
  },
};

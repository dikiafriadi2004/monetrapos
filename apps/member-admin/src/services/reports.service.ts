import apiClient, { unwrap } from '@/lib/api-client';

export interface SalesReportParams {
  startDate: string;
  endDate: string;
  storeId?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface ProductPerformanceParams {
  startDate: string;
  endDate: string;
  storeId?: string;
  categoryId?: string;
  limit?: number;
}

export interface InventoryReportParams {
  storeId?: string;
  categoryId?: string;
  lowStockOnly?: boolean;
}

export const reportsService = {
  getSalesReport: async (params: SalesReportParams): Promise<unknown> => {
    const query = new URLSearchParams();
    (Object.entries(params) as [string, string | undefined][])
      .forEach(([k, v]) => { if (v !== undefined) query.set(k, String(v)); });
    return unwrap(await apiClient.get(`/reports/sales?${query.toString()}`));
  },

  getProductPerformance: async (params: ProductPerformanceParams): Promise<unknown> => {
    const query = new URLSearchParams();
    (Object.entries(params) as [string, string | number | boolean | undefined][])
      .forEach(([k, v]) => { if (v !== undefined) query.set(k, String(v)); });
    return unwrap(await apiClient.get(`/reports/products?${query.toString()}`));
  },

  getInventoryReport: async (params: InventoryReportParams): Promise<unknown> => {
    const query = new URLSearchParams();
    (Object.entries(params) as [string, string | boolean | undefined][])
      .forEach(([k, v]) => { if (v !== undefined) query.set(k, String(v)); });
    return unwrap(await apiClient.get(`/reports/inventory?${query.toString()}`));
  },

  exportSalesCsv: async (params: SalesReportParams): Promise<Blob> => {
    const query = new URLSearchParams();
    (Object.entries(params) as [string, string | undefined][])
      .forEach(([k, v]) => { if (v !== undefined) query.set(k, String(v)); });
    const res = await apiClient.get(`/reports/sales/export?${query.toString()}`, { responseType: 'blob' });
    return unwrap<Blob>(res);
  },

  exportInventoryCsv: async (params: InventoryReportParams): Promise<Blob> => {
    const query = new URLSearchParams();
    (Object.entries(params) as [string, string | boolean | undefined][])
      .forEach(([k, v]) => { if (v !== undefined) query.set(k, String(v)); });
    const res = await apiClient.get(`/reports/inventory/export?${query.toString()}`, { responseType: 'blob' });
    return unwrap<Blob>(res);
  },
};

import apiClient, { unwrap } from '@/lib/api-client';

export interface Store {
  id: string;
  name: string;
  code?: string;
  type: 'retail' | 'fnb' | 'warehouse' | 'service';
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  manager?: { id: string; name: string; email: string };
  managerId?: string;
  openingHours?: Record<string, { open: string; close: string }>;
  receiptHeader?: string;
  receiptFooter?: string;
  receiptLogoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreStats {
  totalEmployees: number;
  totalProducts: number;
  todaySales: number;
  monthSales: number;
}

export interface PaginatedStores {
  data: Store[];
  meta?: { totalPages: number; total: number };
}

export interface CreateStoreDto {
  name: string;
  code?: string;
  type: Store['type'];
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  managerId?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  receiptLogoUrl?: string;
  openingHours?: Record<string, { open: string; close: string }>;
}

export type UpdateStoreDto = Partial<CreateStoreDto>;

export const storesService = {
  getAll: async (params?: {
    page?: number; limit?: number; search?: string; type?: string; isActive?: string;
  }): Promise<PaginatedStores | Store[]> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.type) query.set('type', params.type);
    if (params?.isActive) query.set('isActive', params.isActive);
    return unwrap<PaginatedStores | Store[]>(await apiClient.get(`/stores?${query.toString()}`));
  },

  getById: async (id: string): Promise<Store> =>
    unwrap<Store>(await apiClient.get(`/stores/${id}`)),

  create: async (dto: CreateStoreDto): Promise<Store> =>
    unwrap<Store>(await apiClient.post('/stores', dto)),

  update: async (id: string, dto: UpdateStoreDto): Promise<Store> =>
    unwrap<Store>(await apiClient.patch(`/stores/${id}`, dto)),

  delete: async (id: string): Promise<void> =>
    unwrap<void>(await apiClient.delete(`/stores/${id}`)),

  getStats: async (id: string): Promise<StoreStats> => {
    const res = await apiClient.get(`/stores/${id}/stats`);
    const data = unwrap<{ stats?: StoreStats } | StoreStats>(res);
    return (data as { stats?: StoreStats }).stats ?? (data as StoreStats);
  },

  assignManager: async (id: string, managerId: string): Promise<Store> =>
    unwrap<Store>(await apiClient.post(`/stores/${id}/assign-manager`, { managerId })),

  removeManager: async (id: string): Promise<void> =>
    unwrap<void>(await apiClient.delete(`/stores/${id}/manager`)),

  toggleStatus: async (id: string, isActive: boolean): Promise<Store> =>
    unwrap<Store>(await apiClient.patch(`/stores/${id}`, { isActive })),
};

import apiClient, { unwrap } from '@/lib/api-client';

export interface Tax {
  id: string;
  name: string;
  rate: number;
  type: string;
  isActive: boolean;
  storeId?: string;
}

export interface CreateTaxDto {
  name: string;
  rate: number;
  type?: string;
  isActive?: boolean;
  storeId?: string;
}

export const taxesService = {
  getAll: async (storeId?: string): Promise<Tax[]> => {
    const params = storeId ? { storeId } : {};
    const res = await apiClient.get('/taxes', { params });
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },

  create: async (dto: CreateTaxDto): Promise<Tax> =>
    unwrap<Tax>(await apiClient.post('/taxes', dto)),

  update: async (id: string, dto: Partial<CreateTaxDto>): Promise<Tax> =>
    unwrap<Tax>(await apiClient.patch(`/taxes/${id}`, dto)),

  delete: async (id: string): Promise<void> =>
    unwrap<void>(await apiClient.delete(`/taxes/${id}`)),

  toggle: async (id: string, isActive: boolean): Promise<Tax> =>
    unwrap<Tax>(await apiClient.patch(`/taxes/${id}`, { isActive })),
};

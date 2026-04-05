import apiClient from '@/lib/api-client';

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierDto {
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
}

export interface UpdateSupplierDto {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  isActive?: boolean;
}

class SuppliersService {
  async getAll(params?: {
    search?: string;
    active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: Supplier[]; total: number; page: number; limit: number }> {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.active !== undefined) q.append('is_active', String(params.active));
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    const res = await apiClient.get(`/suppliers?${q.toString()}`);
    const data = res.data;
    // Backend may return array or paginated object
    if (Array.isArray(data)) return { data, total: data.length, page: 1, limit: data.length };
    return data;
  }

  async getById(id: string): Promise<Supplier> {
    const res = await apiClient.get(`/suppliers/${id}`);
    return res.data;
  }

  async create(data: CreateSupplierDto): Promise<Supplier> {
    const res = await apiClient.post('/suppliers', data);
    return res.data;
  }

  async update(id: string, data: UpdateSupplierDto): Promise<Supplier> {
    // Backend uses PATCH, not PUT
    const res = await apiClient.patch(`/suppliers/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/suppliers/${id}`);
  }

  // Backend has POST /suppliers/:id/activate (no toggle endpoint)
  async activate(id: string): Promise<Supplier> {
    const res = await apiClient.post(`/suppliers/${id}/activate`);
    return res.data;
  }

  // Deactivate by patching isActive = false
  async deactivate(id: string): Promise<Supplier> {
    const res = await apiClient.patch(`/suppliers/${id}`, { is_active: false });
    return res.data;
  }
}

export const suppliersService = new SuppliersService();

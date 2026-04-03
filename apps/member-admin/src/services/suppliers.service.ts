import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

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
  private getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  /**
   * Get all suppliers
   */
  async getAll(params?: {
    search?: string;
    active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: Supplier[]; total: number; page: number; limit: number }> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.active !== undefined) queryParams.append('active', String(params.active));
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    const response = await axios.get(
      `${API_URL}/suppliers?${queryParams.toString()}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Get supplier by ID
   */
  async getById(id: string): Promise<Supplier> {
    const response = await axios.get(
      `${API_URL}/suppliers/${id}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Create supplier
   */
  async create(data: CreateSupplierDto): Promise<Supplier> {
    const response = await axios.post(
      `${API_URL}/suppliers`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Update supplier
   */
  async update(id: string, data: UpdateSupplierDto): Promise<Supplier> {
    const response = await axios.put(
      `${API_URL}/suppliers/${id}`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Delete supplier
   */
  async delete(id: string): Promise<void> {
    await axios.delete(
      `${API_URL}/suppliers/${id}`,
      this.getAuthHeader()
    );
  }

  /**
   * Toggle supplier active status
   */
  async toggleActive(id: string): Promise<Supplier> {
    const response = await axios.put(
      `${API_URL}/suppliers/${id}/toggle`,
      {},
      this.getAuthHeader()
    );
    return response.data;
  }
}

export const suppliersService = new SuppliersService();

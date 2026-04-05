import apiClient, { unwrap } from '@/lib/api-client';

export interface Customer {
  id: string;
  customerNumber: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  loyaltyPoints: number;
  loyaltyTier: 'regular' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  totalOrders: number;
  dateOfBirth?: string;
  gender?: string;
  notes?: string;
  firstPurchaseAt?: string;
  lastPurchaseAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCustomers {
  data: Customer[];
  meta?: { totalPages: number; total: number; page: number; limit: number };
}

export interface CreateCustomerDto {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  storeId: string;
}

export type UpdateCustomerDto = Partial<Omit<CreateCustomerDto, 'storeId'>>;

export interface LoyaltyPointsDto {
  customerId: string;
  points: number;
  amount?: number;
  description?: string;
}

export interface PurchaseHistoryItem {
  id: string;
  transactionNumber: string;
  total: number;
  createdAt: string;
}

export interface LoyaltyHistoryItem {
  id: string;
  action: string;
  points: number;
  description?: string;
  createdAt: string;
}

export const customersService = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; storeId?: string; isActive?: boolean }): Promise<PaginatedCustomers | Customer[]> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.storeId) query.set('storeId', params.storeId);
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
    return unwrap<PaginatedCustomers | Customer[]>(await apiClient.get(`/customers?${query.toString()}`));
  },

  getById: async (id: string): Promise<Customer> =>
    unwrap<Customer>(await apiClient.get(`/customers/${id}`)),

  create: async (dto: CreateCustomerDto): Promise<Customer> =>
    unwrap<Customer>(await apiClient.post('/customers', dto)),

  update: async (id: string, dto: UpdateCustomerDto): Promise<Customer> =>
    unwrap<Customer>(await apiClient.patch(`/customers/${id}`, dto)),

  delete: async (id: string): Promise<void> =>
    unwrap<void>(await apiClient.delete(`/customers/${id}`)),

  getPurchaseHistory: async (id: string, limit = 20): Promise<PurchaseHistoryItem[]> =>
    unwrap<PurchaseHistoryItem[]>(await apiClient.get(`/customers/${id}/purchase-history?limit=${limit}`)),

  getLoyaltyHistory: async (id: string, limit = 20): Promise<LoyaltyHistoryItem[]> =>
    unwrap<LoyaltyHistoryItem[]>(await apiClient.get(`/customers/${id}/loyalty-history?limit=${limit}`)),

  addLoyaltyPoints: async (dto: LoyaltyPointsDto): Promise<Customer> =>
    unwrap<Customer>(await apiClient.post('/customers/loyalty/add-points', dto)),

  redeemLoyaltyPoints: async (dto: LoyaltyPointsDto): Promise<Customer> =>
    unwrap<Customer>(await apiClient.post('/customers/loyalty/redeem-points', dto)),
};

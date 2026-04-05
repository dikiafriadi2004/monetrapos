import apiClient from '@/lib/api-client';

export enum StockOpnameStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface StockOpnameItem {
  id: string;
  productId: string;
  productName?: string;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
  notes?: string;
}

export interface StockOpname {
  id: string;
  companyId: string;
  storeId: string;
  storeName?: string;
  opnameNumber: string;
  opnameDate: string;
  status: StockOpnameStatus;
  notes?: string;
  items: StockOpnameItem[];
  createdBy: string;
  completedBy?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStockOpnameDto {
  storeId: string;
  opnameDate: string;
  notes?: string;
  items: {
    productId: string;
    systemQuantity: number;
    physicalQuantity: number;
    notes?: string;
  }[];
}

export interface UpdateStockOpnameDto {
  opnameDate?: string;
  notes?: string;
  items?: {
    productId: string;
    systemQuantity: number;
    physicalQuantity: number;
    notes?: string;
  }[];
}

class StockOpnameService {
  async getAll(params?: {
    status?: StockOpnameStatus;
    storeId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<StockOpname[]> {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.storeId) q.append('store_id', params.storeId);
    if (params?.fromDate) q.append('from_date', params.fromDate);
    if (params?.toDate) q.append('to_date', params.toDate);
    const res = await apiClient.get(`/stock-opnames?${q.toString()}`);
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  }

  async getById(id: string): Promise<StockOpname> {
    const res = await apiClient.get(`/stock-opnames/${id}`);
    return res.data;
  }

  async create(data: CreateStockOpnameDto): Promise<StockOpname> {
    const res = await apiClient.post('/stock-opnames', data);
    return res.data;
  }

  async update(id: string, data: UpdateStockOpnameDto): Promise<StockOpname> {
    const res = await apiClient.patch(`/stock-opnames/${id}`, data);
    return res.data;
  }

  async complete(id: string, applyAdjustments: boolean = true): Promise<StockOpname> {
    const res = await apiClient.post(`/stock-opnames/${id}/complete`, { apply_adjustments: applyAdjustments });
    return res.data;
  }

  async cancel(id: string): Promise<StockOpname> {
    const res = await apiClient.post(`/stock-opnames/${id}/cancel`);
    return res.data;
  }

  async getDiscrepancyReport(id: string): Promise<any> {
    const res = await apiClient.get(`/stock-opnames/${id}/discrepancy-report`);
    return res.data;
  }
}

export const stockOpnameService = new StockOpnameService();

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
  opnameDate?: string;
  notes?: string;
  items: {
    productId: string;
    productName?: string;
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
  private mapOpname(raw: any): StockOpname {
    return {
      id: raw.id,
      companyId: raw.company_id || raw.companyId,
      storeId: raw.store_id || raw.storeId,
      storeName: raw.store?.name || raw.storeName,
      opnameNumber: raw.opname_number || raw.opnameNumber,
      opnameDate: raw.opname_date || raw.opnameDate,
      status: raw.status,
      notes: raw.notes,
      items: (raw.items || []).map((i: any) => ({
        id: i.id,
        productId: i.product_id || i.productId,
        productName: i.product_name || i.productName,
        systemQuantity: Number(i.system_quantity ?? i.systemQuantity ?? 0),
        physicalQuantity: Number(i.physical_quantity ?? i.physicalQuantity ?? 0),
        difference: Number(i.difference ?? 0),
        notes: i.notes,
      })),
      createdBy: raw.created_by || raw.createdBy,
      completedBy: raw.completed_by || raw.completedBy,
      completedAt: raw.completed_at || raw.completedAt,
      createdAt: raw.created_at || raw.createdAt,
      updatedAt: raw.updated_at || raw.updatedAt,
    };
  }

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
    const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    return data.map((d: any) => this.mapOpname(d));
  }

  async getById(id: string): Promise<StockOpname> {
    const res = await apiClient.get(`/stock-opnames/${id}`);
    return this.mapOpname(res.data);
  }

  async create(data: CreateStockOpnameDto): Promise<StockOpname> {
    // Backend expects snake_case fields
    const payload = {
      store_id: data.storeId,
      opname_date: data.opnameDate,
      notes: data.notes,
      items: (data.items || []).map((i: any) => ({
        product_id: i.productId,
        product_name: i.productName || '',
        system_quantity: i.systemQuantity,
        physical_quantity: i.physicalQuantity,
        notes: i.notes,
      })),
    };
    const res = await apiClient.post('/stock-opnames', payload);
    return this.mapOpname(res.data);
  }

  async update(id: string, data: UpdateStockOpnameDto): Promise<StockOpname> {
    const payload: any = {};
    if (data.opnameDate) payload.opname_date = data.opnameDate;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.items) {
      payload.items = data.items.map((i: any) => ({
        product_id: i.productId,
        product_name: i.productName || '',
        system_quantity: i.systemQuantity,
        physical_quantity: i.physicalQuantity,
        notes: i.notes,
      }));
    }
    const res = await apiClient.patch(`/stock-opnames/${id}`, payload);
    return this.mapOpname(res.data);
  }

  async complete(id: string, applyAdjustments: boolean = true): Promise<StockOpname> {
    const res = await apiClient.post(`/stock-opnames/${id}/complete`, { apply_adjustments: applyAdjustments });
    return this.mapOpname(res.data);
  }

  async cancel(id: string): Promise<StockOpname> {
    const res = await apiClient.post(`/stock-opnames/${id}/cancel`);
    return this.mapOpname(res.data);
  }

  async getDiscrepancyReport(id: string): Promise<any> {
    const res = await apiClient.get(`/stock-opnames/${id}/discrepancy-report`);
    return res.data;
  }
}

export const stockOpnameService = new StockOpnameService();

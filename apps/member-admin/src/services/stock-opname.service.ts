import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

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
  private getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  async getAll(params?: {
    status?: StockOpnameStatus;
    storeId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<StockOpname[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.storeId) queryParams.append('store_id', params.storeId);
    if (params?.fromDate) queryParams.append('from_date', params.fromDate);
    if (params?.toDate) queryParams.append('to_date', params.toDate);

    const response = await axios.get(
      `${API_URL}/stock-opnames?${queryParams.toString()}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async getById(id: string): Promise<StockOpname> {
    const response = await axios.get(
      `${API_URL}/stock-opnames/${id}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async create(data: CreateStockOpnameDto): Promise<StockOpname> {
    const response = await axios.post(
      `${API_URL}/stock-opnames`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  async update(id: string, data: UpdateStockOpnameDto): Promise<StockOpname> {
    const response = await axios.patch(
      `${API_URL}/stock-opnames/${id}`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  async complete(id: string, applyAdjustments: boolean = true): Promise<StockOpname> {
    const response = await axios.post(
      `${API_URL}/stock-opnames/${id}/complete`,
      { apply_adjustments: applyAdjustments },
      this.getAuthHeader()
    );
    return response.data;
  }

  async cancel(id: string): Promise<StockOpname> {
    const response = await axios.post(
      `${API_URL}/stock-opnames/${id}/cancel`,
      {},
      this.getAuthHeader()
    );
    return response.data;
  }

  async getDiscrepancyReport(id: string): Promise<any> {
    const response = await axios.get(
      `${API_URL}/stock-opnames/${id}/discrepancy-report`,
      this.getAuthHeader()
    );
    return response.data;
  }
}

export const stockOpnameService = new StockOpnameService();

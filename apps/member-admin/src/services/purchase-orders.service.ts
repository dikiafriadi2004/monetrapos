import apiClient from '@/lib/api-client';

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity?: number;
}

export interface PurchaseOrder {
  id: string;
  companyId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  storeId: string;
  storeName: string;
  orderDate: string;
  expectedDate?: string;
  receivedDate?: string;
  status: PurchaseOrderStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderDto {
  supplierId: string;
  storeId: string;
  orderDate: string;
  expectedDate?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface UpdatePurchaseOrderDto {
  supplierId?: string;
  storeId?: string;
  orderDate?: string;
  expectedDate?: string;
  notes?: string;
  items?: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface ReceivePurchaseOrderDto {
  receivedDate: string;
  items: Array<{
    productId: string;
    receivedQuantity: number;
  }>;
}

class PurchaseOrdersService {
  async getAll(params?: {
    status?: PurchaseOrderStatus;
    supplierId?: string;
    storeId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: PurchaseOrder[]; total: number; page: number; limit: number }> {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    // Backend uses snake_case query params
    if (params?.supplierId) q.append('supplier_id', params.supplierId);
    if (params?.storeId) q.append('store_id', params.storeId);
    if (params?.startDate) q.append('from_date', params.startDate);
    if (params?.endDate) q.append('to_date', params.endDate);
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    const res = await apiClient.get(`/purchase-orders?${q.toString()}`);
    const data = res.data;
    if (Array.isArray(data)) return { data, total: data.length, page: 1, limit: data.length };
    return data;
  }

  async getById(id: string): Promise<PurchaseOrder> {
    const res = await apiClient.get(`/purchase-orders/${id}`);
    return res.data;
  }

  async create(data: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const res = await apiClient.post('/purchase-orders', data);
    return res.data;
  }

  async update(id: string, data: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    // Backend uses PATCH, not PUT
    const res = await apiClient.patch(`/purchase-orders/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/purchase-orders/${id}`);
  }

  async updateStatus(id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder> {
    // Backend uses PATCH, not PUT
    const res = await apiClient.patch(`/purchase-orders/${id}/status`, { status });
    return res.data;
  }

  async receive(id: string, data: ReceivePurchaseOrderDto): Promise<PurchaseOrder> {
    const res = await apiClient.post(`/purchase-orders/${id}/receive`, data);
    return res.data;
  }

  async cancel(id: string): Promise<PurchaseOrder> {
    const res = await apiClient.post(`/purchase-orders/${id}/cancel`);
    return res.data;
  }
}

export const purchaseOrdersService = new PurchaseOrdersService();

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
  orderDate?: string;
  expectedDate?: string;
  notes?: string;
  items: Array<{
    productId: string;
    productName?: string;
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
    productName?: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface ReceivePurchaseOrderDto {
  receivedDate?: string;
  notes?: string;
  items: Array<{
    itemId: string;       // backend: item_id (PurchaseOrderItem.id)
    receivedQuantity: number;
    notes?: string;
  }>;
}

class PurchaseOrdersService {
  private mapOrder(raw: any): PurchaseOrder {
    return {
      id: raw.id,
      companyId: raw.company_id || raw.companyId,
      poNumber: raw.po_number || raw.poNumber,
      supplierId: raw.supplier_id || raw.supplierId,
      supplierName: raw.supplier?.name || raw.supplierName || '',
      storeId: raw.store_id || raw.storeId,
      storeName: raw.store?.name || raw.storeName || '',
      orderDate: raw.order_date || raw.orderDate,
      expectedDate: raw.expected_date || raw.expectedDate,
      receivedDate: raw.received_date || raw.receivedDate,
      status: raw.status,
      subtotal: Number(raw.subtotal || 0),
      tax: Number(raw.tax_amount || raw.tax || 0),
      discount: Number(raw.discount_amount || raw.discount || 0),
      total: Number(raw.total || 0),
      notes: raw.notes,
      items: (raw.items || []).map((i: any) => ({
        id: i.id,
        productId: i.product_id || i.productId,
        productName: i.product_name || i.productName || i.product?.name || '',
        quantity: Number(i.quantity || 0),
        unitPrice: Number(i.unit_price || i.unitPrice || 0),
        totalPrice: Number(i.total_price || i.totalPrice || 0),
        receivedQuantity: i.received_quantity ?? i.receivedQuantity,
      })),
      createdAt: raw.created_at || raw.createdAt,
      updatedAt: raw.updated_at || raw.updatedAt,
    };
  }

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
    const list: any[] = Array.isArray(data) ? data : (data?.data || []);
    const mapped = list.map((d: any) => this.mapOrder(d));
    if (Array.isArray(data)) return { data: mapped, total: mapped.length, page: 1, limit: mapped.length };
    return { data: mapped, total: data?.total || mapped.length, page: data?.page || 1, limit: data?.limit || mapped.length };
  }

  async getById(id: string): Promise<PurchaseOrder> {
    const res = await apiClient.get(`/purchase-orders/${id}`);
    return this.mapOrder(res.data);
  }

  async create(data: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    // Backend expects snake_case
    const payload = {
      supplier_id: data.supplierId,
      store_id: data.storeId,
      order_date: data.orderDate,
      expected_delivery_date: data.expectedDate,
      notes: data.notes,
      items: data.items.map(i => ({
        product_id: i.productId,
        product_name: i.productName || '',
        quantity_ordered: i.quantity,
        unit_price: i.unitPrice,
      })),
    };
    const res = await apiClient.post('/purchase-orders', payload);
    return this.mapOrder(res.data);
  }

  async update(id: string, data: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    const payload: any = {};
    if (data.supplierId) payload.supplier_id = data.supplierId;
    if (data.storeId) payload.store_id = data.storeId;
    if (data.orderDate) payload.order_date = data.orderDate;
    if (data.expectedDate !== undefined) payload.expected_delivery_date = data.expectedDate;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.items) {
      payload.items = data.items.map(i => ({
        product_id: i.productId,
        product_name: i.productName || '',
        quantity_ordered: i.quantity,
        unit_price: i.unitPrice,
      }));
    }
    const res = await apiClient.patch(`/purchase-orders/${id}`, payload);
    return this.mapOrder(res.data);
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/purchase-orders/${id}`);
  }

  async updateStatus(id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder> {
    const res = await apiClient.patch(`/purchase-orders/${id}/status`, { status });
    return this.mapOrder(res.data);
  }

  async receive(id: string, data: ReceivePurchaseOrderDto): Promise<PurchaseOrder> {
    const payload = {
      notes: data.notes,
      items: data.items.map(i => ({
        item_id: i.itemId,
        quantity_received: i.receivedQuantity,
        notes: i.notes,
      })),
    };
    const res = await apiClient.post(`/purchase-orders/${id}/receive`, payload);
    return this.mapOrder(res.data);
  }

  async cancel(id: string): Promise<PurchaseOrder> {
    const res = await apiClient.post(`/purchase-orders/${id}/cancel`);
    return this.mapOrder(res.data);
  }
}

export const purchaseOrdersService = new PurchaseOrdersService();

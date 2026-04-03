import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

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
  private getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  /**
   * Get all purchase orders
   */
  async getAll(params?: {
    status?: PurchaseOrderStatus;
    supplierId?: string;
    storeId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: PurchaseOrder[]; total: number; page: number; limit: number }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
    if (params?.storeId) queryParams.append('storeId', params.storeId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    const response = await axios.get(
      `${API_URL}/purchase-orders?${queryParams.toString()}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Get purchase order by ID
   */
  async getById(id: string): Promise<PurchaseOrder> {
    const response = await axios.get(
      `${API_URL}/purchase-orders/${id}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Create purchase order
   */
  async create(data: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const response = await axios.post(
      `${API_URL}/purchase-orders`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Update purchase order
   */
  async update(id: string, data: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    const response = await axios.put(
      `${API_URL}/purchase-orders/${id}`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Delete purchase order
   */
  async delete(id: string): Promise<void> {
    await axios.delete(
      `${API_URL}/purchase-orders/${id}`,
      this.getAuthHeader()
    );
  }

  /**
   * Update purchase order status
   */
  async updateStatus(id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder> {
    const response = await axios.put(
      `${API_URL}/purchase-orders/${id}/status`,
      { status },
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Receive purchase order (update inventory)
   */
  async receive(id: string, data: ReceivePurchaseOrderDto): Promise<PurchaseOrder> {
    const response = await axios.post(
      `${API_URL}/purchase-orders/${id}/receive`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  /**
   * Cancel purchase order
   */
  async cancel(id: string): Promise<PurchaseOrder> {
    return this.updateStatus(id, PurchaseOrderStatus.CANCELLED);
  }
}

export const purchaseOrdersService = new PurchaseOrdersService();

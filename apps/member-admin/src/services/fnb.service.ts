import apiClient from '@/lib/api-client';

export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum OrderType {
  DINE_IN = 'dine-in',
  TAKEAWAY = 'takeaway',
  DELIVERY = 'delivery',
}

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  CLEANING = 'cleaning',
}

export interface FnbTable {
  id: string;
  companyId: string;
  storeId: string;
  tableNumber: string;
  tableName?: string;
  capacity: number;
  floor?: string;
  section?: string;
  status: TableStatus;
  currentOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FnbOrderItem {
  id: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
}

export interface FnbOrder {
  id: string;
  companyId: string;
  storeId: string;
  orderNumber: string;
  orderType: OrderType;
  tableId?: string;
  tableName?: string;
  customerId?: string;
  customerName?: string;
  status: OrderStatus;
  items: FnbOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Map snake_case backend response to camelCase frontend interface
function mapTable(raw: any): FnbTable {
  return {
    id: raw.id,
    companyId: raw.company_id,
    storeId: raw.store_id,
    tableNumber: raw.table_number,
    tableName: raw.table_name,
    capacity: raw.capacity,
    floor: raw.floor,
    section: raw.section,
    status: raw.status,
    currentOrderId: raw.current_transaction_id,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function mapOrder(raw: any): FnbOrder {
  const tx = raw.transaction;
  return {
    id: raw.id,
    companyId: raw.company_id,
    storeId: raw.store_id,
    orderNumber: raw.order_number,
    orderType: raw.order_type,
    tableId: raw.table_id,
    tableName: raw.table?.table_number || raw.table?.table_name,
    customerId: tx?.customer_id || tx?.customerId,
    customerName: tx?.customer_name || tx?.customerName,
    status: raw.status,
    items: (tx?.items || []).map((i: any) => ({
      id: i.id,
      productId: i.productId || i.product_id,
      productName: i.productName || i.product_name,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice || i.unit_price || 0),
      subtotal: Number(i.subtotal || 0),
      notes: i.notes,
    })),
    subtotal: Number(tx?.subtotal || 0),
    tax: Number(tx?.taxAmount || tx?.tax_amount || 0),
    total: Number(tx?.total || 0),
    notes: raw.notes,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

class FnbService {
  // Tables
  async getTables(storeId?: string): Promise<FnbTable[]> {
    const params = storeId ? `?store_id=${storeId}` : '';
    const res = await apiClient.get(`/fnb/tables${params}`);
    const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    return data.map(mapTable);
  }

  async createTable(data: {
    storeId: string;
    tableNumber: string;
    capacity: number;
    floor?: string;
  }): Promise<FnbTable> {
    const res = await apiClient.post('/fnb/tables', {
      store_id: data.storeId,
      table_number: data.tableNumber,
      capacity: data.capacity,
      floor: data.floor,
    });
    return mapTable(res.data);
  }

  async updateTable(id: string, data: {
    tableNumber?: string;
    capacity?: number;
    floor?: string;
    status?: TableStatus;
  }): Promise<FnbTable> {
    const res = await apiClient.patch(`/fnb/tables/${id}`, {
      table_number: data.tableNumber,
      capacity: data.capacity,
      floor: data.floor,
      status: data.status,
    });
    return mapTable(res.data);
  }

  async deleteTable(id: string): Promise<void> {
    await apiClient.delete(`/fnb/tables/${id}`);
  }

  // Orders
  async getOrders(params?: {
    storeId?: string;
    status?: OrderStatus;
    orderType?: OrderType;
  }): Promise<FnbOrder[]> {
    const q = new URLSearchParams();
    if (params?.storeId) q.append('store_id', params.storeId);
    if (params?.status) q.append('status', params.status);
    if (params?.orderType) q.append('order_type', params.orderType);
    const res = await apiClient.get(`/fnb/orders?${q.toString()}`);
    const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    return data.map(mapOrder);
  }

  async getOrderById(id: string): Promise<FnbOrder> {
    const res = await apiClient.get(`/fnb/orders/${id}`);
    return mapOrder(res.data);
  }

  async createOrder(data: {
    storeId: string;
    orderType: OrderType;
    tableId?: string;
    customerId?: string;
    notes?: string;
  }): Promise<FnbOrder> {
    const res = await apiClient.post('/fnb/orders', {
      store_id: data.storeId,
      order_type: data.orderType,
      table_id: data.tableId,
      customer_id: data.customerId,
      notes: data.notes,
    });
    return mapOrder(res.data);
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<FnbOrder> {
    const res = await apiClient.patch(`/fnb/orders/${id}/status`, { status });
    return mapOrder(res.data);
  }

  // Kitchen Display — backend returns { pending: [], preparing: [], ready: [] }
  // We flatten to a single array for the KDS page
  async getKitchenDisplay(storeId?: string): Promise<FnbOrder[]> {
    const params = storeId ? `?store_id=${storeId}` : '';
    const res = await apiClient.get(`/fnb/orders/kitchen-display${params}`);
    const raw = res.data;
    // Handle both flat array and grouped object
    if (Array.isArray(raw)) return raw.map(mapOrder);
    const all = [
      ...(raw?.pending || []),
      ...(raw?.preparing || []),
      ...(raw?.ready || []),
    ];
    return all.map(mapOrder);
  }
}

export const fnbService = new FnbService();

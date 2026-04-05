import apiClient from '@/lib/api-client';

// Backend statuses (matches laundry-order.entity.ts)
export enum LaundryOrderStatus {
  RECEIVED = 'received',
  WASHING = 'washing',
  DRYING = 'drying',
  IRONING = 'ironing',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface LaundryServiceType {
  id: string;
  companyId: string;
  name: string;
  serviceType: string;
  description?: string;
  pricingType: 'per_kg' | 'per_item';
  price: number;
  estimatedHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LaundryItem {
  id: string;
  itemType: string;
  description?: string;
  color?: string;
  brand?: string;
  quantity: number;
  barcode?: string;
  notes?: string;
  // legacy compat for orders page
  itemName?: string;
}

export interface LaundryOrder {
  id: string;
  companyId: string;
  storeId: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  serviceTypeId: string;
  serviceTypeName?: string;
  status: LaundryOrderStatus;
  items: LaundryItem[];
  totalWeight?: number;
  totalPrice: number;
  pickupDate?: string;
  deliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

function mapServiceType(raw: any): LaundryServiceType {
  return {
    id: raw.id,
    companyId: raw.company_id,
    name: raw.name,
    serviceType: raw.service_type,
    description: raw.description,
    pricingType: raw.pricing_type,
    price: Number(raw.price || 0),
    estimatedHours: raw.estimated_hours,
    isActive: raw.is_active,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function mapItem(raw: any): LaundryItem {
  return {
    id: raw.id,
    itemType: raw.item_type,
    description: raw.description,
    color: raw.color,
    brand: raw.brand,
    quantity: raw.quantity,
    barcode: raw.barcode,
    notes: raw.notes,
    itemName: raw.item_type, // legacy compat
  };
}

function mapOrder(raw: any): LaundryOrder {
  return {
    id: raw.id,
    companyId: raw.company_id,
    storeId: raw.store_id,
    orderNumber: raw.order_number,
    customerId: raw.customer_id,
    customerName: raw.customer?.name,
    serviceTypeId: raw.service_type_id,
    serviceTypeName: raw.service_type?.name,
    status: raw.status,
    items: (raw.items || []).map(mapItem),
    totalWeight: raw.weight_kg ? Number(raw.weight_kg) : undefined,
    totalPrice: Number(raw.total_price || 0),
    pickupDate: raw.pickup_date,
    deliveryDate: raw.delivery_date,
    notes: raw.notes,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

class LaundryService {
  // Service Types
  async getServiceTypes(): Promise<LaundryServiceType[]> {
    const res = await apiClient.get('/laundry/service-types');
    const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    return data.map(mapServiceType);
  }

  // Orders
  async getOrders(params?: {
    storeId?: string;
    status?: LaundryOrderStatus;
    customerId?: string;
  }): Promise<LaundryOrder[]> {
    const q = new URLSearchParams();
    if (params?.storeId) q.append('store_id', params.storeId);
    if (params?.status) q.append('status', params.status);
    if (params?.customerId) q.append('customer_id', params.customerId);
    const res = await apiClient.get(`/laundry/orders?${q.toString()}`);
    const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    return data.map(mapOrder);
  }

  async getOrderById(id: string): Promise<LaundryOrder> {
    const res = await apiClient.get(`/laundry/orders/${id}`);
    return mapOrder(res.data);
  }

  async updateOrderStatus(id: string, status: LaundryOrderStatus): Promise<LaundryOrder> {
    const res = await apiClient.patch(`/laundry/orders/${id}/status`, { status });
    return mapOrder(res.data);
  }

  async getSchedule(storeId?: string, date?: string): Promise<{ pickups: LaundryOrder[]; deliveries: LaundryOrder[] }> {
    const q = new URLSearchParams();
    if (storeId) q.append('store_id', storeId);
    if (date) q.append('date', date);
    const res = await apiClient.get(`/laundry/orders/schedule?${q.toString()}`);
    const data = res.data;
    return {
      pickups: (data?.pickups || []).map(mapOrder),
      deliveries: (data?.deliveries || []).map(mapOrder),
    };
  }

  async addItems(orderId: string, items: {
    item_type: string;
    description?: string;
    color?: string;
    brand?: string;
    quantity: number;
    barcode?: string;
    notes?: string;
  }[]): Promise<LaundryItem[]> {
    const res = await apiClient.post(`/laundry/orders/${orderId}/items`, { items });
    const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    return data.map(mapItem);
  }

  async createOrder(data: {
    store_id: string;
    customer_id: string;
    service_type_id: string;
    weight_kg?: number;
    notes?: string;
    pickup_date: string;
    delivery_date: string;
    pickup_address?: string;
    delivery_address?: string;
    items?: Array<{ item_type: string; quantity: number; description?: string; color?: string; brand?: string; notes?: string }>;
  }): Promise<LaundryOrder> {
    const res = await apiClient.post('/laundry/orders', data);
    return mapOrder(res.data);
  }
}

export const laundryService = new LaundryService();

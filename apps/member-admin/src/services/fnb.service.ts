import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum OrderType {
  DINE_IN = 'dine_in',
  TAKEAWAY = 'takeaway',
  DELIVERY = 'delivery',
}

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
}

export interface FnbTable {
  id: string;
  companyId: string;
  storeId: string;
  tableNumber: string;
  capacity: number;
  floor?: string;
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

export interface CreateFnbOrderDto {
  storeId: string;
  orderType: OrderType;
  tableId?: string;
  customerId?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }[];
  notes?: string;
}

class FnbService {
  private getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  // Tables
  async getTables(storeId?: string): Promise<FnbTable[]> {
    const queryParams = new URLSearchParams();
    if (storeId) queryParams.append('store_id', storeId);

    const response = await axios.get(
      `${API_URL}/fnb/tables?${queryParams.toString()}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async createTable(data: {
    storeId: string;
    tableNumber: string;
    capacity: number;
    floor?: string;
  }): Promise<FnbTable> {
    const response = await axios.post(
      `${API_URL}/fnb/tables`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  async updateTable(id: string, data: {
    tableNumber?: string;
    capacity?: number;
    floor?: string;
    status?: TableStatus;
  }): Promise<FnbTable> {
    const response = await axios.patch(
      `${API_URL}/fnb/tables/${id}`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  async deleteTable(id: string): Promise<void> {
    await axios.delete(
      `${API_URL}/fnb/tables/${id}`,
      this.getAuthHeader()
    );
  }

  // Orders
  async getOrders(params?: {
    storeId?: string;
    status?: OrderStatus;
    orderType?: OrderType;
  }): Promise<FnbOrder[]> {
    const queryParams = new URLSearchParams();
    if (params?.storeId) queryParams.append('store_id', params.storeId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.orderType) queryParams.append('order_type', params.orderType);

    const response = await axios.get(
      `${API_URL}/fnb/orders?${queryParams.toString()}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async getOrderById(id: string): Promise<FnbOrder> {
    const response = await axios.get(
      `${API_URL}/fnb/orders/${id}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async createOrder(data: CreateFnbOrderDto): Promise<FnbOrder> {
    const response = await axios.post(
      `${API_URL}/fnb/orders`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<FnbOrder> {
    const response = await axios.patch(
      `${API_URL}/fnb/orders/${id}/status`,
      { status },
      this.getAuthHeader()
    );
    return response.data;
  }

  async getKitchenDisplay(storeId?: string): Promise<FnbOrder[]> {
    const queryParams = new URLSearchParams();
    if (storeId) queryParams.append('store_id', storeId);

    const response = await axios.get(
      `${API_URL}/fnb/orders/kitchen-display?${queryParams.toString()}`,
      this.getAuthHeader()
    );
    return response.data;
  }
}

export const fnbService = new FnbService();

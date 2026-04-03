import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

export enum LaundryOrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  READY = 'ready',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface LaundryServiceType {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  pricePerKg?: number;
  pricePerItem?: number;
  estimatedDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LaundryItem {
  id: string;
  itemName: string;
  quantity: number;
  notes?: string;
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

export interface CreateLaundryOrderDto {
  storeId: string;
  customerId?: string;
  serviceTypeId: string;
  items: {
    itemName: string;
    quantity: number;
    notes?: string;
  }[];
  totalWeight?: number;
  totalPrice: number;
  pickupDate?: string;
  deliveryDate?: string;
  notes?: string;
}

class LaundryService {
  private getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  // Service Types
  async getServiceTypes(): Promise<LaundryServiceType[]> {
    const response = await axios.get(
      `${API_URL}/laundry/service-types`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async createServiceType(data: {
    name: string;
    description?: string;
    pricePerKg?: number;
    pricePerItem?: number;
    estimatedDays: number;
  }): Promise<LaundryServiceType> {
    const response = await axios.post(
      `${API_URL}/laundry/service-types`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  // Orders
  async getOrders(params?: {
    storeId?: string;
    status?: LaundryOrderStatus;
    customerId?: string;
  }): Promise<LaundryOrder[]> {
    const queryParams = new URLSearchParams();
    if (params?.storeId) queryParams.append('store_id', params.storeId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.customerId) queryParams.append('customer_id', params.customerId);

    const response = await axios.get(
      `${API_URL}/laundry/orders?${queryParams.toString()}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async getOrderById(id: string): Promise<LaundryOrder> {
    const response = await axios.get(
      `${API_URL}/laundry/orders/${id}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async createOrder(data: CreateLaundryOrderDto): Promise<LaundryOrder> {
    const response = await axios.post(
      `${API_URL}/laundry/orders`,
      data,
      this.getAuthHeader()
    );
    return response.data;
  }

  async updateOrderStatus(id: string, status: LaundryOrderStatus): Promise<LaundryOrder> {
    const response = await axios.patch(
      `${API_URL}/laundry/orders/${id}/status`,
      { status },
      this.getAuthHeader()
    );
    return response.data;
  }

  async getSchedule(storeId?: string, date?: string): Promise<any> {
    const queryParams = new URLSearchParams();
    if (storeId) queryParams.append('store_id', storeId);
    if (date) queryParams.append('date', date);

    const response = await axios.get(
      `${API_URL}/laundry/orders/schedule?${queryParams.toString()}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async addItems(orderId: string, items: {
    itemName: string;
    quantity: number;
    notes?: string;
  }[]): Promise<LaundryOrder> {
    const response = await axios.post(
      `${API_URL}/laundry/orders/${orderId}/items`,
      { items },
      this.getAuthHeader()
    );
    return response.data;
  }
}

export const laundryService = new LaundryService();

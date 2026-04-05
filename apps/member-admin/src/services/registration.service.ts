import axios from 'axios';
import apiClient from '@/lib/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

export interface RegisterDto {
  companyName: string;
  businessType?: 'retail' | 'fnb' | 'laundry' | 'service' | 'other';
  companyEmail: string;
  companyPhone: string;
  companyAddress?: string;
  planId: string;
  durationMonths: number;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  companyId: string;
  userId: string;
  subscriptionId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  durationMonths: number;
  discountPercentage: number;
  paymentUrl: string;
  paymentToken: string;
  dueDate: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: Record<string, boolean>;
  maxStores: number;
  maxUsers: number;
  maxEmployees: number;
  maxProducts: number;
  isPopular: boolean;
  durations?: SubscriptionDuration[];
}

export interface SubscriptionDuration {
  id: string;
  durationMonths: number;
  discountPercentage: number;
  finalPrice: number;
}

class RegistrationService {
  // Public endpoint — no auth needed, use plain axios
  async getPlans(): Promise<SubscriptionPlan[]> {
    const response = await axios.get(`${API_URL}/subscription-plans/with-durations`);
    return response.data;
  }

  // Public endpoint — no auth needed, use plain axios
  async register(data: RegisterDto): Promise<RegisterResponse> {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    return response.data;
  }

  async verifyPayment(invoiceNumber: string): Promise<any> {
    const res = await apiClient.get('/billing/invoices');
    const invoices = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    return invoices.find((i: any) => i.invoiceNumber === invoiceNumber) || null;
  }
}

export const registrationService = new RegistrationService();

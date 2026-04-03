import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

export interface RegisterDto {
  // Company info
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  
  // Plan selection
  planId: string;
  durationMonths: number;
  
  // Owner info
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
  async getPlans(): Promise<SubscriptionPlan[]> {
    const response = await axios.get(`${API_URL}/subscription-plans/with-durations`);
    return response.data;
  }

  async register(data: RegisterDto): Promise<RegisterResponse> {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    return response.data;
  }

  async verifyPayment(orderId: string): Promise<any> {
    const response = await axios.get(`${API_URL}/payment/verify/${orderId}`);
    return response.data;
  }
}

export const registrationService = new RegistrationService();

import { api } from '../lib/api';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceMonthly: number;   // backend field name
  priceYearly: number;    // backend field name
  maxStores: number;      // backend field name (was maxOutlets)
  maxUsers: number;
  maxEmployees: number;
  maxProducts: number;
  maxTransactionsPerMonth: number;
  trialDays: number;
  features: Record<string, boolean>;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  durations?: SubscriptionDuration[];
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionDuration {
  id: string;
  planId: string;
  durationMonths: number;
  discountPercentage: number;
  finalPrice: number;
}

export interface CreatePlanDto {
  name: string;
  slug: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  maxStores: number;
  maxUsers: number;
  maxEmployees: number;
  maxProducts: number;
  maxTransactionsPerMonth?: number;
  trialDays?: number;
  features?: Record<string, boolean>;
  isPopular?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

class SubscriptionsService {
  async getAllPlans(): Promise<SubscriptionPlan[]> {
    const data = await api.get('/subscription-plans');
    return Array.isArray(data) ? data : [];
  }

  async getPlanById(id: string): Promise<SubscriptionPlan> {
    return await api.get(`/subscription-plans/${id}`);
  }

  async createPlan(data: CreatePlanDto): Promise<SubscriptionPlan> {
    return await api.post('/subscription-plans', data);
  }

  async updatePlan(id: string, data: Partial<CreatePlanDto>): Promise<SubscriptionPlan> {
    return await api.put(`/subscription-plans/${id}`, data);
  }

  async deletePlan(id: string): Promise<void> {
    await api.delete(`/subscription-plans/${id}`);
  }

  async togglePlanStatus(id: string, isActive: boolean): Promise<SubscriptionPlan> {
    return await api.put(`/subscription-plans/${id}`, { isActive });
  }

  async seedPlans(): Promise<void> {
    await api.post('/subscription-plans/seed', {});
  }

  async createDuration(planId: string, durationMonths: number): Promise<SubscriptionDuration> {
    return await api.post(`/subscription-plans/${planId}/durations`, { durationMonths });
  }

  async deleteDuration(planId: string, durationMonths: number): Promise<void> {
    await api.delete(`/subscription-plans/${planId}/durations/${durationMonths}`);
  }
}

export const subscriptionsService = new SubscriptionsService();

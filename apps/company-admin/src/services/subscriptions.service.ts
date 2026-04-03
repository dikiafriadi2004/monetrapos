import { api } from '../lib/api';

export interface Feature {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  maxOutlets: number;
  maxProducts: number;
  sortOrder: number;
  isActive: boolean;
  features: Feature[];
  subscriptions?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanDto {
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  maxOutlets: number;
  maxProducts: number;
  sortOrder?: number;
  featureIds: string[];
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
    return await api.patch(`/subscription-plans/${id}`, data);
  }

  async deletePlan(id: string): Promise<void> {
    await api.delete(`/subscription-plans/${id}`);
  }

  async togglePlanStatus(id: string, isActive: boolean): Promise<SubscriptionPlan> {
    return await api.patch(`/subscription-plans/${id}`, { isActive });
  }

  async getAllFeatures(): Promise<Feature[]> {
    const data = await api.get('/features');
    return Array.isArray(data) ? data : [];
  }

  async createFeature(data: { name: string; code: string; description?: string }): Promise<Feature> {
    return await api.post('/features', data);
  }

  async updateFeature(id: string, data: Partial<Feature>): Promise<Feature> {
    return await api.patch(`/features/${id}`, data);
  }

  async deleteFeature(id: string): Promise<void> {
    await api.delete(`/features/${id}`);
  }
}

export const subscriptionsService = new SubscriptionsService();

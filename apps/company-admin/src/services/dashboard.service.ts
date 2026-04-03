import { api } from '../lib/api';

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  suspendedMembers: number;
  pendingMembers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  totalPlans: number;
  activePlans: number;
  totalTransactions: number;
  paidTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
}

export interface RevenueChart {
  date: string;
  amount: number;
  transactions: number;
}

export interface MemberGrowth {
  date: string;
  total: number;
  active: number;
  new: number;
}

export interface TopPlan {
  planId: string;
  planName: string;
  subscribers: number;
  revenue: number;
}

class DashboardService {
  async getStats(): Promise<DashboardStats> {
    return await api.get('/admin/dashboard/stats');
  }

  async getRevenueChart(period: 'week' | 'month' | 'year' = 'month'): Promise<RevenueChart[]> {
    const data = await api.get(`/admin/dashboard/revenue?period=${period}`);
    return Array.isArray(data) ? data : [];
  }

  async getMemberGrowth(period: 'week' | 'month' | 'year' = 'month'): Promise<MemberGrowth[]> {
    const data = await api.get(`/admin/dashboard/member-growth?period=${period}`);
    return Array.isArray(data) ? data : [];
  }

  async getTopPlans(limit: number = 5): Promise<TopPlan[]> {
    const data = await api.get(`/admin/dashboard/top-plans?limit=${limit}`);
    return Array.isArray(data) ? data : [];
  }

  async getRecentActivity(limit: number = 10): Promise<any[]> {
    const data = await api.get(`/admin/dashboard/recent-activity?limit=${limit}`);
    return Array.isArray(data) ? data : [];
  }
}

export const dashboardService = new DashboardService();

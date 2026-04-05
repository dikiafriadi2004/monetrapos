import apiClient from '@/lib/api-client';

export interface EmployeePerformanceReport {
  employeeId: string;
  employeeName: string;
  totalSales: number;
  totalTransactions: number;
  averageTransactionValue: number;
  totalWorkHours?: number;
  salesPerHour?: number;
}

export interface CustomerAnalyticsReport {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageLifetimeValue?: number;
  retentionRate?: number;
  topCustomers: {
    customerId: string;
    customerName: string;
    totalSpent: number;
    totalOrders?: number;
    visitCount?: number;
  }[];
  customersByTier: Record<string, number> | { tier: string; count: number }[];
}

export interface ProfitLossReport {
  period?: { startDate: string; endDate: string };
  revenue?: number;
  cogs?: number;
  grossProfit?: number;
  expenses?: number;
  netProfit?: number;
  profitMargin?: number;
  // Backend shape
  costs?: { totalCost: number; costOfGoodsSold: number; operatingExpenses: number };
  profit?: { grossProfit: number; grossProfitMargin: number; netProfit: number; netProfitMargin: number };
}

class AdvancedReportsService {
  async getEmployeePerformance(params: {
    storeId?: string;
    startDate: string;
    endDate: string;
  }): Promise<EmployeePerformanceReport[]> {
    const q = new URLSearchParams();
    if (params.storeId) q.append('store_id', params.storeId);
    q.append('start_date', params.startDate);
    q.append('end_date', params.endDate);
    const res = await apiClient.get(`/reports/advanced/employee-performance?${q.toString()}`);
    const data = res.data;
    // Backend returns { period, employees: [], summary }
    return Array.isArray(data) ? data : (data?.employees || []);
  }

  async getCustomerAnalytics(params: {
    storeId?: string;
    startDate: string;
    endDate: string;
  }): Promise<CustomerAnalyticsReport> {
    const q = new URLSearchParams();
    if (params.storeId) q.append('store_id', params.storeId);
    q.append('start_date', params.startDate);
    q.append('end_date', params.endDate);
    const res = await apiClient.get(`/reports/advanced/customers?${q.toString()}`);
    return res.data;
  }

  async getProfitLoss(params: {
    storeId?: string;
    startDate: string;
    endDate: string;
  }): Promise<ProfitLossReport> {
    const q = new URLSearchParams();
    if (params.storeId) q.append('store_id', params.storeId);
    q.append('start_date', params.startDate);
    q.append('end_date', params.endDate);
    const res = await apiClient.get(`/reports/advanced/profit-loss?${q.toString()}`);
    const data = res.data;
    // Normalize backend shape to frontend shape
    return {
      ...data,
      revenue: data?.revenue?.totalSales ?? data?.revenue ?? 0,
      cogs: data?.costs?.costOfGoodsSold ?? data?.cogs ?? 0,
      grossProfit: data?.profit?.grossProfit ?? data?.grossProfit ?? 0,
      expenses: data?.costs?.operatingExpenses ?? data?.expenses ?? 0,
      netProfit: data?.profit?.netProfit ?? data?.netProfit ?? 0,
      profitMargin: data?.profit?.netProfitMargin ?? data?.profitMargin ?? 0,
    };
  }
}

export const advancedReportsService = new AdvancedReportsService();

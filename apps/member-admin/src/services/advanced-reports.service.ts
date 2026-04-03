import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

export interface EmployeePerformanceReport {
  employeeId: string;
  employeeName: string;
  totalSales: number;
  totalTransactions: number;
  averageTransactionValue: number;
  period: string;
}

export interface CustomerAnalyticsReport {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  topCustomers: {
    customerId: string;
    customerName: string;
    totalSpent: number;
    visitCount: number;
  }[];
  customersByTier: {
    tier: string;
    count: number;
  }[];
}

export interface ProfitLossReport {
  period: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
}

class AdvancedReportsService {
  private getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  async getEmployeePerformance(params: {
    storeId?: string;
    startDate: string;
    endDate: string;
  }): Promise<EmployeePerformanceReport[]> {
    const queryParams = new URLSearchParams();
    if (params.storeId) queryParams.append('store_id', params.storeId);
    queryParams.append('start_date', params.startDate);
    queryParams.append('end_date', params.endDate);

    const response = await axios.get(
      `${API_URL}/reports/employee-performance?${queryParams.toString()}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async getCustomerAnalytics(params: {
    storeId?: string;
    startDate: string;
    endDate: string;
  }): Promise<CustomerAnalyticsReport> {
    const queryParams = new URLSearchParams();
    if (params.storeId) queryParams.append('store_id', params.storeId);
    queryParams.append('start_date', params.startDate);
    queryParams.append('end_date', params.endDate);

    const response = await axios.get(
      `${API_URL}/reports/customer-analytics?${queryParams.toString()}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async getProfitLoss(params: {
    storeId?: string;
    startDate: string;
    endDate: string;
  }): Promise<ProfitLossReport> {
    const queryParams = new URLSearchParams();
    if (params.storeId) queryParams.append('store_id', params.storeId);
    queryParams.append('start_date', params.startDate);
    queryParams.append('end_date', params.endDate);

    const response = await axios.get(
      `${API_URL}/reports/profit-loss?${queryParams.toString()}`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async exportReport(reportType: string, params: any): Promise<Blob> {
    const queryParams = new URLSearchParams(params);
    const response = await axios.get(
      `${API_URL}/reports/export/${reportType}?${queryParams.toString()}`,
      {
        ...this.getAuthHeader(),
        responseType: 'blob',
      }
    );
    return response.data;
  }
}

export const advancedReportsService = new AdvancedReportsService();

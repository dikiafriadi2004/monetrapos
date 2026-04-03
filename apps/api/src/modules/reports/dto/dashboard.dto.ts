import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;
}

export class DashboardResponseDto {
  period: {
    startDate: string;
    endDate: string;
  };
  
  // Key metrics
  metrics: {
    // Sales metrics
    totalRevenue: number;
    totalTransactions: number;
    averageTransaction: number;
    
    // Product metrics
    totalProducts: number;
    activeProducts: number;
    
    // Customer metrics
    totalCustomers: number;
    newCustomers: number;
    
    // Inventory metrics
    lowStockProducts: number;
    totalInventoryValue: number;
  };
  
  // Top selling products (last 7 days)
  topProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
  
  // Low stock alerts
  lowStockAlerts: Array<{
    productId: string;
    productName: string;
    sku: string;
    currentStock: number;
    lowStockThreshold: number;
  }>;
  
  // Revenue chart data (last 7 days)
  revenueChart: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
}

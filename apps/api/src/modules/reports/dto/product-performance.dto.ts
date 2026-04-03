import { IsOptional, IsDateString, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductPerformanceQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class ProductPerformanceResponseDto {
  period: {
    startDate: string;
    endDate: string;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantitySold: number;
    revenue: number;
    profit: number;
    averagePrice: number;
  }>;
  summary: {
    totalProducts: number;
    totalRevenue: number;
    totalProfit: number;
  };
}

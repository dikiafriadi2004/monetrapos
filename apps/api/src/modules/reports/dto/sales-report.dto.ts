import { IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportGroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class SalesReportQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(ReportGroupBy)
  groupBy?: ReportGroupBy = ReportGroupBy.DAY;

  @IsOptional()
  @IsUUID()
  storeId?: string;
}

export class SalesReportResponseDto {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransaction: number;
    totalTax: number;
    totalDiscount: number;
  };
  daily?: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
  weekly?: Array<{
    week: string;
    revenue: number;
    transactions: number;
  }>;
  monthly?: Array<{
    month: string;
    revenue: number;
    transactions: number;
  }>;
}

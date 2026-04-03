import { IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class InventoryReportQueryDto {
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  lowStockOnly?: boolean = false;
}

export class InventoryReportResponseDto {
  products: Array<{
    productId: string;
    productName: string;
    sku: string;
    categoryName: string;
    stock: number;
    lowStockThreshold: number;
    isLowStock: boolean;
    cost: number;
    inventoryValue: number;
  }>;
  summary: {
    totalProducts: number;
    lowStockProducts: number;
    totalInventoryValue: number;
  };
}

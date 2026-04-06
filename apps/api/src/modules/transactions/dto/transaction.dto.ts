import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionItemDto {
  @ApiProperty({ example: 'Nasi Goreng' })
  @IsString()
  productName: string;

  @ApiPropertyOptional({ example: 'Large' })
  @IsOptional()
  @IsString()
  variantName?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'product-uuid' })
  @IsOptional()
  @IsString()
  productId?: string;
}

export class CreateTransactionDto {
  @ApiProperty({ example: 'store-uuid' })
  @IsString()
  storeId: string;

  @ApiProperty({ example: 'cash', description: 'Payment method: cash, qris, edc, bank_transfer, ewallet, or custom method code' })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({ example: 11000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiPropertyOptional({ example: 5000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ example: 106000 })
  @IsNumber()
  @Min(0)
  total: number;

  @ApiProperty({ example: 110000 })
  @IsNumber()
  @Min(0)
  paidAmount: number;

  @ApiPropertyOptional({ example: 4000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  changeAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'customer-uuid' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: '081234567890' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'employee-uuid' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ example: 'shift-uuid' })
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiPropertyOptional({ example: 'Jane Kasir' })
  @IsOptional()
  @IsString()
  employeeName?: string;

  @ApiPropertyOptional({ example: 'dine-in', description: 'FnB order type: dine-in, takeaway, delivery' })
  @IsOptional()
  @IsString()
  orderType?: string;

  @ApiPropertyOptional({ example: 'table-uuid', description: 'FnB table ID for dine-in orders' })
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiPropertyOptional({
    description: 'Split payment methods',
    example: [
      { method: 'cash', amount: 50000 },
      { method: 'qris', amount: 56000 },
    ],
  })
  @IsOptional()
  @IsArray()
  paymentMethods?: Array<{ method: string; amount: number }>;

  @ApiProperty({ type: [CreateTransactionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionItemDto)
  items: CreateTransactionItemDto[];
}

export class VoidTransactionDto {
  @ApiProperty({ example: 'Pesanan salah' })
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ example: 'employee-uuid' })
  @IsOptional()
  @IsString()
  voidedBy?: string;
}

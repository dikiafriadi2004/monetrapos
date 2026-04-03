import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '../stock-movement.entity';

export class CreateStockMovementDto {
  @ApiProperty({ enum: MovementType, example: MovementType.IN })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 'variant-uuid' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: 'store-uuid' })
  @IsString()
  storeId: string;

  @ApiPropertyOptional({ example: 'Restock from supplier' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 'INV-2026-001' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class ReserveStockDto {
  @ApiProperty({ example: 'store-uuid' })
  @IsString()
  storeId: string;

  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 'variant-uuid' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Reserved for order #12345' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class TransferStockDto {
  @ApiProperty({ example: 'from-store-uuid' })
  @IsString()
  fromStoreId: string;

  @ApiProperty({ example: 'to-store-uuid' })
  @IsString()
  toStoreId: string;

  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 'variant-uuid' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Transfer for new store opening' })
  @IsOptional()
  @IsString()
  notes?: string;
}


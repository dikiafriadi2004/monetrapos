import { IsString, IsOptional, IsNumber, IsEnum, Min, IsInt } from 'class-validator';
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

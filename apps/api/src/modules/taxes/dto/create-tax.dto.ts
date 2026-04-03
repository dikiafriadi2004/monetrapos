import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TaxType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export class CreateTaxDto {
  @ApiProperty({ example: 'PPN 11%' })
  @IsString()
  name: string;

  @ApiProperty({ enum: TaxType, example: TaxType.PERCENTAGE })
  @IsEnum(TaxType)
  type: TaxType;

  @ApiProperty({
    example: 11,
    description: 'Tax rate (percentage or fixed amount)',
  })
  @IsNumber()
  @Min(0)
  rate: number;

  @ApiProperty({ example: 'store-uuid' })
  @IsString()
  storeId: string;

  @ApiProperty({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiProperty({ required: false, example: 'Government tax' })
  @IsOptional()
  @IsString()
  description?: string;
}

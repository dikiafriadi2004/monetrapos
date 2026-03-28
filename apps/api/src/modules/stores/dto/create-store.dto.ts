import { IsString, IsOptional, IsEnum, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoreType } from '../../../common/enums';

export class CreateStoreDto {
  @ApiProperty({ example: 'Toko Saya', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: StoreType, example: StoreType.RESTAURANT })
  @IsEnum(StoreType)
  type: StoreType;

  @ApiPropertyOptional({ example: 'Jl. Contoh No. 1' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ example: { monday: { open: '08:00', close: '22:00' } } })
  @IsOptional()
  @IsObject()
  operationalHours?: Record<string, { open: string; close: string }>;

  @ApiPropertyOptional({ example: 'Terima kasih telah berbelanja!' })
  @IsOptional()
  @IsString()
  receiptHeader?: string;

  @ApiPropertyOptional({ example: 'Barang yang sudah dibeli tidak dapat ditukar.' })
  @IsOptional()
  @IsString()
  receiptFooter?: string;
}

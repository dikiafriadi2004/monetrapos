import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  MaxLength,
  IsEmail,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoreType } from '../../../common/enums';

export class CreateStoreDto {
  @ApiProperty({ example: 'Toko Saya', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'MAIN', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ enum: StoreType, example: StoreType.RESTAURANT })
  @IsEnum(StoreType)
  type: StoreType;

  @ApiPropertyOptional({ example: 'Jl. Contoh No. 1' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Jakarta' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'DKI Jakarta' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ example: '12345' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'store@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({ example: 'uuid-of-manager' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({
    example: { 
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' }
    },
  })
  @IsOptional()
  @IsObject()
  openingHours?: Record<string, { open: string; close: string }>;

  @ApiPropertyOptional({ example: 'Terima kasih telah berbelanja!' })
  @IsOptional()
  @IsString()
  receiptHeader?: string;

  @ApiPropertyOptional({
    example: 'Barang yang sudah dibeli tidak dapat ditukar.',
  })
  @IsOptional()
  @IsString()
  receiptFooter?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptLogoUrl?: string;
}

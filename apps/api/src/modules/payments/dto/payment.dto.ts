import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '../../../common/enums';

export class CreatePaymentMethodDto {
  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.CASH })
  @IsEnum(PaymentMethodType)
  type: PaymentMethodType;

  @ApiProperty({ example: 'Cash', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: { bankName: 'BCA', accountNumber: '1234567890' },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiProperty({ example: 'store-uuid' })
  @IsString()
  storeId: string;
}

export class UpdatePaymentMethodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateQrisConfigDto {
  @ApiProperty({ description: 'Base64 or URL of QRIS image' })
  @IsString()
  originalImage: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parsedData?: string;

  @ApiPropertyOptional({ example: 'Toko Saya' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  merchantName?: string;

  @ApiPropertyOptional({ example: 'ID1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  merchantId?: string;

  @ApiProperty({ example: 'store-uuid' })
  @IsString()
  storeId: string;
}

export class UpdateQrisConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originalImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parsedData?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  merchantName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  merchantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

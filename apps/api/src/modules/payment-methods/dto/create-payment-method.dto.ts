import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaymentMethodType } from '../payment-method.entity';

export class CreatePaymentMethodDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @IsEnum(PaymentMethodType)
  type: PaymentMethodType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  iconUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresReference?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountCode?: string;
}

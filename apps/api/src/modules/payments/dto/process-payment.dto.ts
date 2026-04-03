import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsObject,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethodType } from '../../../common/enums';

export class ProcessPaymentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  transactionId: string;

  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.QRIS })
  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ required: false, example: 'TRX-20240327-001' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiProperty({ required: false, example: { customerPhone: '081234567890' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

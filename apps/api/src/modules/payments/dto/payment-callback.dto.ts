import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentCallbackDto {
  @ApiProperty({ example: 'ORDER-123456' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: 'settlement' })
  @IsString()
  transactionStatus: string;

  @ApiProperty({ example: 'qris' })
  @IsString()
  paymentType: string;

  @ApiProperty({ required: false, example: 'accept' })
  @IsOptional()
  @IsString()
  fraudStatus?: string;

  @ApiProperty({ required: false, example: '100000.00' })
  @IsOptional()
  @IsString()
  grossAmount?: string;

  @ApiProperty({ required: false, example: '2024-03-27T10:00:00Z' })
  @IsOptional()
  @IsString()
  transactionTime?: string;
}

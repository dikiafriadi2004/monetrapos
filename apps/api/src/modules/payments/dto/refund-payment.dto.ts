import { IsUUID, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefundPaymentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  transactionId: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'Customer request' })
  @IsString()
  reason: string;

  @ApiProperty({ required: false, example: 'Partial refund for damaged item' })
  @IsOptional()
  @IsString()
  notes?: string;
}

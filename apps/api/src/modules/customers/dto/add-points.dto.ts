import { IsUUID, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddPointsDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ example: 50, description: 'Points to add' })
  @IsNumber()
  @Min(1)
  points: number;

  @ApiProperty({ example: 100000, description: 'Transaction amount' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({ example: 'Purchase reward' })
  @IsString()
  reason: string;

  @ApiProperty({ required: false, example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  transactionId?: string;
}

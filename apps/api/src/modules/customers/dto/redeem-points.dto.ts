import { IsUUID, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemPointsDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ example: 100, description: 'Points to redeem' })
  @IsNumber()
  @Min(1)
  points: number;

  @ApiProperty({ example: 'transaction', description: 'Reference type' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiProperty({
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Reference ID (e.g., transaction ID)',
  })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiProperty({ required: false, example: 'Redeemed for discount' })
  @IsOptional()
  @IsString()
  description?: string;
}

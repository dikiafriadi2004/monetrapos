import { IsString, IsNotEmpty, IsEmail, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '081234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;
  
  @ApiProperty({ example: 'store-uuid' })
  @IsString()
  @IsNotEmpty()
  storeId: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '081234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsInt()
  @Min(0)
  @IsOptional()
  loyaltyPoints?: number;
}

export * from './add-points.dto';
export * from './redeem-points.dto';

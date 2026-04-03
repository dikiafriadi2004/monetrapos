import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyFilterDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search by company name, email, or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by company status',
    enum: ['active', 'suspended', 'cancelled', 'pending']
  })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'cancelled', 'pending'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by business type (fnb, laundry, retail, other)' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by subscription status',
    enum: ['trial', 'active', 'past_due', 'cancelled', 'expired']
  })
  @IsOptional()
  @IsEnum(['trial', 'active', 'past_due', 'cancelled', 'expired'])
  subscriptionStatus?: string;
}

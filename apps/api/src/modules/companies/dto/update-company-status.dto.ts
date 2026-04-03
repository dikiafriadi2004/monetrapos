import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanyStatusDto {
  @ApiProperty({ 
    description: 'New status for the company',
    enum: ['active', 'suspended', 'cancelled']
  })
  @IsEnum(['active', 'suspended', 'cancelled'])
  status: string;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  reason?: string;
}

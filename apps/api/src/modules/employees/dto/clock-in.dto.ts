import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClockInDto {
  @ApiProperty({ description: 'Store ID where employee is clocking in' })
  @IsUUID()
  storeId: string;

  @ApiPropertyOptional({ description: 'Optional notes for clock in' })
  @IsOptional()
  @IsString()
  notes?: string;
}

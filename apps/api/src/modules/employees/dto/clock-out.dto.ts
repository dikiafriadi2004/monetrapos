import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ClockOutDto {
  @ApiPropertyOptional({ description: 'Break duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  breakDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Optional notes for clock out' })
  @IsOptional()
  @IsString()
  notes?: string;
}

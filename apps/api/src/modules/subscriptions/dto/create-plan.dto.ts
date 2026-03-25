import { IsString, IsNumber, IsOptional, MaxLength, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  tier: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  monthlyPrice: number;

  @ApiProperty()
  @IsNumber()
  yearlyPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxOutlets?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxProducts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  featureIds?: string[];
}

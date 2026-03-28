import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaxDto {
  @ApiProperty({ example: 'PPN', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 11, description: 'Tax rate in percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @ApiPropertyOptional({ default: false, description: 'Whether tax is inclusive in price' })
  @IsOptional()
  @IsBoolean()
  isInclusive?: boolean;

  @ApiProperty({ example: 'store-uuid' })
  @IsString()
  storeId: string;
}

export class UpdateTaxDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isInclusive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

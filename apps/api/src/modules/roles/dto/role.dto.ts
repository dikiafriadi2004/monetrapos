import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'Kepala Kasir', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 'Kasir senior dengan akses void' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'store-uuid-here' })
  @IsString()
  storeId: string;

  @ApiPropertyOptional({
    example: ['pos.create_transaction', 'pos.void_transaction'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Kepala Kasir Senior' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['permission-uuid-1', 'permission-uuid-2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}

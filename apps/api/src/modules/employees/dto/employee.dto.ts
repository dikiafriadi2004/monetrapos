import { IsString, IsOptional, IsEmail, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'John Doe', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'john@store.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: '123456', maxLength: 6 })
  @IsOptional()
  @IsString()
  @MaxLength(6)
  pin?: string;

  @ApiProperty({ example: 'store-uuid' })
  @IsString()
  storeId: string;

  @ApiProperty({ example: 'role-uuid' })
  @IsString()
  roleId: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: 'John Updated' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: '654321' })
  @IsOptional()
  @IsString()
  @MaxLength(6)
  pin?: string;

  @ApiPropertyOptional({ example: 'role-uuid' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}

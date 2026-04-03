import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  IsNumber,
  IsUUID,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'John Doe', maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: 'john@store.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'password123', minLength: 6, description: 'Required if not linking to existing user' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: '123456', maxLength: 6, description: 'Quick PIN for POS login' })
  @IsOptional()
  @IsString()
  @MaxLength(6)
  pin?: string;

  @ApiProperty({ example: 'store-uuid' })
  @IsUUID()
  storeId: string;

  @ApiPropertyOptional({ example: 'user-uuid', description: 'Link to existing user account' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: 'Cashier' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @ApiProperty({ example: '2024-01-01', description: 'Hire date in YYYY-MM-DD format' })
  @IsDateString()
  hireDate: string;

  @ApiPropertyOptional({ example: 5000000, description: 'Monthly salary' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: 'John Updated' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'john.updated@store.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: '654321' })
  @IsOptional()
  @IsString()
  @MaxLength(6)
  pin?: string;

  @ApiPropertyOptional({ example: 'store-uuid' })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ example: 'user-uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: 'Manager' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({ example: 5500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}

export class LinkUserDto {
  @ApiProperty({ example: 'user-uuid', description: 'User ID to link to this employee' })
  @IsUUID()
  userId: string;
}

export class CreateUserAccountDto {
  @ApiProperty({ example: 'john@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'manager', description: 'User role: owner, admin, manager, accountant' })
  @IsOptional()
  @IsString()
  role?: string;
}

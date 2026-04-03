import { IsString, IsEmail, IsOptional, IsInt, IsBoolean, MaxLength, Min } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  contact_person?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(100)
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  province?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  postal_code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  tax_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  bank_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  bank_account_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  bank_account_name?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  payment_terms_days?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

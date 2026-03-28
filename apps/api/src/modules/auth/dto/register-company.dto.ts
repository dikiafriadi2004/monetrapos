import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';

export class RegisterCompanyDto {
  // Company Info
  @IsString()
  @MinLength(2)
  companyName: string;

  @IsEmail()
  companyEmail: string;

  @IsOptional()
  @IsPhoneNumber('ID')
  companyPhone?: string;

  @IsOptional()
  @IsString()
  companyAddress?: string;

  // Owner/Admin User Info
  @IsString()
  @MinLength(2)
  ownerName: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsPhoneNumber('ID')
  ownerPhone?: string;

  // Optional: Plan selection (default to trial)
  @IsOptional()
  @IsString()
  planId?: string;
}

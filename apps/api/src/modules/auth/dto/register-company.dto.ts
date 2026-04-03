import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsPhoneNumber,
  IsNumber,
  IsIn,
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

  // Subscription Plan Selection (REQUIRED for payment flow)
  @IsString()
  planId: string;

  // Subscription Duration (REQUIRED for payment flow)
  @IsNumber()
  @IsIn([1, 3, 6, 12])
  durationMonths: number;
}

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
  // Info Usaha
  @IsString()
  @MinLength(2)
  companyName: string;

  @IsOptional()
  @IsIn(['retail', 'fnb', 'laundry', 'service', 'other'])
  businessType?: string; // retail, fnb, laundry - menentukan fitur yang tersedia

  @IsEmail()
  companyEmail: string;

  @IsOptional()
  @IsPhoneNumber('ID')
  companyPhone?: string;

  @IsOptional()
  @IsString()
  companyAddress?: string;

  // Info Pemilik
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

  // Pilihan Paket (wajib untuk alur pembayaran)
  @IsString()
  planId: string;

  // Durasi Langganan (wajib untuk alur pembayaran)
  @IsNumber()
  @IsIn([1, 3, 6, 12])
  durationMonths: number;
}

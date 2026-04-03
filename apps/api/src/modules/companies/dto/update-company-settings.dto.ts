import { IsOptional, IsBoolean, IsObject, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({
    description: 'Tax settings configuration',
    example: {
      defaultTaxRate: 11,
      taxInclusive: true,
      taxLabel: 'PPN',
      taxNumber: '01.234.567.8-901.000',
    },
  })
  @IsOptional()
  @IsObject()
  taxSettings?: {
    defaultTaxRate?: number;
    taxInclusive?: boolean;
    taxLabel?: string;
    taxNumber?: string;
  };

  @ApiPropertyOptional({
    description: 'Receipt customization settings',
    example: {
      showLogo: true,
      showTaxNumber: true,
      footerText: 'Terima kasih atas kunjungan Anda',
      headerText: 'Selamat datang',
    },
  })
  @IsOptional()
  @IsObject()
  receiptSettings?: {
    showLogo?: boolean;
    showTaxNumber?: boolean;
    footerText?: string;
    headerText?: string;
  };

  @ApiPropertyOptional({
    description: 'Payment method preferences',
    example: {
      enableCash: true,
      enableCard: true,
      enableEWallet: true,
      enableQRIS: true,
      enableBankTransfer: false,
    },
  })
  @IsOptional()
  @IsObject()
  paymentMethodPreferences?: {
    enableCash?: boolean;
    enableCard?: boolean;
    enableEWallet?: boolean;
    enableQRIS?: boolean;
    enableBankTransfer?: boolean;
  };

  @ApiPropertyOptional({
    description: 'Notification preferences',
    example: {
      emailNotifications: true,
      smsNotifications: false,
      whatsappNotifications: true,
      lowStockAlerts: true,
      expiryReminders: true,
    },
  })
  @IsOptional()
  @IsObject()
  notificationPreferences?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    whatsappNotifications?: boolean;
    lowStockAlerts?: boolean;
    expiryReminders?: boolean;
  };

  @ApiPropertyOptional({
    description: 'Integration settings',
    example: {
      paymentGateway: 'midtrans',
      accountingIntegration: null,
      emailProvider: 'sendgrid',
    },
  })
  @IsOptional()
  @IsObject()
  integrationSettings?: {
    paymentGateway?: string;
    accountingIntegration?: string;
    emailProvider?: string;
  };

  @ApiPropertyOptional({
    description: 'Auto backup enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  autoBackupEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Backup frequency in days',
    example: 7,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  backupFrequencyDays?: number;
}

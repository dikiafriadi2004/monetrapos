import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  validateSync,
  IsOptional,
  IsUrl,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3003;

  @IsString()
  DB_HOST: string;

  @IsNumber()
  @IsOptional()
  DB_PORT: number = 3306;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_DATABASE: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  // Email (Optional)
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @IsNumber()
  SMTP_PORT?: number;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  @IsOptional()
  @IsString()
  SMTP_FROM?: string;

  // Midtrans Payment Gateway
  @IsOptional()
  @IsString()
  MIDTRANS_SERVER_KEY?: string;

  @IsOptional()
  @IsString()
  MIDTRANS_CLIENT_KEY?: string;

  @IsOptional()
  @IsEnum(['sandbox', 'production'])
  MIDTRANS_ENVIRONMENT?: string;

  // App URLs
  @IsOptional()
  @IsUrl()
  APP_URL?: string;

  @IsOptional()
  @IsUrl()
  FRONTEND_URL?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}

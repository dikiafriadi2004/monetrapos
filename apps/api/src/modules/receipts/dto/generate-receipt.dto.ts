import { IsUUID, IsEnum, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReceiptFormat {
  THERMAL = 'thermal',
  A4 = 'a4',
  EMAIL = 'email',
}

export class GenerateReceiptDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  transactionId: string;

  @ApiProperty({ enum: ReceiptFormat, example: ReceiptFormat.THERMAL })
  @IsEnum(ReceiptFormat)
  format: ReceiptFormat;

  @ApiProperty({ required: false, example: 'customer@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

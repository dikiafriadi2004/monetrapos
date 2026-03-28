import { IsUUID, IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmailReceiptDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  transactionId: string;

  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ required: false, example: 'Thank you for your purchase!' })
  @IsOptional()
  @IsString()
  message?: string;
}

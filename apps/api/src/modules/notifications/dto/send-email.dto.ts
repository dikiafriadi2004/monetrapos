import { IsEmail, IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  to: string;

  @ApiProperty({ example: 'Your Receipt from Store Name' })
  @IsString()
  subject: string;

  @ApiProperty({ example: 'Thank you for your purchase...' })
  @IsString()
  body: string;

  @ApiProperty({ required: false, example: ['receipt.pdf'] })
  @IsOptional()
  @IsArray()
  attachments?: any[];
}

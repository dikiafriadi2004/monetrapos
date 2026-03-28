import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendWhatsAppDto {
  @ApiProperty({ example: '6281234567890' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Hello! Your order is ready.' })
  @IsString()
  message: string;

  @ApiProperty({ required: false, example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

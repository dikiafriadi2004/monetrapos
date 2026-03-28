import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendSMSDto {
  @ApiProperty({ example: '081234567890' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Your order is ready for pickup!' })
  @IsString()
  message: string;
}

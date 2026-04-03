import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetGatewayPreferenceDto {
  @ApiProperty({
    description: 'Preferred payment gateway',
    enum: ['midtrans', 'xendit'],
    example: 'midtrans',
  })
  @IsEnum(['midtrans', 'xendit'])
  @IsNotEmpty()
  gateway: 'midtrans' | 'xendit';
}

import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetGatewayPreferenceDto {
  @ApiProperty({
    description: 'Preferred payment gateway',
    enum: ['xendit'],
    example: 'xendit',
  })
  @IsEnum(['xendit'])
  @IsNotEmpty()
  gateway: 'xendit';
}

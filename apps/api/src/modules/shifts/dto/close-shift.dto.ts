import { IsUUID, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CloseShiftDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  shiftId: string;

  @ApiProperty({ required: false, example: 'Normal shift closure' })
  @IsOptional()
  @IsString()
  notes?: string;
}

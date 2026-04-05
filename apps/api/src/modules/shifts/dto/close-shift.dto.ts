import { IsUUID, IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CloseShiftDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  shiftId: string;

  @ApiProperty({ required: false, example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  closingCash?: number;

  @ApiProperty({ required: false, example: 'Normal shift closure' })
  @IsOptional()
  @IsString()
  notes?: string;
}

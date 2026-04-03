import {
  IsUUID,
  IsNumber,
  IsString,
  IsOptional,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CashDeclarationDto } from './cash-declaration.dto';

export class ShiftReconciliationDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  shiftId: string;

  @ApiProperty({ type: CashDeclarationDto })
  @ValidateNested()
  @Type(() => CashDeclarationDto)
  actualCash: CashDeclarationDto;

  @ApiProperty({ example: 500000, description: 'Actual QRIS payment amount' })
  @IsNumber()
  @Min(0)
  actualQris: number;

  @ApiProperty({ example: 300000, description: 'Actual EDC payment amount' })
  @IsNumber()
  @Min(0)
  actualEdc: number;

  @ApiProperty({ example: 200000, description: 'Actual bank transfer amount' })
  @IsNumber()
  @Min(0)
  actualBankTransfer: number;

  @ApiProperty({ example: 100000, description: 'Actual e-wallet amount' })
  @IsNumber()
  @Min(0)
  actualEwallet: number;

  @ApiProperty({
    required: false,
    example: 'Cash variance due to customer tips',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

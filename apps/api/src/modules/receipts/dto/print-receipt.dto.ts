import { IsUUID, IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PrintReceiptDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  transactionId: string;

  @ApiProperty({ example: 'Thermal-Printer-01' })
  @IsString()
  printerName: string;

  @ApiProperty({ required: false, example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  copies?: number = 1;
}

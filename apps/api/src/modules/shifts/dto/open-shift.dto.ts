import {
  IsUUID,
  IsNumber,
  IsOptional,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CashDeclarationDto } from './cash-declaration.dto';

export class OpenShiftDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ type: CashDeclarationDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CashDeclarationDto)
  openingCash?: CashDeclarationDto;

  @ApiProperty({
    example: 500000,
    required: false,
    description: 'Opening cash amount if not using declaration',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  openingAmount?: number;
}

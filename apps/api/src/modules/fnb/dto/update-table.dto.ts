import { PartialType } from '@nestjs/mapped-types';
import { CreateTableDto } from './create-table.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { TableStatus } from '../table.entity';

export class UpdateTableDto extends PartialType(CreateTableDto) {}

export class UpdateTableStatusDto {
  @IsEnum(TableStatus)
  status: TableStatus;

  @IsOptional()
  @IsEnum(['string'])
  current_transaction_id?: string | null;
}

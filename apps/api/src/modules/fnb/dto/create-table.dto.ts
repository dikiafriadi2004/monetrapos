import { IsString, IsInt, IsOptional, IsEnum, Min, MaxLength } from 'class-validator';
import { TableStatus } from '../table.entity';

export class CreateTableDto {
  @IsString()
  @MaxLength(50)
  table_number: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  table_name?: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsEnum(TableStatus)
  @IsOptional()
  status?: TableStatus;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  floor?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  section?: string;

  @IsInt()
  @IsOptional()
  position_x?: number;

  @IsInt()
  @IsOptional()
  position_y?: number;

  @IsString()
  store_id: string;
}

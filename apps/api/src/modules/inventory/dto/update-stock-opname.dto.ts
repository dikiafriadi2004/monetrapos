import { PartialType } from '@nestjs/mapped-types';
import { CreateStockOpnameDto } from './create-stock-opname.dto';

export class UpdateStockOpnameDto extends PartialType(CreateStockOpnameDto) {}

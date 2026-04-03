import { PartialType } from '@nestjs/mapped-types';
import { CreateAddOnDto } from './create-add-on.dto';

export class UpdateAddOnDto extends PartialType(CreateAddOnDto) {}

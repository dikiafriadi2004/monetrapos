import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  // UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
// TODO: Import actual guards when auth module is updated
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('suppliers')
// @UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(@Request() req, @Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(req.user.company_id, createSupplierDto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('is_active') isActive?: string,
  ) {
    const isActiveBoolean = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.suppliersService.findAll(req.user.company_id, isActiveBoolean);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.suppliersService.findOne(req.user.company_id, id);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(req.user.company_id, id, updateSupplierDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.suppliersService.remove(req.user.company_id, id);
  }

  @Post(':id/activate')
  activate(@Request() req, @Param('id') id: string) {
    return this.suppliersService.activate(req.user.company_id, id);
  }
}

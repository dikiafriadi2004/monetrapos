import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard, RequirePermissions } from '../auth/guards';
import { TaxesService } from './taxes.service';
import { CreateTaxDto, UpdateTaxDto } from './dto';

@ApiTags('Taxes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Post()
  @RequirePermissions('finance.manage_tax')
  @ApiOperation({ summary: 'Create a new tax configuration' })
  create(@Body() dto: CreateTaxDto) {
    return this.taxesService.create(dto);
  }

  @Get()
  @RequirePermissions('finance.view_reports')
  @ApiOperation({ summary: 'Get all taxes for a store' })
  @ApiQuery({ name: 'storeId', required: false })
  findAll(@Query('storeId') storeId?: string) {
    return this.taxesService.findAllByStore(storeId || '');
  }

  @Get(':id')
  @RequirePermissions('finance.view_reports')
  @ApiOperation({ summary: 'Get tax by ID' })
  findOne(@Param('id') id: string) {
    return this.taxesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('finance.manage_tax')
  @ApiOperation({ summary: 'Update tax configuration' })
  update(@Param('id') id: string, @Body() dto: UpdateTaxDto) {
    return this.taxesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('finance.manage_tax')
  @ApiOperation({ summary: 'Delete tax configuration' })
  remove(@Param('id') id: string) {
    return this.taxesService.remove(id);
  }
}

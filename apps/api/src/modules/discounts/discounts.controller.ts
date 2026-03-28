import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard, RequirePermissions } from '../auth/guards';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto, UpdateDiscountDto } from './dto';

@ApiTags('Discounts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  @RequirePermissions('finance.manage_discount')
  @ApiOperation({ summary: 'Create a new discount' })
  create(@Body() dto: CreateDiscountDto) {
    return this.discountsService.create(dto);
  }

  @Get()
  @RequirePermissions('finance.view_reports')
  @ApiOperation({ summary: 'Get all discounts for a store' })
  @ApiQuery({ name: 'storeId', required: true })
  findAll(@Query('storeId') storeId: string) {
    return this.discountsService.findAllByStore(storeId);
  }

  @Get('active')
  @RequirePermissions('pos.apply_discount')
  @ApiOperation({ summary: 'Get currently active discounts for a store' })
  @ApiQuery({ name: 'storeId', required: true })
  findActive(@Query('storeId') storeId: string) {
    return this.discountsService.findActiveByStore(storeId);
  }

  @Get('voucher')
  @RequirePermissions('pos.apply_discount')
  @ApiOperation({ summary: 'Find discount by voucher code' })
  @ApiQuery({ name: 'storeId', required: true })
  @ApiQuery({ name: 'code', required: true })
  findByVoucher(@Query('storeId') storeId: string, @Query('code') code: string) {
    return this.discountsService.findByVoucherCode(storeId, code);
  }

  @Get(':id')
  @RequirePermissions('finance.view_reports')
  @ApiOperation({ summary: 'Get discount by ID' })
  findOne(@Param('id') id: string) {
    return this.discountsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('finance.manage_discount')
  @ApiOperation({ summary: 'Update discount' })
  update(@Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.discountsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('finance.manage_discount')
  @ApiOperation({ summary: 'Delete discount' })
  remove(@Param('id') id: string) {
    return this.discountsService.remove(id);
  }
}

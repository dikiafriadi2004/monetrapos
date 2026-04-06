import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { FnbOrdersService } from './fnb-orders.service';
import { CreateFnbOrderDto } from './dto/create-fnb-order.dto';
import { UpdateFnbOrderDto, UpdateOrderStatusDto } from './dto/update-fnb-order.dto';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { OrderStatus, OrderType } from './fnb-order.entity';

@Controller('fnb/orders')
@UseGuards(MemberJwtGuard)
export class FnbOrdersController {
  constructor(private readonly fnbOrdersService: FnbOrdersService) {}

  @Post()
  create(@Body() createFnbOrderDto: CreateFnbOrderDto, @Request() req) {
    return this.fnbOrdersService.create(createFnbOrderDto, req.user.companyId);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('store_id') storeId?: string,
    @Query('status') status?: OrderStatus,
    @Query('order_type') orderType?: OrderType,
  ) {
    return this.fnbOrdersService.findAll(
      req.user.companyId,
      storeId,
      status,
      orderType,
    );
  }

  @Get('kitchen-display')
  getKitchenDisplay(@Request() req, @Query('store_id') storeId?: string) {
    return this.fnbOrdersService.getKitchenDisplay(req.user.companyId, storeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.fnbOrdersService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFnbOrderDto: UpdateFnbOrderDto,
    @Request() req,
  ) {
    return this.fnbOrdersService.update(id, updateFnbOrderDto, req.user.companyId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
    @Request() req,
  ) {
    return this.fnbOrdersService.updateStatus(id, updateStatusDto, req.user.companyId);
  }
}

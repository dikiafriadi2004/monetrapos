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
import { AuthGuard } from '@nestjs/passport';
import { OrderStatus, OrderType } from './fnb-order.entity';

@Controller('fnb/orders')
@UseGuards(AuthGuard('jwt'))
export class FnbOrdersController {
  constructor(private readonly fnbOrdersService: FnbOrdersService) {}

  @Post()
  create(@Body() createFnbOrderDto: CreateFnbOrderDto, @Request() req) {
    return this.fnbOrdersService.create(createFnbOrderDto, req.user.company_id);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('store_id') storeId?: string,
    @Query('status') status?: OrderStatus,
    @Query('order_type') orderType?: OrderType,
  ) {
    return this.fnbOrdersService.findAll(
      req.user.company_id,
      storeId,
      status,
      orderType,
    );
  }

  @Get('kitchen-display')
  getKitchenDisplay(@Request() req, @Query('store_id') storeId?: string) {
    return this.fnbOrdersService.getKitchenDisplay(req.user.company_id, storeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.fnbOrdersService.findOne(id, req.user.company_id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFnbOrderDto: UpdateFnbOrderDto,
    @Request() req,
  ) {
    return this.fnbOrdersService.update(id, updateFnbOrderDto, req.user.company_id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
    @Request() req,
  ) {
    return this.fnbOrdersService.updateStatus(id, updateStatusDto, req.user.company_id);
  }
}

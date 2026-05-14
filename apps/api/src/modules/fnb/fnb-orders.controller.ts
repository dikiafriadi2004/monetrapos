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
  Res,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable, interval, switchMap, map } from 'rxjs';
import { Response } from 'express';
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
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.fnbOrdersService.findAll(
      req.user.companyId,
      storeId,
      status,
      orderType,
      startDate,
      endDate,
    );
  }

  @Get('kitchen-display')
  getKitchenDisplay(@Request() req, @Query('store_id') storeId?: string) {
    return this.fnbOrdersService.getKitchenDisplay(req.user.companyId, storeId);
  }

  /**
   * SSE endpoint for real-time KDS updates.
   * Client connects once and receives updates every 3 seconds.
   * No WebSocket needed — works with EventSource in browser.
   */
  @Get('kitchen-display/stream')
  @Sse()
  kitchenDisplayStream(
    @Request() req,
    @Query('store_id') storeId?: string,
  ): Observable<MessageEvent> {
    const companyId = req.user?.companyId;
    return interval(3000).pipe(
      switchMap(() => this.fnbOrdersService.getKitchenDisplay(companyId, storeId)),
      map((data) => ({ data: JSON.stringify(data) } as MessageEvent)),
    );
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

  /** Add items to existing order (tambah pesanan) */
  @Post(':id/items')
  addItems(
    @Param('id') id: string,
    @Body() body: { items: Array<{ product_id: string; product_name: string; unit_price: number; quantity: number; variant_name?: string; notes?: string }> },
    @Request() req,
  ) {
    return this.fnbOrdersService.addItems(id, body.items, req.user.companyId);
  }
}

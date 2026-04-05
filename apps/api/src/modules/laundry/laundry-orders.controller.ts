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
import { AuthGuard } from '@nestjs/passport';
import { LaundryOrdersService } from './laundry-orders.service';
import { CreateLaundryOrderDto } from './dto/create-laundry-order.dto';
import { UpdateLaundryOrderDto, UpdateLaundryOrderStatusDto } from './dto/update-laundry-order.dto';
import { LaundryOrderStatus } from './laundry-order.entity';

@Controller('laundry/orders')
@UseGuards(AuthGuard('jwt'))
export class LaundryOrdersController {
  constructor(private readonly ordersService: LaundryOrdersService) {}

  @Post()
  create(@Body() createDto: CreateLaundryOrderDto, @Request() req) {
    return this.ordersService.create(createDto, req.user.companyId);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('store_id') storeId?: string,
    @Query('status') status?: LaundryOrderStatus,
    @Query('customer_id') customerId?: string,
  ) {
    return this.ordersService.findAll(req.user.companyId, storeId, status, customerId);
  }

  @Get('schedule')
  getSchedule(
    @Request() req,
    @Query('store_id') storeId?: string,
    @Query('date') date?: string,
  ) {
    return this.ordersService.getSchedule(req.user.companyId, storeId, date);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.ordersService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLaundryOrderDto,
    @Request() req,
  ) {
    return this.ordersService.update(id, updateDto, req.user.companyId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateLaundryOrderStatusDto,
    @Request() req,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto, req.user.companyId);
  }

  @Post(':id/items')
  addItems(
    @Param('id') id: string,
    @Body() body: { items: any[] },
    @Request() req,
  ) {
    return this.ordersService.addItems(id, body.items, req.user.companyId);
  }
}

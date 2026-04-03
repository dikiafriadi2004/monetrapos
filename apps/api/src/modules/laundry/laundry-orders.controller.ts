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
import { LaundryOrdersService } from './laundry-orders.service';
import { CreateLaundryOrderDto } from './dto/create-laundry-order.dto';
import { UpdateLaundryOrderDto, UpdateLaundryOrderStatusDto } from './dto/update-laundry-order.dto';
// TODO: Import actual guards when auth module is updated
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LaundryOrderStatus } from './laundry-order.entity';

@Controller('laundry/orders')
// @UseGuards(JwtAuthGuard)
export class LaundryOrdersController {
  constructor(private readonly ordersService: LaundryOrdersService) {}

  @Post()
  create(@Body() createDto: CreateLaundryOrderDto, @Request() req) {
    return this.ordersService.create(createDto, req.user.company_id);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('store_id') storeId?: string,
    @Query('status') status?: LaundryOrderStatus,
    @Query('customer_id') customerId?: string,
  ) {
    return this.ordersService.findAll(req.user.company_id, storeId, status, customerId);
  }

  @Get('schedule')
  getSchedule(
    @Request() req,
    @Query('store_id') storeId?: string,
    @Query('date') date?: string,
  ) {
    return this.ordersService.getSchedule(req.user.company_id, storeId, date);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.ordersService.findOne(id, req.user.company_id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLaundryOrderDto,
    @Request() req,
  ) {
    return this.ordersService.update(id, updateDto, req.user.company_id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateLaundryOrderStatusDto,
    @Request() req,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto, req.user.company_id);
  }

  @Post(':id/items')
  addItems(
    @Param('id') id: string,
    @Body() body: { items: any[] },
    @Request() req,
  ) {
    return this.ordersService.addItems(id, body.items, req.user.company_id);
  }
}

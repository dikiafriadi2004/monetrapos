import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { PurchaseOrderStatus } from './purchase-order.entity';

@Controller('purchase-orders')
@UseGuards(MemberJwtGuard)
export class PurchaseOrdersController {
  constructor(
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  @Post()
  create(@Request() req, @Body() createDto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(
      req.user.companyId,
      req.user.id,
      createDto,
    );
  }

  @Get()
  findAll(
    @Request() req,
    @Query('status') status?: PurchaseOrderStatus,
    @Query('supplier_id') supplierId?: string,
    @Query('store_id') storeId?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
  ) {
    const filters: any = {};

    if (status) filters.status = status;
    if (supplierId) filters.supplier_id = supplierId;
    if (storeId) filters.store_id = storeId;
    if (fromDate) filters.from_date = new Date(fromDate);
    if (toDate) filters.to_date = new Date(toDate);

    return this.purchaseOrdersService.findAll(req.user.companyId, filters);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.purchaseOrdersService.findOne(req.user.companyId, id);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.update(
      req.user.companyId,
      id,
      updateDto,
    );
  }

  @Patch(':id/status')
  updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body('status') status: PurchaseOrderStatus,
  ) {
    return this.purchaseOrdersService.updateStatus(
      req.user.companyId,
      id,
      status,
    );
  }

  @Post(':id/receive')
  receive(
    @Request() req,
    @Param('id') id: string,
    @Body() receiveDto: ReceivePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.receivePurchaseOrder(
      req.user.companyId,
      id,
      req.user.id,
      receiveDto,
    );
  }

  @Post(':id/cancel')
  cancel(@Request() req, @Param('id') id: string) {
    return this.purchaseOrdersService.cancel(req.user.companyId, id);
  }
}

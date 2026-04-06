import {
  Controller,
  Get,
  Post,
  Patch,
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
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { PermissionGuard, RequirePermissions } from '../auth/guards';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, VoidTransactionDto } from './dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(MemberJwtGuard, PermissionGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @RequirePermissions('pos.create_transaction')
  @ApiOperation({ summary: 'Create a new transaction' })
  create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @Get()
  @RequirePermissions('finance.view_transactions')
  @ApiOperation({ summary: 'Get all transactions for a store (paginated)' })
  @ApiQuery({ name: 'storeId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('storeId') storeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.transactionsService.findAllByStore(
      storeId,
      startDate,
      endDate,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('report')
  @RequirePermissions('finance.view_reports')
  @ApiOperation({ summary: 'Get sales report summary' })
  @ApiQuery({ name: 'storeId', required: true })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  getSalesReport(
    @Query('storeId') storeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.transactionsService.getSalesReport(storeId, startDate, endDate);
  }

  @Get('invoice/:invoiceNumber')
  @RequirePermissions('finance.view_transactions')
  @ApiOperation({ summary: 'Get transaction by invoice number' })
  findByInvoice(@Param('invoiceNumber') invoiceNumber: string) {
    return this.transactionsService.findByInvoice(invoiceNumber);
  }

  @Get(':id/receipt')
  @RequirePermissions('finance.view_transactions')
  @ApiOperation({ summary: 'Get transaction receipt' })
  getReceipt(@Param('id') id: string) {
    return this.transactionsService.getReceipt(id);
  }

  @Get(':id')
  @RequirePermissions('finance.view_transactions')
  @ApiOperation({ summary: 'Get transaction by ID' })
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Patch(':id/void')
  @RequirePermissions('pos.void_transaction')
  @ApiOperation({ summary: 'Void a transaction' })
  voidTransaction(@Param('id') id: string, @Body() dto: VoidTransactionDto) {
    return this.transactionsService.voidTransaction(id, dto);
  }

  @Patch(':id/refund')
  @RequirePermissions('pos.refund')
  @ApiOperation({ summary: 'Refund a transaction' })
  refundTransaction(@Param('id') id: string) {
    return this.transactionsService.refundTransaction(id);
  }
}

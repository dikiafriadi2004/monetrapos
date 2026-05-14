import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
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

  @Get('export-pdf')
  @RequirePermissions('finance.view_transactions')
  @ApiOperation({ summary: 'Export transactions as PDF' })
  @ApiQuery({ name: 'storeId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async exportPdf(
    @Query('storeId') storeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const PDFKit = require('pdfkit');
    const result = await this.transactionsService.findAllByStore(storeId, startDate, endDate, 1, 1000);
    const transactions = Array.isArray(result) ? result : (result as any).data || [];

    const doc = new PDFKit({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="transactions-${startDate || 'all'}-${endDate || 'all'}.pdf"`);
    doc.pipe(res);

    // Title
    doc.fontSize(16).font('Helvetica-Bold').text('Laporan Transaksi', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#666')
      .text(`Periode: ${startDate || '-'} s/d ${endDate || '-'}`, { align: 'center' });
    doc.moveDown(1);

    // Summary
    const total = transactions.reduce((s: number, t: any) => s + Number(t.total || 0), 0);
    const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    doc.fontSize(10).fillColor('#000')
      .text(`Total Transaksi: ${transactions.length}   |   Total Pendapatan: ${fmt(total)}`, { align: 'center' });
    doc.moveDown(1);

    // Table header
    const cols = [60, 100, 80, 100, 80, 80, 80, 80];
    const headers = ['Invoice', 'Tanggal', 'Kasir', 'Pelanggan', 'Subtotal', 'Diskon', 'Pajak', 'Total'];
    let y = doc.y;
    doc.rect(40, y, 762, 18).fill('#6366f1');
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
    let x = 40;
    headers.forEach((h, i) => { doc.text(h, x + 3, y + 4, { width: cols[i], lineBreak: false }); x += cols[i]; });
    doc.fillColor('#000').font('Helvetica');
    y += 18;

    // Rows
    transactions.forEach((t: any, idx: number) => {
      if (y > 520) { doc.addPage({ layout: 'landscape' }); y = 40; }
      const bg = idx % 2 === 0 ? '#f8f9fa' : 'white';
      doc.rect(40, y, 762, 16).fill(bg);
      doc.fillColor('#000').fontSize(7);
      x = 40;
      const date = t.createdAt ? new Date(t.createdAt).toLocaleDateString('id-ID') : '-';
      const row = [
        t.invoiceNumber || t.transactionNumber || '-',
        date,
        t.employee?.name || t.metadata?.employeeName || '-',
        t.customerName || '-',
        fmt(Number(t.subtotal || 0)),
        fmt(Number(t.discountAmount || 0)),
        fmt(Number(t.taxAmount || 0)),
        fmt(Number(t.total || 0)),
      ];
      row.forEach((val, i) => { doc.text(String(val), x + 3, y + 3, { width: cols[i] - 4, lineBreak: false }); x += cols[i]; });
      y += 16;
    });

    doc.end();
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

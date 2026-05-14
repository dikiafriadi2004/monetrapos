import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFKit: any = require('pdfkit');
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { PermissionGuard, RequirePermissions } from '../auth/guards';
import { ReportsService } from './reports.service';
import {
  SalesReportQueryDto,
  SalesReportResponseDto,
  ProductPerformanceQueryDto,
  ProductPerformanceResponseDto,
  InventoryReportQueryDto,
  InventoryReportResponseDto,
  DashboardQueryDto,
  DashboardResponseDto,
} from './dto';

@Controller('reports')
@UseGuards(MemberJwtGuard, PermissionGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  async getDashboard(
    @Request() req: any,
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardResponseDto> {
    const companyId = req.user.companyId;
    return this.reportsService.getDashboard(companyId, query);
  }

  @Get('sales')
  @RequirePermissions('finance.view_reports')
  @HttpCode(HttpStatus.OK)
  async getSalesReport(
    @Request() req: any,
    @Query() query: SalesReportQueryDto,
  ): Promise<SalesReportResponseDto> {
    const companyId = req.user.companyId;
    return this.reportsService.getSalesReport(companyId, query);
  }

  @Get('sales/export')
  @RequirePermissions('finance.view_reports')
  async exportSalesReport(
    @Request() req: any,
    @Query() query: SalesReportQueryDto,
    @Res() res: Response,
  ) {
    const companyId = req.user.companyId;
    const report = await this.reportsService.getSalesReport(companyId, query);
    const rows = report.daily || report.weekly || report.monthly || [];
    const headers = Object.keys(rows[0] || { date: '', revenue: 0, transactions: 0 });
    const csv = [
      headers.join(','),
      ...rows.map((r: any) => headers.map(h => r[h] ?? '').join(',')),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sales-report-${query.startDate}-${query.endDate}.csv"`);
    res.send(csv);
  }

  @Get('products')
  @RequirePermissions('finance.view_reports')
  @HttpCode(HttpStatus.OK)
  async getProductPerformance(
    @Request() req: any,
    @Query() query: ProductPerformanceQueryDto,
  ): Promise<ProductPerformanceResponseDto> {
    const companyId = req.user.companyId;
    return this.reportsService.getProductPerformance(companyId, query);
  }

  @Get('inventory')
  @RequirePermissions('finance.view_reports', 'inventory.view')
  @HttpCode(HttpStatus.OK)
  async getInventoryReport(
    @Request() req: any,
    @Query() query: InventoryReportQueryDto,
  ): Promise<InventoryReportResponseDto> {
    const companyId = req.user.companyId;
    return this.reportsService.getInventoryReport(companyId, query);
  }

  @Get('inventory/export')
  @RequirePermissions('finance.view_reports', 'inventory.view')
  async exportInventoryReport(
    @Request() req: any,
    @Query() query: InventoryReportQueryDto,
    @Res() res: Response,
  ) {
    const companyId = req.user.companyId;
    const report = await this.reportsService.getInventoryReport(companyId, query);
    const products = report.products || [];
    const headers = ['productId', 'productName', 'sku', 'categoryName', 'stock', 'lowStockThreshold', 'isLowStock', 'cost', 'inventoryValue'];
    const csv = [
      headers.join(','),
      ...products.map((p: any) => headers.map(h => {
        const v = p[h] ?? '';
        return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
      }).join(',')),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="inventory-report.csv"`);
    res.send(csv);
  }

  // ─── PDF Export Endpoints ────────────────────────────────────────────────────

  @Get('products/export-pdf')
  @RequirePermissions('finance.view_reports')
  async exportProductReportPdf(
    @Request() req: any,
    @Query() query: ProductPerformanceQueryDto,
    @Res() res: Response,
  ) {
    const companyId = req.user.companyId;
    const report = await this.reportsService.getProductPerformance(companyId, query);
    const products = report.topProducts || [];
    const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

    const doc = new PDFKit({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="product-report-${query.startDate}-${query.endDate}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text('Laporan Performa Produk', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Periode: ${query.startDate} s/d ${query.endDate}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).font('Helvetica-Bold').text('Ringkasan');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Produk: ${report.summary.totalProducts}`);
    doc.text(`Total Pendapatan: ${fmt(report.summary.totalRevenue)}`);
    doc.text(`Total Profit: ${fmt(report.summary.totalProfit)}`);
    doc.moveDown();

    if (products.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Top Produk');
      doc.moveDown(0.5);
      const cols = [180, 60, 70, 100, 80, 80];
      const startX = 40;
      let y = doc.y;

      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('Produk', startX, y, { width: cols[0] });
      doc.text('SKU', startX + cols[0], y, { width: cols[1] });
      doc.text('Terjual', startX + cols[0] + cols[1], y, { width: cols[2], align: 'right' });
      doc.text('Pendapatan', startX + cols[0] + cols[1] + cols[2], y, { width: cols[3], align: 'right' });
      doc.text('Profit', startX + cols[0] + cols[1] + cols[2] + cols[3], y, { width: cols[4], align: 'right' });
      doc.text('Harga Rata-rata', startX + cols[0] + cols[1] + cols[2] + cols[3] + cols[4], y, { width: cols[5], align: 'right' });
      y += 14;
      doc.moveTo(startX, y).lineTo(startX + cols.reduce((a, b) => a + b, 0), y).stroke();
      y += 4;

      doc.fontSize(8).font('Helvetica');
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        if (y > 540) { doc.addPage(); y = 40; }
        const x0 = startX;
        doc.text(`${i + 1}. ${p.productName}`, x0, y, { width: cols[0] });
        doc.text(p.sku || '', x0 + cols[0], y, { width: cols[1] });
        doc.text(String(p.quantitySold), x0 + cols[0] + cols[1], y, { width: cols[2], align: 'right' });
        doc.fillColor('#10b981').text(fmt(p.revenue), x0 + cols[0] + cols[1] + cols[2], y, { width: cols[3], align: 'right' });
        doc.fillColor('#f59e0b').text(fmt(p.profit), x0 + cols[0] + cols[1] + cols[2] + cols[3], y, { width: cols[4], align: 'right' });
        doc.fillColor('#111827').text(fmt(p.averagePrice), x0 + cols[0] + cols[1] + cols[2] + cols[3] + cols[4], y, { width: cols[5], align: 'right' });
        y += 14;
      }
    }

    doc.end();
  }

  @Get('sales/export-pdf')
  @RequirePermissions('finance.view_reports')
  async exportSalesReportPdf(
    @Request() req: any,
    @Query() query: SalesReportQueryDto,
    @Res() res: Response,
  ) {
    const companyId = req.user.companyId;
    const report = await this.reportsService.getSalesReport(companyId, query);
    const rows = report.daily || report.weekly || report.monthly || [];
    const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

    const doc = new PDFKit({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sales-report-${query.startDate}-${query.endDate}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('Laporan Penjualan', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Periode: ${query.startDate} s/d ${query.endDate}`, { align: 'center' });
    doc.moveDown();

    // Summary
    doc.fontSize(12).font('Helvetica-Bold').text('Ringkasan');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Pendapatan: ${fmt(report.summary.totalRevenue)}`);
    doc.text(`Total Transaksi: ${report.summary.totalTransactions}`);
    doc.text(`Rata-rata Transaksi: ${fmt(report.summary.averageTransaction)}`);
    doc.text(`Total Pajak: ${fmt(report.summary.totalTax)}`);
    doc.text(`Total Diskon: ${fmt(report.summary.totalDiscount)}`);
    doc.moveDown();

    // Table
    if (rows.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Detail');
      doc.moveDown(0.5);
      const colW = [200, 150, 100];
      const startX = 40;
      let y = doc.y;

      // Header row
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Tanggal/Periode', startX, y, { width: colW[0] });
      doc.text('Pendapatan', startX + colW[0], y, { width: colW[1], align: 'right' });
      doc.text('Transaksi', startX + colW[0] + colW[1], y, { width: colW[2], align: 'right' });
      y += 16;
      doc.moveTo(startX, y).lineTo(startX + colW[0] + colW[1] + colW[2], y).stroke();
      y += 4;

      doc.fontSize(9).font('Helvetica');
      for (const row of rows as any[]) {
        if (y > 750) { doc.addPage(); y = 40; }
        const label = row.date || row.week || row.month || '';
        doc.text(label, startX, y, { width: colW[0] });
        doc.text(fmt(row.revenue), startX + colW[0], y, { width: colW[1], align: 'right' });
        doc.text(String(row.transactions), startX + colW[0] + colW[1], y, { width: colW[2], align: 'right' });
        y += 16;
      }
    }

    doc.end();
  }

  @Get('inventory/export-pdf')
  @RequirePermissions('finance.view_reports', 'inventory.view')
  async exportInventoryReportPdf(
    @Request() req: any,
    @Query() query: InventoryReportQueryDto,
    @Res() res: Response,
  ) {
    const companyId = req.user.companyId;
    const report = await this.reportsService.getInventoryReport(companyId, query);
    const products = report.products || [];
    const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

    const doc = new PDFKit({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="inventory-report.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text('Laporan Inventori', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, { align: 'center' });
    doc.moveDown();

    // Summary
    doc.fontSize(12).font('Helvetica-Bold').text('Ringkasan');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Produk: ${report.summary.totalProducts}`);
    doc.text(`Produk Stok Rendah: ${report.summary.lowStockProducts}`);
    doc.text(`Total Nilai Inventori: ${fmt(report.summary.totalInventoryValue)}`);
    doc.moveDown();

    // Table
    if (products.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Detail Produk');
      doc.moveDown(0.5);
      const cols = [180, 60, 80, 60, 60, 100];
      const startX = 40;
      let y = doc.y;

      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('Produk', startX, y, { width: cols[0] });
      doc.text('SKU', startX + cols[0], y, { width: cols[1] });
      doc.text('Kategori', startX + cols[0] + cols[1], y, { width: cols[2] });
      doc.text('Stok', startX + cols[0] + cols[1] + cols[2], y, { width: cols[3], align: 'right' });
      doc.text('Min', startX + cols[0] + cols[1] + cols[2] + cols[3], y, { width: cols[4], align: 'right' });
      doc.text('Nilai', startX + cols[0] + cols[1] + cols[2] + cols[3] + cols[4], y, { width: cols[5], align: 'right' });
      y += 14;
      doc.moveTo(startX, y).lineTo(startX + cols.reduce((a, b) => a + b, 0), y).stroke();
      y += 4;

      doc.fontSize(8).font('Helvetica');
      for (const p of products) {
        if (y > 540) { doc.addPage(); y = 40; }
        const x0 = startX;
        doc.text(p.productName, x0, y, { width: cols[0] });
        doc.text(p.sku || '', x0 + cols[0], y, { width: cols[1] });
        doc.text(p.categoryName || '', x0 + cols[0] + cols[1], y, { width: cols[2] });
        const stockColor = p.isLowStock ? '#ef4444' : '#111827';
        doc.fillColor(stockColor).text(String(p.stock), x0 + cols[0] + cols[1] + cols[2], y, { width: cols[3], align: 'right' });
        doc.fillColor('#111827').text(String(p.lowStockThreshold), x0 + cols[0] + cols[1] + cols[2] + cols[3], y, { width: cols[4], align: 'right' });
        doc.text(fmt(p.inventoryValue), x0 + cols[0] + cols[1] + cols[2] + cols[3] + cols[4], y, { width: cols[5], align: 'right' });
        y += 14;
      }
    }

    doc.end();
  }
}

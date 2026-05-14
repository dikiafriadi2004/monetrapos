import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { AdvancedReportsService } from './advanced-reports.service';

@Controller('reports/advanced')
@UseGuards(MemberJwtGuard)
export class AdvancedReportsController {
  constructor(
    private readonly advancedReportsService: AdvancedReportsService,
  ) {}

  /**
   * Get employee performance report
   */
  @Get('employee-performance')
  async getEmployeePerformance(
    @Request() req,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('employee_id') employeeId?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('start_date and end_date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const report = await this.advancedReportsService.getEmployeePerformance(
      req.user.companyId,
      start,
      end,
      employeeId,
    );

    return {
      period: {
        startDate: start,
        endDate: end,
      },
      employees: report,
      summary: {
        totalEmployees: report.length,
        totalSales: report.reduce((sum, e) => sum + e.totalSales, 0),
        totalTransactions: report.reduce((sum, e) => sum + e.totalTransactions, 0),
        averageSalesPerEmployee:
          report.length > 0
            ? report.reduce((sum, e) => sum + e.totalSales, 0) / report.length
            : 0,
      },
    };
  }

  /**
   * Get customer report
   */
  @Get('customers')
  async getCustomerReport(
    @Request() req,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('start_date and end_date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const report = await this.advancedReportsService.getCustomerReport(
      req.user.companyId,
      start,
      end,
    );

    return {
      period: {
        startDate: start,
        endDate: end,
      },
      ...report,
    };
  }

  /**
   * Get profit/loss report
   */
  @Get('profit-loss')
  async getProfitLossReport(
    @Request() req,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('start_date and end_date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    return await this.advancedReportsService.getProfitLossReport(
      req.user.companyId,
      start,
      end,
    );
  }

  /**
   * Laporan Keuangan Bulanan - Pendapatan Kotor, Bersih, Keuntungan per bulan
   */
  @Get('monthly-finance')
  async getMonthlyFinanceReport(
    @Request() req,
    @Query('year') year?: string,
  ) {
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    return await this.advancedReportsService.getMonthlyFinanceReport(
      req.user.companyId,
      targetYear,
    );
  }

  // ─── Export Endpoints ────────────────────────────────────────────────────────

  @Get('employee-performance/export-csv')
  async exportEmployeeCsv(
    @Request() req,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Res() res: Response,
  ) {
    if (!startDate || !endDate) throw new BadRequestException('start_date and end_date are required');
    const report = await this.advancedReportsService.getEmployeePerformance(
      req.user.companyId, new Date(startDate), new Date(endDate),
    );
    const headers = ['Nama', 'Total Penjualan', 'Transaksi', 'Rata-rata Transaksi', 'Jam Kerja', 'Penjualan/Jam'];
    const rows = report.map(e => [
      e.employeeName,
      e.totalSales,
      e.totalTransactions,
      e.averageTransactionValue.toFixed(0),
      (e.totalWorkHours || 0).toFixed(1),
      (e.salesPerHour || 0).toFixed(0),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="employee-performance-${startDate}-${endDate}.csv"`);
    res.send(csv);
  }

  @Get('customers/export-csv')
  async exportCustomerCsv(
    @Request() req,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Res() res: Response,
  ) {
    if (!startDate || !endDate) throw new BadRequestException('start_date and end_date are required');
    const report = await this.advancedReportsService.getCustomerReport(
      req.user.companyId, new Date(startDate), new Date(endDate),
    );
    const headers = ['Nama', 'Total Belanja', 'Total Order', 'Tier', 'Terakhir Beli'];
    const rows = (report.topCustomers || []).map((c: any) => [
      c.customerName,
      c.totalSpent,
      c.totalOrders,
      c.loyaltyTier || '-',
      c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toLocaleDateString('id-ID') : '-',
    ]);
    const csv = [headers.join(','), ...rows.map((r: any) => r.map((v: any) => `"${v}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="customer-report-${startDate}-${endDate}.csv"`);
    res.send(csv);
  }

  @Get('profit-loss/export-csv')
  async exportProfitLossCsv(
    @Request() req,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Res() res: Response,
  ) {
    if (!startDate || !endDate) throw new BadRequestException('start_date and end_date are required');
    const report: any = await this.advancedReportsService.getProfitLossReport(
      req.user.companyId, new Date(startDate), new Date(endDate),
    );
    const rows = [
      ['Periode', `${startDate} s/d ${endDate}`],
      ['Total Penjualan', report.revenue || report.totalSales || 0],
      ['HPP', report.cogs || 0],
      ['Laba Kotor', report.grossProfit || 0],
      ['Biaya Operasional', report.expenses || 0],
      ['Laba Bersih', report.netProfit || 0],
      ['Margin Laba (%)', (report.profitMargin || 0).toFixed(2)],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="profit-loss-${startDate}-${endDate}.csv"`);
    res.send(csv);
  }

  @Get('monthly-finance/export-csv')
  async exportMonthlyFinanceCsv(
    @Request() req,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const report = await this.advancedReportsService.getMonthlyFinanceReport(
      req.user.companyId, targetYear,
    );
    const headers = [
      'Bulan', 'Total Transaksi', 'Pendapatan Kotor', 'Total Diskon',
      'Total Pajak', 'Pendapatan Bersih', 'HPP', 'Laba Kotor',
      'Biaya Operasional', 'Laba Bersih', 'Margin Laba Kotor (%)', 'Margin Laba Bersih (%)',
    ];
    const rows = report.perBulan.map((m: any) => [
      m.periode, m.totalTransaksi, m.pendapatanKotor, m.totalDiskon,
      m.totalPajak, m.pendapatanBersih, m.hpp, m.labaKotor,
      m.biayaOperasional, m.labaBersih, m.marginLabaKotor, m.marginLabaBersih,
    ]);
    const t = report.ringkasanTahunan;
    rows.push([
      `TOTAL ${targetYear}`, t.totalTransaksi, t.pendapatanKotor, t.totalDiskon,
      t.totalPajak, t.pendapatanBersih, t.hpp, t.labaKotor,
      t.biayaOperasional, t.labaBersih, t.marginLabaKotor, t.marginLabaBersih,
    ]);
    const csv = [headers, ...rows].map((r: any[]) => r.map(v => `"${v}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="laporan-keuangan-${targetYear}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  }
}

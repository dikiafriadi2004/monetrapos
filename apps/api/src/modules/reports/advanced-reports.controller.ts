import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdvancedReportsService } from './advanced-reports.service';

@Controller('reports/advanced')
@UseGuards(AuthGuard('jwt'))
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
}

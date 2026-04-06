import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
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
}

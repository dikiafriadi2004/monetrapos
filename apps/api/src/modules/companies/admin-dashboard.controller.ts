import { Controller, Get, Query, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { Invoice, InvoiceStatus } from '../billing/invoice.entity';
import { Subscription } from '../subscriptions/subscription.entity';

@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Subscription) private subscriptionRepo: Repository<Subscription>,
  ) {}

  private ensureAdmin(req: any) {
    if (req.user?.type !== 'company_admin') {
      throw new UnauthorizedException('Only platform admins can access this');
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStats(@Request() req: any) {
    this.ensureAdmin(req);

    const [realTotal, realActive, realSuspended, realPending] = await Promise.all([
      this.companyRepo.createQueryBuilder('c')
        .where('c.slug != :slug', { slug: 'super-admin' })
        .getCount(),
      this.companyRepo.createQueryBuilder('c')
        .where('c.slug != :slug AND c.status = :status', { slug: 'super-admin', status: 'active' })
        .getCount(),
      this.companyRepo.createQueryBuilder('c')
        .where('c.slug != :slug AND c.status = :status', { slug: 'super-admin', status: 'suspended' })
        .getCount(),
      this.companyRepo.createQueryBuilder('c')
        .where('c.slug != :slug AND c.status = :status', { slug: 'super-admin', status: 'pending' })
        .getCount(),
    ]);

    // Revenue from paid invoices
    const paidInvoices = await this.invoiceRepo.find({ where: { status: InvoiceStatus.PAID } });
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyInvoices = paidInvoices.filter(inv => new Date(inv.createdAt) >= startOfMonth);
    const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const yearlyInvoices = paidInvoices.filter(inv => new Date(inv.createdAt) >= startOfYear);
    const yearlyRevenue = yearlyInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

    const allInvoices = await this.invoiceRepo.find();
    const paidCount = allInvoices.filter(i => i.status === InvoiceStatus.PAID).length;
    const pendingCount = allInvoices.filter(i => i.status === InvoiceStatus.PENDING).length;
    const failedCount = allInvoices.filter(i => i.status === InvoiceStatus.FAILED || i.status === InvoiceStatus.CANCELLED).length;

    const plans = await this.subscriptionRepo
      .createQueryBuilder('s')
      .select('s.plan_id', 'planId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.plan_id')
      .getRawMany();

    return {
      totalMembers: realTotal,
      activeMembers: realActive,
      suspendedMembers: realSuspended,
      pendingMembers: realPending,
      totalRevenue,
      monthlyRevenue,
      yearlyRevenue,
      totalPlans: plans.length,
      activePlans: plans.length,
      totalTransactions: allInvoices.length,
      paidTransactions: paidCount,
      pendingTransactions: pendingCount,
      failedTransactions: failedCount,
    };
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue chart data' })
  async getRevenue(@Request() req: any, @Query('period') period: string = 'month') {
    this.ensureAdmin(req);

    const now = new Date();
    let startDate: Date;
    let days: number;

    if (period === 'week') { startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); days = 7; }
    else if (period === 'year') { startDate = new Date(now.getFullYear(), 0, 1); days = 365; }
    else { startDate = new Date(now.getFullYear(), now.getMonth(), 1); days = 30; }

    const invoices = await this.invoiceRepo.createQueryBuilder('i')
      .where('i.created_at >= :startDate AND i.status = :status', { startDate, status: InvoiceStatus.PAID })
      .getMany();

    // Group by date
    const grouped: Record<string, { amount: number; transactions: number }> = {};
    invoices.forEach(inv => {
      const date = new Date(inv.createdAt).toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = { amount: 0, transactions: 0 };
      grouped[date].amount += Number(inv.total || 0);
      grouped[date].transactions += 1;
    });

    return Object.entries(grouped).map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  @Get('member-growth')
  @ApiOperation({ summary: 'Get member growth data' })
  async getMemberGrowth(@Request() req: any, @Query('period') period: string = 'month') {
    this.ensureAdmin(req);

    const now = new Date();
    const startDate = period === 'week'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : period === 'year'
      ? new Date(now.getFullYear(), 0, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);

    const companies = await this.companyRepo.createQueryBuilder('c')
      .where('c.created_at >= :startDate AND c.slug != :slug', { startDate, slug: 'super-admin' })
      .getMany();

    const grouped: Record<string, { total: number; active: number; new: number }> = {};
    companies.forEach(c => {
      const date = new Date(c.createdAt).toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = { total: 0, active: 0, new: 0 };
      grouped[date].total += 1;
      grouped[date].new += 1;
      if (c.status === 'active') grouped[date].active += 1;
    });

    return Object.entries(grouped).map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  @Get('top-plans')
  @ApiOperation({ summary: 'Get top subscription plans' })
  async getTopPlans(@Request() req: any, @Query('limit') limit: number = 5) {
    this.ensureAdmin(req);

    const result = await this.subscriptionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.plan', 'plan')
      .select('s.plan_id', 'planId')
      .addSelect('plan.name', 'planName')
      .addSelect('COUNT(s.id)', 'subscribers')
      .groupBy('s.plan_id')
      .addGroupBy('plan.name')
      .orderBy('subscribers', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map(r => ({
      planId: r.planId,
      planName: r.planName,
      subscribers: parseInt(r.subscribers),
      revenue: 0,
    }));
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent platform activity' })
  async getRecentActivity(@Request() req: any, @Query('limit') limit: number = 10) {
    this.ensureAdmin(req);

    const recentCompanies = await this.companyRepo.createQueryBuilder('c')
      .where('c.slug != :slug', { slug: 'super-admin' })
      .orderBy('c.created_at', 'DESC')
      .limit(limit)
      .getMany();

    return recentCompanies.map(c => ({
      type: 'registration',
      companyId: c.id,
      companyName: c.name,
      status: c.status,
      createdAt: c.createdAt,
    }));
  }
}

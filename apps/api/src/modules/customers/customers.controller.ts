import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { CustomersService } from './customers.service';
import { BirthdayReminderService } from './birthday-reminder.service';
import { CreateCustomerDto, UpdateCustomerDto, AddPointsDto, RedeemPointsDto } from './dto';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(MemberJwtGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly birthdayReminderService: BirthdayReminderService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  async create(@Request() req: any, @Body() dto: CreateCustomerDto) {
    const companyId = req.user.companyId;
    // Auto-inject storeId if not provided
    if (!dto.storeId) {
      const result = await this.customersService['customerRepo'].manager.query(
        `SELECT id FROM stores WHERE company_id = ? AND is_active = 1 ORDER BY created_at ASC LIMIT 1`,
        [companyId]
      );
      if (result?.[0]?.id) dto.storeId = result[0].id;
    }
    return this.customersService.create(dto, companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers for current company' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Request() req: any,
    @Query('storeId') storeId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    const companyId = req.user.companyId;
    return this.customersService.findAll(companyId, {
      storeId,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user.companyId;
    return this.customersService.findOne(id, companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateCustomerDto) {
    const companyId = req.user.companyId;
    return this.customersService.update(id, companyId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete customer' })
  remove(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user.companyId;
    return this.customersService.remove(id, companyId);
  }

  // Loyalty Points Endpoints
  @Post('loyalty/add-points')
  @ApiOperation({ summary: 'Add loyalty points to customer' })
  addPoints(@Request() req: any, @Body() dto: AddPointsDto) {
    const companyId = req.user.companyId;
    const performedBy = req.user.userId;
    return this.customersService.addPoints(dto.customerId, companyId, dto, performedBy);
  }

  @Post('loyalty/redeem-points')
  @ApiOperation({ summary: 'Redeem loyalty points from customer' })
  redeemPoints(@Request() req: any, @Body() dto: RedeemPointsDto) {
    const companyId = req.user.companyId;
    const performedBy = req.user.userId;
    return this.customersService.redeemPoints(dto.customerId, companyId, dto, performedBy);
  }

  @Get(':id/purchase-history')
  @ApiOperation({ summary: 'Get customer purchase history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPurchaseHistory(
    @Param('id') id: string,
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const companyId = req.user.companyId;
    return this.customersService.getPurchaseHistory(id, companyId, {
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get(':id/loyalty-history')
  @ApiOperation({ summary: 'Get customer loyalty point transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getLoyaltyHistory(
    @Param('id') id: string,
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const companyId = req.user.companyId;
    return this.customersService.getLoyaltyPointHistory(id, companyId, {
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('loyalty/points-value/:points')
  @ApiOperation({ summary: 'Calculate monetary value of loyalty points' })
  getPointsValue(@Param('points') points: number) {
    // 1 point = Rp 100
    const pointValue = 100;
    return {
      points,
      value: points * pointValue,
    };
  }

  @Get('loyalty/tiers')
  @ApiOperation({ summary: 'Get loyalty tier benefits configuration' })
  getLoyaltyTiers() {
    return [
      { tier: 'regular', name: 'Regular', minSpent: 0, pointsMultiplier: 1, discountPercentage: 0, benefits: ['Basic loyalty points', 'Member discounts'], color: '#6b7280' },
      { tier: 'silver', name: 'Silver', minSpent: 1000000, pointsMultiplier: 1.5, discountPercentage: 5, benefits: ['1.5x points multiplier', '5% discount on all purchases', 'Birthday bonus points'], color: '#94a3b8' },
      { tier: 'gold', name: 'Gold', minSpent: 5000000, pointsMultiplier: 2, discountPercentage: 10, benefits: ['2x points multiplier', '10% discount on all purchases', 'Priority service', 'Birthday bonus points'], color: '#f59e0b' },
      { tier: 'platinum', name: 'Platinum', minSpent: 20000000, pointsMultiplier: 3, discountPercentage: 15, benefits: ['3x points multiplier', '15% discount on all purchases', 'VIP service', 'Free delivery', 'Exclusive member offers'], color: '#8b5cf6' },
    ];
  }

  @Get('loyalty/statistics')
  @ApiOperation({ summary: 'Get loyalty tier statistics for company' })
  async getLoyaltyStatistics(@Request() req: any) {
    const companyId = req.user.companyId;
    const rows: any[] = await this.customersService['customerRepo'].manager.query(
      `SELECT
        CASE
          WHEN total_spent >= 20000000 THEN 'platinum'
          WHEN total_spent >= 5000000 THEN 'gold'
          WHEN total_spent >= 1000000 THEN 'silver'
          ELSE 'regular'
        END AS tier,
        COUNT(*) AS count
       FROM customers
       WHERE company_id = ? AND deleted_at IS NULL
       GROUP BY tier`,
      [companyId],
    );
    const total = rows.reduce((s, r) => s + Number(r.count), 0);
    const byTier: Record<string, number> = { regular: 0, silver: 0, gold: 0, platinum: 0 };
    rows.forEach(r => { byTier[r.tier] = Number(r.count); });
    const avgRow: any[] = await this.customersService['customerRepo'].manager.query(
      `SELECT AVG(total_spent) AS avg FROM customers WHERE company_id = ? AND deleted_at IS NULL`,
      [companyId],
    );
    return { total, byTier, averageSpent: Number(avgRow[0]?.avg || 0) };
  }

  @Get('loyalty/anniversaries/upcoming')
  @ApiOperation({ summary: 'Get customers with upcoming purchase anniversaries (next 30 days)' })
  async getUpcomingAnniversaries(@Request() req: any, @Query('days') days?: number) {
    const companyId = req.user.companyId;
    const lookAhead = Number(days || 30);
    const results: any[] = [];
    const today = new Date();
    for (let i = 0; i < lookAhead; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const customers = await this.customersService['customerRepo']
        .createQueryBuilder('c')
        .where('c.companyId = :companyId', { companyId })
        .andWhere('c.firstPurchaseAt IS NOT NULL')
        .andWhere('MONTH(c.firstPurchaseAt) = :month', { month })
        .andWhere('DAY(c.firstPurchaseAt) = :day', { day })
        .getMany();
      customers.forEach(c => results.push({ ...c, anniversaryDate: d.toISOString().split('T')[0], daysUntil: i } as any));
    }
    return results;
  }

  @Post('loyalty/upgrade-all-tiers')
  @ApiOperation({ summary: 'Recalculate and upgrade all customer tiers based on total_spent' })
  async upgradeAllTiers(@Request() req: any) {
    const companyId = req.user.companyId;
    const result = await this.customersService['customerRepo'].manager.query(
      `UPDATE customers SET
        loyalty_tier = CASE
          WHEN total_spent >= 20000000 THEN 'platinum'
          WHEN total_spent >= 5000000 THEN 'gold'
          WHEN total_spent >= 1000000 THEN 'silver'
          ELSE 'regular'
        END
       WHERE company_id = ? AND deleted_at IS NULL`,
      [companyId],
    );
    return { message: 'Tiers updated', affected: result.affectedRows || 0 };
  }

  @Get('birthdays/upcoming')
  @ApiOperation({ summary: 'Get customers with upcoming birthdays (next 7 days)' })
  async getUpcomingBirthdays(@Request() req: any) {
    const companyId = req.user.companyId;
    const today = new Date();
    const results: any[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const customers = await this.customersService['customerRepo']
        .createQueryBuilder('c')
        .where('c.companyId = :companyId', { companyId })
        .andWhere('c.date_of_birth IS NOT NULL')
        .andWhere('MONTH(c.date_of_birth) = :month', { month })
        .andWhere('DAY(c.date_of_birth) = :day', { day })
        .getMany();
      customers.forEach(c => results.push({ ...c, birthdayDate: d.toISOString().split('T')[0], daysUntil: i } as any));
    }
    return results;
  }

  @Post('birthdays/send-reminders')
  @ApiOperation({ summary: 'Manually trigger birthday reminders for today' })
  async triggerBirthdayReminders(@Request() req: any) {
    const today = new Date();
    const result = await this.birthdayReminderService.sendBirthdayRemindersForDate(
      today.getMonth() + 1,
      today.getDate(),
    );
    return { message: `Sent ${result.sent} of ${result.total} birthday emails`, ...result };
  }

  @Post('sync-totals')
  @ApiOperation({ summary: 'Sync customer total_spent and total_orders from actual transactions' })
  async syncTotals(@Request() req: any) {
    const companyId = req.user.companyId;
    const updated = await this.customersService.syncCustomerTotals(companyId);
    return { message: `Synced ${updated} customers`, updated };
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionPlansService } from './subscription-plans.service';

@Controller('subscription-plans')
export class SubscriptionPlansController {
  constructor(
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  /**
   * Get all active plans (PUBLIC - no auth required)
   */
  @Get()
  async findAll() {
    return this.subscriptionPlansService.findAllActive();
  }

  /**
   * Get all active plans with duration options (PUBLIC)
   */
  @Get('with-durations')
  async findAllWithDurations() {
    return this.subscriptionPlansService.findAllActiveWithDurations();
  }

  /**
   * Get plan by slug (PUBLIC)
   */
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.subscriptionPlansService.findBySlug(slug);
  }

  /**
   * Get plan by ID (PUBLIC)
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.subscriptionPlansService.findOne(id);
  }

  /**
   * Get plan with duration options (PUBLIC)
   */
  @Get(':id/with-durations')
  async findOneWithDurations(@Param('id') id: string) {
    return this.subscriptionPlansService.findOneWithDurations(id);
  }

  /**
   * Get duration options for a plan (PUBLIC)
   */
  @Get(':id/durations')
  async getDurations(@Param('id') id: string) {
    return this.subscriptionPlansService.getDurationsByPlan(id);
  }

  // ============================================
  // ADMIN ENDPOINTS (TODO: Add admin guard)
  // ============================================

  /**
   * Create new plan (ADMIN ONLY)
   */
  @Post()
  // @UseGuards(JwtAuthGuard, AdminGuard)
  async create(
    @Body()
    body: {
      name: string;
      slug: string;
      description?: string;
      priceMonthly: number;
      priceYearly: number;
      setupFee?: number;
      trialDays?: number;
      features?: Record<string, boolean>;
      maxStores?: number;
      maxUsers?: number;
      maxEmployees?: number;
      maxProducts?: number;
      maxTransactionsPerMonth?: number;
      maxCustomers?: number;
      maxStorageMb?: number;
      isPopular?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.subscriptionPlansService.create(body);
  }

  /**
   * Update plan (ADMIN ONLY)
   */
  @Put(':id')
  // @UseGuards(JwtAuthGuard, AdminGuard)
  async update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      description: string;
      priceMonthly: number;
      priceYearly: number;
      setupFee: number;
      trialDays: number;
      features: Record<string, boolean>;
      maxStores: number;
      maxUsers: number;
      maxEmployees: number;
      maxProducts: number;
      maxTransactionsPerMonth: number;
      maxCustomers: number;
      maxStorageMb: number;
      isActive: boolean;
      isPopular: boolean;
      sortOrder: number;
    }>,
  ) {
    return this.subscriptionPlansService.update(id, body);
  }

  /**
   * Delete plan (ADMIN ONLY)
   */
  @Delete(':id')
  // @UseGuards(JwtAuthGuard, AdminGuard)
  async remove(@Param('id') id: string) {
    await this.subscriptionPlansService.remove(id);
    return { message: 'Plan deleted successfully' };
  }

  /**
   * Seed default plans (ADMIN ONLY)
   */
  @Post('seed')
  // @UseGuards(JwtAuthGuard, AdminGuard)
  async seed() {
    await this.subscriptionPlansService.seedDefaultPlans();
    return { message: 'Plans seeded successfully' };
  }

  /**
   * Create or update duration option for a plan (ADMIN ONLY)
   */
  @Post(':id/durations')
  // @UseGuards(JwtAuthGuard, AdminGuard)
  async createDuration(
    @Param('id') planId: string,
    @Body() body: { durationMonths: number },
  ) {
    return this.subscriptionPlansService.createOrUpdateDuration(
      planId,
      body.durationMonths,
    );
  }

  /**
   * Delete duration option (ADMIN ONLY)
   */
  @Delete(':id/durations/:durationMonths')
  // @UseGuards(JwtAuthGuard, AdminGuard)
  async removeDuration(
    @Param('id') planId: string,
    @Param('durationMonths') durationMonths: string,
  ) {
    await this.subscriptionPlansService.removeDuration(
      planId,
      parseInt(durationMonths, 10),
    );
    return { message: 'Duration option deleted successfully' };
  }
}

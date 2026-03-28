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
}

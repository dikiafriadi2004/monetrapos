import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  Param,
  Query,
} from '@nestjs/common';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsCron } from './subscriptions.cron';
import { BillingService } from '../billing/billing.service';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
import {
  CreateSubscriptionDto,
  ChangePlanDto,
  CancelSubscriptionDto,
  RenewSubscriptionDto,
  ReactivateSubscriptionDto,
  GetSubscriptionHistoryDto,
} from './dto';

@Controller('subscriptions')
@UseGuards(MemberJwtGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly subscriptionsCron: SubscriptionsCron,
    private readonly billingService: BillingService,
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(@Request() req: any, @Body() dto: CreateSubscriptionDto) {
    const companyId = req.user.companyId;
    return this.subscriptionsService.createSubscription(companyId, dto.planId);
  }

  @Get()
  async getSubscriptions(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.subscriptionsService.findActiveByCompany(companyId);
  }

  @Put('change-plan')
  async changePlan(@Request() req: any, @Body() dto: ChangePlanDto) {
    const companyId = req.user.companyId;
    return this.subscriptionsService.changePlan(companyId, dto.newPlanId);
  }

  @Post('cancel')
  async cancel(@Request() req: any, @Body() dto: CancelSubscriptionDto) {
    const companyId = req.user.companyId;
    const subscription =
      await this.subscriptionsService.findActiveByCompany(companyId);

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    return this.subscriptionsService.cancelSubscription(
      subscription.id,
      dto.reason,
    );
  }

  /**
   * Reactivate suspended subscription
   * Calculates new dates from today (not from old end_date)
   * Optionally accepts duration in months (1, 3, 6, or 12)
   */
  @Post('reactivate')
  async reactivate(
    @Request() req: any,
    @Body() dto: ReactivateSubscriptionDto,
  ) {
    const companyId = req.user.companyId;
    const subscription =
      await this.subscriptionsService.findActiveByCompany(companyId);

    if (!subscription) {
      throw new Error('No subscription found');
    }

    return this.subscriptionsService.reactivateSubscription(
      subscription.id,
      dto.durationMonths,
    );
  }

  /**
   * Manual trigger for subscription expiry check (for testing/admin)
   * In production, this should be protected with admin guard
   */
  @Post('check-expired')
  @HttpCode(HttpStatus.OK)
  async checkExpired() {
    return this.subscriptionsCron.triggerManualCheck();
  }

  /**
   * Renew subscription with specified duration
   * Creates invoice and returns payment URL
   */
  @Post('renew')
  @HttpCode(HttpStatus.OK)
  async renewSubscription(
    @Request() req: any,
    @Body() dto: RenewSubscriptionDto,
  ) {
    const companyId = req.user.companyId;
    return this.subscriptionsService.renewSubscription(
      companyId,
      dto.durationMonths,
      this.billingService,
      this.paymentGatewayService,
    );
  }

  /**
   * Get subscription history for company
   * Supports filtering by subscription ID and pagination
   * Returns history in reverse chronological order (newest first)
   */
  @Get('history')
  async getHistory(@Request() req: any, @Query() dto: GetSubscriptionHistoryDto) {
    const companyId = req.user.companyId;
    return this.subscriptionsService.getSubscriptionHistory(
      companyId,
      dto.subscriptionId,
      dto.page,
      dto.limit,
    );
  }

  /**
   * Get current active subscription for logged-in company
   */
  @Get('current')
  async getCurrentSubscription(@Request() req: any) {
    const companyId = req.user.companyId;
    // Try active first, then fall back to any latest subscription (pending, expired, etc.)
    let subscription = await this.subscriptionsService.findActiveByCompany(companyId);
    if (!subscription) {
      const all = await this.subscriptionsService.findByCompany(companyId);
      subscription = all[0] || null; // most recent
    }
    return subscription || null;
  }

  /**
   * Get subscription details by ID
   */
  @Get(':id')
  async getSubscription(@Param('id') id: string, @Request() req: any) {
    const subscription = await this.subscriptionsService.findOne(id);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Verify ownership
    if (subscription.companyId !== req.user.companyId) {
      throw new Error('Unauthorized');
    }

    return subscription;
  }
}

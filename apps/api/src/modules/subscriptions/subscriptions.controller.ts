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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubscriptionsService } from './subscriptions.service';
import {
  CreateSubscriptionDto,
  ChangePlanDto,
  CancelSubscriptionDto,
} from './dto';

@Controller('subscriptions')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

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
    const subscription = await this.subscriptionsService.findActiveByCompany(
      companyId,
    );

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    return this.subscriptionsService.cancelSubscription(
      subscription.id,
      dto.reason,
    );
  }

  @Post('reactivate')
  async reactivate(@Request() req: any) {
    const companyId = req.user.companyId;
    const subscription = await this.subscriptionsService.findActiveByCompany(
      companyId,
    );

    if (!subscription) {
      throw new Error('No subscription found');
    }

    return this.subscriptionsService.reactivateSubscription(subscription.id);
  }
}

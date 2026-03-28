import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus, BillingCycle } from './subscription.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Company } from '../companies/company.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  /**
   * Create new subscription (trial or paid)
   */
  async create(data: {
    companyId: string;
    planId: string;
    billingCycle: BillingCycle;
    startTrial?: boolean;
  }): Promise<Subscription> {
    // Check if company already has active subscription
    const existing = await this.subscriptionRepository.findOne({
      where: {
        companyId: data.companyId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new BadRequestException('Company already has an active subscription');
    }

    // Get plan
    const plan = await this.planRepository.findOne({
      where: { id: data.planId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // Calculate dates
    const now = new Date();
    const price =
      data.billingCycle === BillingCycle.MONTHLY
        ? plan.priceMonthly
        : plan.priceYearly;

    let subscription: Subscription;

    if (data.startTrial) {
      // Start trial
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + plan.trialDays);

      subscription = this.subscriptionRepository.create({
        companyId: data.companyId,
        planId: data.planId,
        billingCycle: data.billingCycle,
        status: SubscriptionStatus.TRIAL,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialStart: now,
        trialEnd: trialEnd,
        price,
      });
    } else {
      // Start paid subscription
      const periodEnd = new Date(now);
      if (data.billingCycle === BillingCycle.MONTHLY) {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      subscription = this.subscriptionRepository.create({
        companyId: data.companyId,
        planId: data.planId,
        billingCycle: data.billingCycle,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        price,
      });
    }

    subscription = await this.subscriptionRepository.save(subscription);

    // Update company
    await this.companyRepository.update(data.companyId, {
      currentPlanId: data.planId,
      subscriptionStatus: subscription.status,
      trialEndsAt: subscription.trialEnd,
      subscriptionEndsAt: subscription.currentPeriodEnd,
    });

    return subscription;
  }

  /**
   * Create subscription (simplified for auth flow)
   */
  async createSubscription(
    companyId: string,
    planId: string,
  ): Promise<Subscription> {
    return this.create({
      companyId,
      planId,
      billingCycle: BillingCycle.MONTHLY,
      startTrial: true,
    });
  }

  /**
   * Get company's active subscription
   */
  async findActiveByCompany(companyId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { companyId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
    });
  }

  /**
   * Get all company subscriptions (history)
   */
  async findByCompany(companyId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { companyId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Upgrade/downgrade subscription
   */
  async changePlan(
    companyId: string,
    newPlanId: string,
  ): Promise<Subscription> {
    const currentSubscription = await this.findActiveByCompany(companyId);

    if (!currentSubscription) {
      throw new NotFoundException('No active subscription found');
    }

    const newPlan = await this.planRepository.findOne({
      where: { id: newPlanId },
    });

    if (!newPlan) {
      throw new NotFoundException('New plan not found');
    }

    // Calculate new price
    const newPrice =
      currentSubscription.billingCycle === BillingCycle.MONTHLY
        ? newPlan.priceMonthly
        : newPlan.priceYearly;

    // Update subscription
    currentSubscription.planId = newPlanId;
    currentSubscription.price = newPrice;

    await this.subscriptionRepository.save(currentSubscription);

    // Update company
    await this.companyRepository.update(companyId, {
      currentPlanId: newPlanId,
    });

    // TODO: Calculate prorated amount and create invoice

    return currentSubscription;
  }

  /**
   * Cancel subscription (at period end)
   */
  async cancel(
    companyId: string,
    reason?: string,
  ): Promise<Subscription> {
    const subscription = await this.findActiveByCompany(companyId);

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    subscription.cancelAtPeriodEnd = true;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason || '';

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Cancel subscription immediately
   */
  async cancelSubscription(
    subscriptionId: string,
    reason?: string,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason || '';

    await this.subscriptionRepository.save(subscription);

    // Update company
    await this.companyRepository.update(subscription.companyId, {
      subscriptionStatus: SubscriptionStatus.CANCELLED,
    });

    return subscription;
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivate(companyId: string): Promise<Subscription> {
    const subscription = await this.findActiveByCompany(companyId);

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription is not cancelled');
    }

    subscription.cancelAtPeriodEnd = false;
    subscription.cancelledAt = null as any;
    subscription.cancellationReason = '';

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Reactivate subscription by ID
   */
  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.cancelAtPeriodEnd = false;
    subscription.cancelledAt = null as any;
    subscription.cancellationReason = '';

    await this.subscriptionRepository.save(subscription);

    // Update company
    await this.companyRepository.update(subscription.companyId, {
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    });

    return subscription;
  }

  /**
   * Renew subscription (called by cron or after payment)
   */
  async renew(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['plan'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Calculate new period
    const newPeriodStart = subscription.currentPeriodEnd;
    const newPeriodEnd = new Date(newPeriodStart);

    if (subscription.billingCycle === BillingCycle.MONTHLY) {
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
    } else {
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
    }

    subscription.currentPeriodStart = newPeriodStart;
    subscription.currentPeriodEnd = newPeriodEnd;
    subscription.status = SubscriptionStatus.ACTIVE;

    await this.subscriptionRepository.save(subscription);

    // Update company
    await this.companyRepository.update(subscription.companyId, {
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionEndsAt: newPeriodEnd,
    });

    return subscription;
  }

  /**
   * Convert trial to paid subscription
   */
  async convertTrialToPaid(companyId: string): Promise<Subscription> {
    const subscription = await this.findActiveByCompany(companyId);

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    if (subscription.status !== SubscriptionStatus.TRIAL) {
      throw new BadRequestException('Subscription is not in trial');
    }

    // Calculate new period
    const now = new Date();
    const periodEnd = new Date(now);

    if (subscription.billingCycle === BillingCycle.MONTHLY) {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = periodEnd;

    await this.subscriptionRepository.save(subscription);

    // Update company
    await this.companyRepository.update(companyId, {
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionEndsAt: periodEnd,
    });

    return subscription;
  }

  /**
   * Expire subscription (called by cron)
   */
  async expire(subscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.status = SubscriptionStatus.EXPIRED;
    await this.subscriptionRepository.save(subscription);

    // Update company
    await this.companyRepository.update(subscription.companyId, {
      subscriptionStatus: SubscriptionStatus.EXPIRED,
    });
  }

  /**
   * Check and expire subscriptions (cron job)
   */
  async checkExpiredSubscriptions(): Promise<void> {
    const now = new Date();

    const expiredSubscriptions = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
      },
    });

    for (const subscription of expiredSubscriptions) {
      if (subscription.currentPeriodEnd < now) {
        if (subscription.cancelAtPeriodEnd) {
          await this.expire(subscription.id);
        } else {
          // TODO: Generate invoice and attempt renewal
          // For now, mark as past_due
          subscription.status = SubscriptionStatus.PAST_DUE;
          await this.subscriptionRepository.save(subscription);
        }
      }
    }
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Subscription,
  SubscriptionStatus,
  BillingCycle,
} from './subscription.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Company } from '../companies/company.entity';
import {
  SubscriptionHistory,
  SubscriptionHistoryAction,
} from './subscription-history.entity';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(SubscriptionHistory)
    private readonly historyRepository: Repository<SubscriptionHistory>,
  ) {}

  /**
   * Saat downgrade paket, nonaktifkan cabang yang melebihi limit baru
   * Cabang yang dibuat paling awal tetap aktif, sisanya dinonaktifkan
   */
  private async enforceStoreLimit(companyId: string, maxStores: number): Promise<void> {
    try {
      const result = await this.companyRepository.manager.query(
        `SELECT id, name, is_active, created_at FROM stores WHERE company_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
        [companyId]
      );
      const stores = result as Array<{ id: string; name: string; is_active: boolean; created_at: Date }>;
      const activeStores = stores.filter(s => s.is_active);

      if (activeStores.length > maxStores) {
        // Nonaktifkan cabang yang melebihi limit (yang paling baru dibuat)
        const storesToDeactivate = activeStores.slice(maxStores);
        for (const store of storesToDeactivate) {
          await this.companyRepository.manager.query(
            `UPDATE stores SET is_active = 0 WHERE id = ?`,
            [store.id]
          );
          this.logger.warn(`Store ${store.name} (${store.id}) dinonaktifkan karena downgrade paket`);
        }
        this.logger.log(`Downgrade: ${storesToDeactivate.length} cabang dinonaktifkan untuk company ${companyId}`);
      }
    } catch (e) {
      this.logger.error('enforceStoreLimit error:', e.message);
    }
  }

  /**
   * Create new subscription (trial or paid)
   */
  async create(data: {
    companyId: string;
    planId: string;
    billingCycle: BillingCycle;
    startTrial?: boolean;
    durationMonths?: number;
  }): Promise<Subscription> {
    // Check if company already has active subscription
    const existing = await this.subscriptionRepository.findOne({
      where: {
        companyId: data.companyId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Company already has an active subscription',
      );
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
      // Create pending subscription (wait for payment)
      subscription = this.subscriptionRepository.create({
        companyId: data.companyId,
        planId: data.planId,
        billingCycle: data.billingCycle,
        status: SubscriptionStatus.PENDING,
        price,
        durationMonths: data.durationMonths || 1,
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

    // Log subscription creation
    const action = data.startTrial
      ? SubscriptionHistoryAction.TRIAL_STARTED
      : SubscriptionHistoryAction.CREATED;
    await this.logHistory({
      subscriptionId: subscription.id,
      companyId: data.companyId,
      planId: data.planId,
      action,
      newStatus: subscription.status,
      newEndDate: subscription.currentPeriodEnd || subscription.trialEnd,
      amount: price,
      notes: data.startTrial
        ? `Trial subscription started for ${plan.trialDays} days`
        : 'Subscription created (pending payment)',
      metadata: {
        billingCycle: data.billingCycle,
        trialDays: plan.trialDays,
      },
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

    const oldPlanId = currentSubscription.planId;
    const oldPrice = currentSubscription.price;

    const newPlan = await this.planRepository.findOne({
      where: { id: newPlanId },
    });

    if (!newPlan) {
      throw new NotFoundException('New plan not found');
    }

    // Get old plan for comparison
    const oldPlan = await this.planRepository.findOne({
      where: { id: oldPlanId },
    });

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

    // Determine if upgrade or downgrade
    const isUpgrade = newPrice > oldPrice;

    // Jika downgrade: nonaktifkan cabang yang melebihi limit baru
    if (!isUpgrade && newPlan.maxStores !== -1) {
      await this.enforceStoreLimit(companyId, newPlan.maxStores);
    }
    const action = isUpgrade
      ? SubscriptionHistoryAction.UPGRADED
      : SubscriptionHistoryAction.DOWNGRADED;

    // Log plan change
    await this.logHistory({
      subscriptionId: currentSubscription.id,
      companyId,
      planId: newPlanId,
      action,
      oldStatus: currentSubscription.status,
      newStatus: currentSubscription.status,
      amount: newPrice,
      notes: `Plan changed from ${oldPlan?.name || 'Unknown'} to ${newPlan.name}`,
      metadata: {
        oldPlanId,
        oldPlanName: oldPlan?.name,
        newPlanName: newPlan.name,
        oldPrice,
        newPrice,
        billingCycle: currentSubscription.billingCycle,
      },
    });

    // TODO: Calculate prorated amount and create invoice

    return currentSubscription;
  }

  /**
   * Cancel subscription (at period end)
   */
  async cancel(companyId: string, reason?: string): Promise<Subscription> {
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

    const oldStatus = subscription.status;

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason || '';

    await this.subscriptionRepository.save(subscription);

    // Update company
    await this.companyRepository.update(subscription.companyId, {
      subscriptionStatus: SubscriptionStatus.CANCELLED,
    });

    // Log cancellation
    await this.logHistory({
      subscriptionId: subscription.id,
      companyId: subscription.companyId,
      planId: subscription.planId,
      action: SubscriptionHistoryAction.CANCELLED,
      oldStatus,
      newStatus: SubscriptionStatus.CANCELLED,
      oldEndDate: subscription.endDate,
      notes: reason || 'Subscription cancelled',
      metadata: {
        cancelledAt: subscription.cancelledAt.toISOString(),
        reason,
      },
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
   * For suspended subscriptions, calculates new dates from today
   * 
   * Requirements:
   * - Calculate new start_date as current_date (today)
   * - Calculate new end_date from current_date + duration
   * - Update subscription status to 'active'
   * - Clear grace_period_end_date
   * - Update company subscription_status to 'active'
   * - Restore full access (handled by middleware)
   * - Log reactivation in subscription_history table
   * 
   * @param subscriptionId - The subscription ID to reactivate
   * @param durationMonths - Optional duration in months (uses original duration if not provided)
   * @returns The reactivated subscription
   */
  async reactivateSubscription(
    subscriptionId: string,
    durationMonths?: number,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['plan'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Store old values for history logging
    const oldStatus = subscription.status;
    const oldStartDate = subscription.startDate;
    const oldEndDate = subscription.endDate;

    // Calculate new dates from TODAY (not from old end_date)
    const now = new Date();
    const newStartDate = now;
    const newEndDate = new Date(now);

    // Use provided duration or original duration or default to 1 month
    const duration = durationMonths || subscription.durationMonths || 1;
    newEndDate.setMonth(newEndDate.getMonth() + duration);

    // Update subscription
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.startDate = newStartDate;
    subscription.endDate = newEndDate;
    subscription.durationMonths = duration;
    subscription.gracePeriodEndDate = null as any;
    subscription.cancelAtPeriodEnd = false;
    subscription.cancelledAt = null as any;
    subscription.cancellationReason = '';

    await this.subscriptionRepository.save(subscription);

    // Update company subscription_status to 'active'
    await this.companyRepository.update(subscription.companyId, {
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionEndsAt: newEndDate,
    });

    // Log reactivation in subscription_history table
    await this.logHistory({
      subscriptionId: subscription.id,
      companyId: subscription.companyId,
      planId: subscription.planId,
      action: SubscriptionHistoryAction.REACTIVATED,
      oldStatus,
      newStatus: SubscriptionStatus.ACTIVE,
      oldEndDate,
      newEndDate,
      notes: `Subscription reactivated for ${duration} month${duration > 1 ? 's' : ''}. New dates calculated from today.`,
      metadata: {
        durationMonths: duration,
        oldStartDate: oldStartDate?.toISOString(),
        newStartDate: newStartDate.toISOString(),
        reactivatedAt: now.toISOString(),
      },
    });

    this.logger.log(
      `Subscription ${subscriptionId} reactivated. Status: ${oldStatus} → ${SubscriptionStatus.ACTIVE}. New period: ${newStartDate.toISOString()} to ${newEndDate.toISOString()}`,
    );

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

    const oldStatus = subscription.status;
    const oldEndDate = subscription.currentPeriodEnd;

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

    // Log trial conversion
    await this.logHistory({
      subscriptionId: subscription.id,
      companyId,
      planId: subscription.planId,
      action: SubscriptionHistoryAction.TRIAL_CONVERTED,
      oldStatus,
      newStatus: SubscriptionStatus.ACTIVE,
      oldEndDate,
      newEndDate: periodEnd,
      amount: subscription.price,
      notes: 'Trial converted to paid subscription',
      metadata: {
        billingCycle: subscription.billingCycle,
        convertedAt: now.toISOString(),
      },
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
  /**
   * Check and update expired subscriptions
   * This method should be called daily by cron job
   *
   * Flow:
   * 1. Find active subscriptions that have passed end_date
   * 2. Set status to 'expired' and calculate grace_period_end_date (end_date + 3 days)
   * 3. Find expired subscriptions that have passed grace_period_end_date
   * 4. Set status to 'suspended'
   * 5. Update company subscription_status accordingly
   */
  async checkExpiredSubscriptions(): Promise<void> {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    // Step 1: Find active subscriptions that have passed end_date
    const activeSubscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.status = :status', {
        status: SubscriptionStatus.ACTIVE,
      })
      .andWhere('subscription.end_date < :now', { now })
      .getMany();

    for (const subscription of activeSubscriptions) {
      // Calculate grace period end date (3 days after end_date)
      const gracePeriodEndDate = new Date(subscription.endDate);
      gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + 3);

      const oldStatus = subscription.status;

      // Update subscription to expired
      subscription.status = SubscriptionStatus.EXPIRED;
      subscription.gracePeriodEndDate = gracePeriodEndDate;
      await this.subscriptionRepository.save(subscription);

      // Update company subscription status
      await this.companyRepository.update(subscription.companyId, {
        subscriptionStatus: 'expired',
      });

      // Log expiration
      await this.logHistory({
        subscriptionId: subscription.id,
        companyId: subscription.companyId,
        planId: subscription.planId,
        action: SubscriptionHistoryAction.EXPIRED,
        oldStatus,
        newStatus: SubscriptionStatus.EXPIRED,
        oldEndDate: subscription.endDate,
        notes: `Subscription expired. Grace period until ${gracePeriodEndDate.toISOString()}`,
        metadata: {
          gracePeriodEndDate: gracePeriodEndDate.toISOString(),
          expiredAt: now.toISOString(),
        },
      });

      this.logger.log(
        `Subscription ${subscription.id} expired. Grace period until ${gracePeriodEndDate.toISOString()}`,
      );
    }

    // Step 2: Find expired subscriptions that have passed grace_period_end_date
    const expiredSubscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.status = :status', {
        status: SubscriptionStatus.EXPIRED,
      })
      .andWhere('subscription.grace_period_end_date < :now', { now })
      .getMany();

    for (const subscription of expiredSubscriptions) {
      const oldStatus = subscription.status;

      // Update subscription to suspended
      subscription.status = SubscriptionStatus.SUSPENDED;
      await this.subscriptionRepository.save(subscription);

      // Update company subscription status
      await this.companyRepository.update(subscription.companyId, {
        subscriptionStatus: 'suspended',
      });

      // Log suspension
      await this.logHistory({
        subscriptionId: subscription.id,
        companyId: subscription.companyId,
        planId: subscription.planId,
        action: SubscriptionHistoryAction.SUSPENDED,
        oldStatus,
        newStatus: SubscriptionStatus.SUSPENDED,
        notes: 'Subscription suspended after grace period',
        metadata: {
          suspendedAt: now.toISOString(),
          gracePeriodEndDate: subscription.gracePeriodEndDate?.toISOString(),
        },
      });

      this.logger.log(
        `Subscription ${subscription.id} suspended after grace period`,
      );
    }

    this.logger.log(
      `Checked subscriptions: ${activeSubscriptions.length} expired, ${expiredSubscriptions.length} suspended`,
    );
  }

  /**
   * Find subscription by ID
   */
  async findOne(id: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { id },
      relations: ['plan'],
    });
  }

  /**
   * Update subscription
   */
  async update(id: string, data: Partial<Subscription>): Promise<Subscription> {
    const subscription = await this.findOne(id);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    Object.assign(subscription, data);
    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Renew subscription with payment
   * This creates an invoice and returns payment URL
   * Actual renewal happens after payment success
   */
  async renewSubscription(
    companyId: string,
    durationMonths: number,
    billingService: any,
    paymentGatewayService: any,
  ): Promise<{
    subscription: Subscription;
    invoice: any;
    paymentUrl: string;
  }> {
    // Find active or expired subscription
    const subscription = await this.subscriptionRepository.findOne({
      where: [
        { companyId, status: SubscriptionStatus.ACTIVE },
        { companyId, status: SubscriptionStatus.EXPIRED },
        { companyId, status: SubscriptionStatus.SUSPENDED },
      ],
      relations: ['plan', 'company'],
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found for this company');
    }

    // Get plan
    const plan = await this.planRepository.findOne({
      where: { id: subscription.planId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // Get company details
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['owner'],
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Calculate price based on duration
    const basePrice = plan.priceMonthly;
    let discount = 0;

    // Apply duration discounts
    if (durationMonths === 3) {
      discount = 0.05; // 5% discount
    } else if (durationMonths === 6) {
      discount = 0.1; // 10% discount
    } else if (durationMonths === 12) {
      discount = 0.2; // 20% discount
    }

    const subtotal = basePrice * durationMonths;
    const discountAmount = subtotal * discount;
    const total = subtotal - discountAmount;

    // Calculate new end date
    let newEndDate: Date;
    if (
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.endDate
    ) {
      // Extend from current end date
      newEndDate = new Date(subscription.endDate);
    } else {
      // Start from today (for expired/suspended)
      newEndDate = new Date();
    }
    newEndDate.setMonth(newEndDate.getMonth() + durationMonths);

    // Create invoice
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 days to pay

    const invoice = await billingService.createInvoice({
      companyId,
      subscriptionId: subscription.id,
      subtotal,
      discountAmount,
      total,
      dueDate,
      lineItems: [
        {
          description: `${plan.name} - ${durationMonths} month${durationMonths > 1 ? 's' : ''} renewal`,
          quantity: durationMonths,
          unitPrice: basePrice,
          amount: subtotal,
        },
      ],
    });

    // Update invoice type to renewal
    invoice.invoiceType = 'renewal' as any;
    await billingService.invoiceRepository.save(invoice);

    // Create payment transaction
    const paymentTransaction = await billingService.createPaymentTransaction({
      invoiceId: invoice.id,
      companyId,
      gateway: 'xendit' as any,
      amount: total,
      currency: 'IDR',
    });

    // Generate payment URL via Xendit
    const paymentResponse = await paymentGatewayService.createPaymentUrl({
      orderId: paymentTransaction.id,
      amount: total,
      customerName: company.name,
      customerEmail: company.email,
      customerPhone: company.phone,
      itemDetails: [
        {
          id: subscription.id,
          name: `${plan.name} - ${durationMonths} month renewal`,
          price: total,
          quantity: 1,
        },
      ],
    });

    // Update payment transaction with gateway transaction ID
    await billingService.updatePaymentTransaction(paymentTransaction.id, {
      status: 'pending' as any,
      gatewayTransactionId: paymentResponse.orderId,
    });

    // Update invoice with payment URL
    invoice.paymentUrl = paymentResponse.redirectUrl;
    await billingService.invoiceRepository.save(invoice);

    // Store renewal info in subscription (will be applied after payment)
    subscription.pendingRenewal = {
      durationMonths,
      newEndDate: newEndDate.toISOString(),
      amount: total,
      invoiceId: invoice.id,
    } as any;
    await this.subscriptionRepository.save(subscription);

    // Log subscription history
    await this.logHistory({
      subscriptionId: subscription.id,
      companyId,
      planId: plan.id,
      action: 'renewal_initiated' as any,
      oldStatus: subscription.status,
      newStatus: subscription.status,
      oldEndDate: subscription.endDate,
      newEndDate,
      amount: total,
      notes: `Renewal initiated for ${durationMonths} months`,
      metadata: {
        durationMonths,
        discount,
        discountAmount,
        invoiceId: invoice.id,
      },
    });

    this.logger.log(
      `Renewal initiated for subscription ${subscription.id}: ${durationMonths} months, amount: ${total}`,
    );

    return {
      subscription,
      invoice,
      paymentUrl: paymentResponse.redirectUrl,
    };
  }

  /**
   * Apply renewal after payment success
   * Called by webhook handler after payment is confirmed
   * Handles both renewals (for active subscriptions) and reactivations (for suspended/expired)
   */
  async applyRenewal(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['plan'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (!subscription.pendingRenewal) {
      throw new BadRequestException('No pending renewal found');
    }

    const pendingRenewal = subscription.pendingRenewal as any;
    const durationMonths = pendingRenewal.durationMonths;
    const newEndDate = new Date(pendingRenewal.newEndDate);

    // Store old values for history logging
    const oldStatus = subscription.status;
    const oldEndDate = subscription.endDate;

    // Determine if this is a reactivation (suspended/expired) or renewal (active)
    const isReactivation =
      subscription.status === SubscriptionStatus.SUSPENDED ||
      subscription.status === SubscriptionStatus.EXPIRED;

    // Calculate new start date
    let newStartDate: Date;
    if (
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.endDate
    ) {
      // For active subscriptions, start date remains the same or is the old end date
      newStartDate = subscription.startDate || new Date();
    } else {
      // For expired/suspended, start from today
      newStartDate = new Date();
    }

    // Update subscription
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.startDate = newStartDate;
    subscription.endDate = newEndDate;
    subscription.durationMonths = durationMonths;
    subscription.gracePeriodEndDate = null as any;
    subscription.pendingRenewal = null as any;

    await this.subscriptionRepository.save(subscription);

    // Update company
    await this.companyRepository.update(subscription.companyId, {
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionEndsAt: newEndDate,
    });

    // Log subscription history with appropriate action
    const action = isReactivation
      ? SubscriptionHistoryAction.REACTIVATED
      : SubscriptionHistoryAction.RENEWED;
    const notes = isReactivation
      ? `Subscription reactivated for ${durationMonths} months via payment. New dates calculated from today.`
      : `Subscription renewed for ${durationMonths} months`;

    await this.logHistory({
      subscriptionId: subscription.id,
      companyId: subscription.companyId,
      planId: subscription.planId,
      action,
      oldStatus,
      newStatus: SubscriptionStatus.ACTIVE,
      oldEndDate,
      newEndDate,
      amount: pendingRenewal.amount,
      notes,
      metadata: {
        durationMonths,
        invoiceId: pendingRenewal.invoiceId,
        isReactivation,
        oldStartDate: subscription.startDate?.toISOString(),
        newStartDate: newStartDate.toISOString(),
      },
    });

    this.logger.log(
      `Subscription ${subscriptionId} ${isReactivation ? 'reactivated' : 'renewed'} successfully. Status: ${oldStatus} → ${SubscriptionStatus.ACTIVE}. New period: ${newStartDate.toISOString()} to ${newEndDate.toISOString()}`,
    );

    return subscription;
  }

  /**
   * Log subscription history
   */
  async logHistory(data: {
    subscriptionId: string;
    companyId: string;
    planId?: string;
    action: SubscriptionHistoryAction;
    oldStatus?: SubscriptionStatus;
    newStatus?: SubscriptionStatus;
    oldEndDate?: Date;
    newEndDate?: Date;
    amount?: number;
    notes?: string;
    metadata?: Record<string, any>;
    performedBy?: string;
  }): Promise<SubscriptionHistory> {
    const history = this.historyRepository.create(data);
    return this.historyRepository.save(history);
  }

  /**
   * Get subscription history for a company with pagination
   * @param companyId - Company ID
   * @param subscriptionId - Optional subscription ID to filter by
   * @param page - Page number (1-indexed)
   * @param limit - Number of records per page
   * @returns Paginated subscription history
   */
  async getSubscriptionHistory(
    companyId: string,
    subscriptionId?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: SubscriptionHistory[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: any = { companyId };
    if (subscriptionId) {
      where.subscriptionId = subscriptionId;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await this.historyRepository.findAndCount({
      where,
      relations: ['plan', 'subscription'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

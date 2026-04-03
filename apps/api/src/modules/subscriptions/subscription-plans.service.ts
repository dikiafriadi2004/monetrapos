import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';
import { SubscriptionDuration } from './subscription-duration.entity';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(SubscriptionDuration)
    private readonly durationRepository: Repository<SubscriptionDuration>,
  ) {}

  /**
   * Get all active subscription plans (public)
   */
  async findAllActive(): Promise<SubscriptionPlan[]> {
    return this.planRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Get all active plans with duration options
   */
  async findAllActiveWithDurations(): Promise<SubscriptionPlan[]> {
    return this.planRepository.find({
      where: { isActive: true },
      relations: ['durations'],
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Get plan with all duration options
   */
  async findOneWithDurations(id: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ['durations'],
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  /**
   * Get all plans (admin only)
   */
  async findAll(): Promise<SubscriptionPlan[]> {
    return this.planRepository.find({
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Get plan by ID
   */
  async findOne(id: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepository.findOne({ where: { id } });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  /**
   * Get plan by slug
   */
  async findBySlug(slug: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepository.findOne({ where: { slug } });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  /**
   * Get plan by code (alias for findBySlug)
   */
  async findByCode(code: string): Promise<SubscriptionPlan | null> {
    return this.planRepository.findOne({ where: { slug: code } });
  }

  /**
   * Create new plan (admin only)
   */
  async create(data: {
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
  }): Promise<SubscriptionPlan> {
    const plan = this.planRepository.create(data);
    return this.planRepository.save(plan);
  }

  /**
   * Update plan (admin only)
   */
  async update(
    id: string,
    data: Partial<{
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
  ): Promise<SubscriptionPlan> {
    const plan = await this.findOne(id);
    Object.assign(plan, data);
    return this.planRepository.save(plan);
  }

  /**
   * Delete plan (admin only)
   */
  async remove(id: string): Promise<void> {
    const plan = await this.findOne(id);
    await this.planRepository.softRemove(plan);
  }

  /**
   * Calculate final price based on duration and discount
   * @param basePrice - Monthly base price
   * @param durationMonths - Duration in months (1, 3, 6, 12)
   * @returns Object with subtotal, discount, and final price
   */
  calculateDurationPrice(
    basePrice: number,
    durationMonths: number,
  ): {
    subtotal: number;
    discountPercentage: number;
    discountAmount: number;
    finalPrice: number;
  } {
    const discountMap: Record<number, number> = {
      1: 0, // 0% discount
      3: 5, // 5% discount
      6: 10, // 10% discount
      12: 20, // 20% discount
    };

    const discountPercentage = discountMap[durationMonths] || 0;
    const subtotal = basePrice * durationMonths;
    const discountAmount = (subtotal * discountPercentage) / 100;
    const finalPrice = subtotal - discountAmount;

    return {
      subtotal,
      discountPercentage,
      discountAmount,
      finalPrice,
    };
  }

  /**
   * Create or update duration pricing for a plan
   * @param planId - Plan ID
   * @param durationMonths - Duration in months (1, 3, 6, 12)
   * @returns Created or updated SubscriptionDuration
   */
  async createOrUpdateDuration(
    planId: string,
    durationMonths: number,
  ): Promise<SubscriptionDuration> {
    // Validate plan exists
    const plan = await this.findOne(planId);

    // Calculate pricing
    const { discountPercentage, finalPrice } = this.calculateDurationPrice(
      Number(plan.priceMonthly),
      durationMonths,
    );

    // Check if duration already exists
    const existing = await this.durationRepository.findOne({
      where: { planId, durationMonths },
    });

    if (existing) {
      // Update existing
      existing.discountPercentage = discountPercentage;
      existing.finalPrice = finalPrice;
      return this.durationRepository.save(existing);
    }

    // Create new
    const duration = this.durationRepository.create({
      planId,
      durationMonths,
      discountPercentage,
      finalPrice,
    });

    return this.durationRepository.save(duration);
  }

  /**
   * Get all duration options for a plan
   * @param planId - Plan ID
   * @returns Array of SubscriptionDuration
   */
  async getDurationsByPlan(planId: string): Promise<SubscriptionDuration[]> {
    return this.durationRepository.find({
      where: { planId },
      order: { durationMonths: 'ASC' },
    });
  }

  /**
   * Delete a duration option
   * @param planId - Plan ID
   * @param durationMonths - Duration in months
   */
  async removeDuration(planId: string, durationMonths: number): Promise<void> {
    const duration = await this.durationRepository.findOne({
      where: { planId, durationMonths },
    });

    if (!duration) {
      throw new NotFoundException('Duration option not found');
    }

    await this.durationRepository.remove(duration);
  }

  /**
   * Seed default plans
   */
  async seedDefaultPlans(): Promise<void> {
    const existingPlans = await this.planRepository.count();

    if (existingPlans > 0) {
      console.log('Plans already seeded, skipping...');
      return;
    }

    const plans = [
      {
        name: 'Starter',
        slug: 'starter',
        description: 'Perfect for small businesses just getting started',
        priceMonthly: 299000,
        priceYearly: 2990000, // 2 months free
        setupFee: 0,
        trialDays: 14,
        features: {
          pos_terminal: true,
          inventory: true,
          basic_reports: true,
          receipt_printing: true,
          customer_loyalty: true,
          email_support: true,
          mobile_app: false,
          api_access: false,
          multi_store: false,
          kds: false,
          online_ordering: false,
        },
        maxStores: 1,
        maxUsers: 5,
        maxEmployees: 10,
        maxProducts: 100,
        maxTransactionsPerMonth: 1000,
        maxCustomers: 500,
        maxStorageMb: 1000,
        isPopular: false,
        sortOrder: 1,
      },
      {
        name: 'Professional',
        slug: 'professional',
        description: 'For growing businesses with multiple locations',
        priceMonthly: 599000,
        priceYearly: 5990000,
        setupFee: 0,
        trialDays: 14,
        features: {
          pos_terminal: true,
          inventory: true,
          advanced_reports: true,
          receipt_printing: true,
          customer_loyalty: true,
          email_support: true,
          phone_support: true,
          mobile_app: true,
          api_access: true,
          multi_store: true,
          kds: true,
          online_ordering: true,
          delivery_management: false,
        },
        maxStores: 3,
        maxUsers: 20,
        maxEmployees: 50,
        maxProducts: 1000,
        maxTransactionsPerMonth: 10000,
        maxCustomers: 5000,
        maxStorageMb: 5000,
        isPopular: true,
        sortOrder: 2,
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'For large businesses with advanced needs',
        priceMonthly: 1499000,
        priceYearly: 14990000,
        setupFee: 0,
        trialDays: 30,
        features: {
          pos_terminal: true,
          inventory: true,
          advanced_reports: true,
          receipt_printing: true,
          customer_loyalty: true,
          priority_support: true,
          dedicated_manager: true,
          mobile_app: true,
          api_access: true,
          custom_domain: true,
          white_label: true,
          multi_store: true,
          kds: true,
          online_ordering: true,
          delivery_management: true,
          custom_integrations: true,
        },
        maxStores: 999,
        maxUsers: 999,
        maxEmployees: 999,
        maxProducts: 999999,
        maxTransactionsPerMonth: 999999,
        maxCustomers: 999999,
        maxStorageMb: 50000,
        isPopular: false,
        sortOrder: 3,
      },
    ];

    for (const planData of plans) {
      const plan = await this.create(planData as any);

      // Seed duration options for each plan
      await this.seedDurationOptionsForPlan(plan.id);
    }

    console.log('✅ Default subscription plans seeded successfully');
  }

  /**
   * Seed duration options for a plan (1, 3, 6, 12 months)
   * @param planId - Plan ID
   */
  async seedDurationOptionsForPlan(planId: string): Promise<void> {
    const durations = [1, 3, 6, 12];

    for (const durationMonths of durations) {
      await this.createOrUpdateDuration(planId, durationMonths);
    }

    console.log(`✅ Duration options seeded for plan ${planId}`);
  }
}

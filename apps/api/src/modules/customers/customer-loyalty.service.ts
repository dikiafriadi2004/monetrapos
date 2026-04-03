import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Customer } from './customer.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

export enum LoyaltyTier {
  REGULAR = 'regular',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

export interface TierBenefits {
  tier: LoyaltyTier;
  minSpent: number;
  pointsMultiplier: number;
  discountPercentage: number;
  description: string;
}

@Injectable()
export class CustomerLoyaltyService {
  private readonly logger = new Logger(CustomerLoyaltyService.name);

  // Tier thresholds (in IDR)
  private readonly tierThresholds: TierBenefits[] = [
    {
      tier: LoyaltyTier.REGULAR,
      minSpent: 0,
      pointsMultiplier: 1,
      discountPercentage: 0,
      description: 'Regular customer',
    },
    {
      tier: LoyaltyTier.SILVER,
      minSpent: 5000000, // 5 juta
      pointsMultiplier: 1.25,
      discountPercentage: 5,
      description: 'Silver member - 5% discount, 1.25x points',
    },
    {
      tier: LoyaltyTier.GOLD,
      minSpent: 15000000, // 15 juta
      pointsMultiplier: 1.5,
      discountPercentage: 10,
      description: 'Gold member - 10% discount, 1.5x points',
    },
    {
      tier: LoyaltyTier.PLATINUM,
      minSpent: 50000000, // 50 juta
      pointsMultiplier: 2,
      discountPercentage: 15,
      description: 'Platinum member - 15% discount, 2x points',
    },
  ];

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue,
  ) {}

  /**
   * Get tier benefits for a specific tier
   */
  getTierBenefits(tier: LoyaltyTier): TierBenefits {
    return this.tierThresholds.find((t) => t.tier === tier) || this.tierThresholds[0];
  }

  /**
   * Get all tier benefits
   */
  getAllTierBenefits(): TierBenefits[] {
    return this.tierThresholds;
  }

  /**
   * Calculate appropriate tier based on total spent
   */
  calculateTier(totalSpent: number): LoyaltyTier {
    // Find the highest tier the customer qualifies for
    const sortedTiers = [...this.tierThresholds].sort((a, b) => b.minSpent - a.minSpent);
    
    for (const tier of sortedTiers) {
      if (totalSpent >= tier.minSpent) {
        return tier.tier;
      }
    }

    return LoyaltyTier.REGULAR;
  }

  /**
   * Update customer tier based on total spent
   */
  async updateCustomerTier(customerId: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    const newTier = this.calculateTier(Number(customer.totalSpent));
    const oldTier = customer.loyaltyTier;

    if (newTier !== oldTier) {
      customer.loyaltyTier = newTier;
      await this.customerRepository.save(customer);

      this.logger.log(
        `Customer ${customer.customerNumber} upgraded from ${oldTier} to ${newTier}`,
      );

      // Queue tier upgrade notification
      await this.notificationsQueue.add('tier-upgrade', {
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        oldTier,
        newTier,
        benefits: this.getTierBenefits(newTier as LoyaltyTier),
      });
    }

    return customer;
  }

  /**
   * Check and upgrade all customers' tiers (run daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async checkAndUpgradeAllTiers(): Promise<void> {
    this.logger.log('Starting daily tier upgrade check...');

    try {
      const customers = await this.customerRepository.find({
        where: { isActive: true },
      });

      let upgradedCount = 0;

      for (const customer of customers) {
        const newTier = this.calculateTier(Number(customer.totalSpent));
        
        if (newTier !== customer.loyaltyTier) {
          await this.updateCustomerTier(customer.id);
          upgradedCount++;
        }
      }

      this.logger.log(`Tier upgrade check completed. ${upgradedCount} customers upgraded.`);
    } catch (error) {
      this.logger.error('Failed to check and upgrade tiers', error);
    }
  }

  /**
   * Get customers with birthdays in date range
   */
  async getCustomersWithBirthdays(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Customer[]> {
    // Get month and day range
    const startMonth = startDate.getMonth() + 1;
    const startDay = startDate.getDate();
    const endMonth = endDate.getMonth() + 1;
    const endDay = endDate.getDate();

    const query = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.company_id = :companyId', { companyId })
      .andWhere('customer.is_active = :isActive', { isActive: true })
      .andWhere('customer.date_of_birth IS NOT NULL');

    // Handle same month
    if (startMonth === endMonth) {
      query.andWhere(
        'MONTH(customer.date_of_birth) = :month AND DAY(customer.date_of_birth) BETWEEN :startDay AND :endDay',
        { month: startMonth, startDay, endDay },
      );
    } else {
      // Handle cross-month range
      query.andWhere(
        '(MONTH(customer.date_of_birth) = :startMonth AND DAY(customer.date_of_birth) >= :startDay) OR ' +
        '(MONTH(customer.date_of_birth) = :endMonth AND DAY(customer.date_of_birth) <= :endDay)',
        { startMonth, startDay, endMonth, endDay },
      );
    }

    return await query.getMany();
  }

  /**
   * Get customers with anniversaries (first purchase) in date range
   */
  async getCustomersWithAnniversaries(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Customer[]> {
    const startMonth = startDate.getMonth() + 1;
    const startDay = startDate.getDate();
    const endMonth = endDate.getMonth() + 1;
    const endDay = endDate.getDate();

    const query = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.company_id = :companyId', { companyId })
      .andWhere('customer.is_active = :isActive', { isActive: true })
      .andWhere('customer.first_purchase_at IS NOT NULL');

    // Handle same month
    if (startMonth === endMonth) {
      query.andWhere(
        'MONTH(customer.first_purchase_at) = :month AND DAY(customer.first_purchase_at) BETWEEN :startDay AND :endDay',
        { month: startMonth, startDay, endDay },
      );
    } else {
      // Handle cross-month range
      query.andWhere(
        '(MONTH(customer.first_purchase_at) = :startMonth AND DAY(customer.first_purchase_at) >= :startDay) OR ' +
        '(MONTH(customer.first_purchase_at) = :endMonth AND DAY(customer.first_purchase_at) <= :endDay)',
        { startMonth, startDay, endMonth, endDay },
      );
    }

    return await query.getMany();
  }

  /**
   * Send birthday reminders (run daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendBirthdayReminders(): Promise<void> {
    this.logger.log('Checking for birthdays today...');

    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all companies (we need to check per company)
      const companies = await this.customerRepository
        .createQueryBuilder('customer')
        .select('DISTINCT customer.company_id', 'company_id')
        .getRawMany();

      let totalReminders = 0;

      for (const { company_id } of companies) {
        const customers = await this.getCustomersWithBirthdays(
          company_id,
          today,
          today,
        );

        for (const customer of customers) {
          // Queue birthday notification
          await this.notificationsQueue.add('birthday-reminder', {
            customerId: customer.id,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            companyId: customer.companyId,
            dateOfBirth: customer.dateOfBirth,
          });

          totalReminders++;
        }
      }

      this.logger.log(`Sent ${totalReminders} birthday reminders`);
    } catch (error) {
      this.logger.error('Failed to send birthday reminders', error);
    }
  }

  /**
   * Send anniversary reminders (run daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendAnniversaryReminders(): Promise<void> {
    this.logger.log('Checking for anniversaries today...');

    try {
      const today = new Date();

      // Get all companies
      const companies = await this.customerRepository
        .createQueryBuilder('customer')
        .select('DISTINCT customer.company_id', 'company_id')
        .getRawMany();

      let totalReminders = 0;

      for (const { company_id } of companies) {
        const customers = await this.getCustomersWithAnniversaries(
          company_id,
          today,
          today,
        );

        for (const customer of customers) {
          // Calculate years since first purchase
          const firstPurchase = new Date(customer.firstPurchaseAt);
          const yearsSince = today.getFullYear() - firstPurchase.getFullYear();

          // Only send for 1+ year anniversaries
          if (yearsSince >= 1) {
            // Queue anniversary notification
            await this.notificationsQueue.add('anniversary-reminder', {
              customerId: customer.id,
              customerName: customer.name,
              customerEmail: customer.email,
              customerPhone: customer.phone,
              companyId: customer.companyId,
              firstPurchaseAt: customer.firstPurchaseAt,
              yearsSince,
            });

            totalReminders++;
          }
        }
      }

      this.logger.log(`Sent ${totalReminders} anniversary reminders`);
    } catch (error) {
      this.logger.error('Failed to send anniversary reminders', error);
    }
  }

  /**
   * Get upcoming birthdays for a company
   */
  async getUpcomingBirthdays(
    companyId: string,
    daysAhead: number = 7,
  ): Promise<Customer[]> {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await this.getCustomersWithBirthdays(companyId, today, futureDate);
  }

  /**
   * Get upcoming anniversaries for a company
   */
  async getUpcomingAnniversaries(
    companyId: string,
    daysAhead: number = 7,
  ): Promise<Customer[]> {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await this.getCustomersWithAnniversaries(companyId, today, futureDate);
  }

  /**
   * Get customer tier statistics for a company
   */
  async getTierStatistics(companyId: string): Promise<{
    total: number;
    byTier: Record<LoyaltyTier, number>;
    averageSpent: number;
  }> {
    const customers = await this.customerRepository.find({
      where: { companyId, isActive: true },
    });

    const stats = {
      total: customers.length,
      byTier: {
        [LoyaltyTier.REGULAR]: 0,
        [LoyaltyTier.SILVER]: 0,
        [LoyaltyTier.GOLD]: 0,
        [LoyaltyTier.PLATINUM]: 0,
      },
      averageSpent: 0,
    };

    let totalSpent = 0;

    for (const customer of customers) {
      stats.byTier[customer.loyaltyTier as LoyaltyTier]++;
      totalSpent += Number(customer.totalSpent);
    }

    stats.averageSpent = customers.length > 0 ? totalSpent / customers.length : 0;

    return stats;
  }
}

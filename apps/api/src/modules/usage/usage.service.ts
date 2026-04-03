import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageTracking, UsageMetric } from './usage-tracking.entity';
import { Company } from '../companies/company.entity';
import { SubscriptionPlan } from '../subscriptions/subscription-plan.entity';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageTracking)
    private readonly usageRepository: Repository<UsageTracking>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
  ) {}

  /**
   * Get current usage for a metric in the current period
   */
  async getCurrentUsage(
    companyId: string,
    metric: UsageMetric,
  ): Promise<number> {
    const { periodStart, periodEnd } = this.getCurrentPeriod();

    const usage = await this.usageRepository.findOne({
      where: {
        companyId,
        metric,
        periodStart,
        periodEnd,
      },
    });

    return usage?.count || 0;
  }

  /**
   * Increment usage for a metric
   */
  async incrementUsage(
    companyId: string,
    metric: UsageMetric,
    amount: number = 1,
  ): Promise<void> {
    const { periodStart, periodEnd } = this.getCurrentPeriod();

    // Find or create usage record
    let usage = await this.usageRepository.findOne({
      where: {
        companyId,
        metric,
        periodStart,
        periodEnd,
      },
    });

    if (usage) {
      usage.count += amount;
    } else {
      usage = this.usageRepository.create({
        companyId,
        metric,
        count: amount,
        periodStart,
        periodEnd,
      });
    }

    await this.usageRepository.save(usage);
  }

  /**
   * Check if company has reached limit for a metric
   */
  async checkLimit(
    companyId: string,
    metric: UsageMetric,
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    // Get company's current plan
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['currentPlan'],
    });

    if (!company || !company.currentPlan) {
      throw new ForbiddenException('No active subscription plan');
    }

    const plan = company.currentPlan;
    const current = await this.getCurrentUsage(companyId, metric);
    const limit = this.getLimit(plan, metric);

    return {
      allowed: current < limit,
      current,
      limit,
    };
  }

  /**
   * Enforce limit - throw error if exceeded
   */
  async enforceLimit(companyId: string, metric: UsageMetric): Promise<void> {
    const { allowed, current, limit } = await this.checkLimit(
      companyId,
      metric,
    );

    if (!allowed) {
      throw new ForbiddenException(
        `${metric} limit exceeded. Current: ${current}, Limit: ${limit}. Please upgrade your plan.`,
      );
    }
  }

  /**
   * Get usage summary for all metrics
   */
  async getUsageSummary(companyId: string): Promise<{
    [key in UsageMetric]?: {
      current: number;
      limit: number;
      percentage: number;
    };
  }> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['currentPlan'],
    });

    if (!company || !company.currentPlan) {
      return {};
    }

    const plan = company.currentPlan;
    const summary: any = {};

    for (const metric of Object.values(UsageMetric)) {
      const current = await this.getCurrentUsage(companyId, metric);
      const limit = this.getLimit(plan, metric);
      const percentage = limit > 0 ? (current / limit) * 100 : 0;

      summary[metric] = {
        current,
        limit,
        percentage: Math.round(percentage),
      };
    }

    return summary;
  }

  /**
   * Get limit for a metric from plan
   */
  private getLimit(plan: SubscriptionPlan, metric: UsageMetric): number {
    const limitMap: Record<UsageMetric, keyof SubscriptionPlan> = {
      [UsageMetric.STORES]: 'maxStores',
      [UsageMetric.USERS]: 'maxUsers',
      [UsageMetric.EMPLOYEES]: 'maxEmployees',
      [UsageMetric.PRODUCTS]: 'maxProducts',
      [UsageMetric.TRANSACTIONS]: 'maxTransactionsPerMonth',
      [UsageMetric.CUSTOMERS]: 'maxCustomers',
      [UsageMetric.STORAGE]: 'maxStorageMb',
    };

    const limitField = limitMap[metric];
    return Number(plan[limitField]) || 999999; // Default to unlimited if not set
  }

  /**
   * Get current billing period (monthly)
   */
  private getCurrentPeriod(): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return { periodStart, periodEnd };
  }

  /**
   * Reset usage for new period (called by cron job)
   */
  async resetMonthlyUsage(): Promise<void> {
    // This would be called by a cron job at the start of each month
    // For now, we just create new records for the new period
    // Old records are kept for historical data
  }
}

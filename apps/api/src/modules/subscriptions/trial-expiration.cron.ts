import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Subscription, SubscriptionStatus } from './subscription.entity';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class TrialExpirationCron {
  private readonly logger = new Logger(TrialExpirationCron.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Run every day at 1 AM - check trial expirations and send reminders
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async checkTrialExpirations() {
    this.logger.log('🔄 Checking trial expirations...');

    const now = new Date();

    // 1. Find trials that have expired (trial_end < now)
    const expiredTrials = await this.subscriptionRepo.find({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEnd: LessThan(now),
      },
    });

    for (const subscription of expiredTrials) {
      await this.expireTrial(subscription);
    }

    // 2. Find trials expiring in 7 days
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysPlusOne = new Date(sevenDaysFromNow);
    sevenDaysPlusOne.setDate(sevenDaysPlusOne.getDate() + 1);

    const expiringIn7Days = await this.subscriptionRepo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: SubscriptionStatus.TRIAL })
      .andWhere('s.trial_end >= :start', { start: sevenDaysFromNow })
      .andWhere('s.trial_end < :end', { end: sevenDaysPlusOne })
      .getMany();

    for (const subscription of expiringIn7Days) {
      await this.sendTrialReminder(subscription, 7);
    }

    // 3. Find trials expiring in 2 days
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const twoDaysPlusOne = new Date(twoDaysFromNow);
    twoDaysPlusOne.setDate(twoDaysPlusOne.getDate() + 1);

    const expiringIn2Days = await this.subscriptionRepo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: SubscriptionStatus.TRIAL })
      .andWhere('s.trial_end >= :start', { start: twoDaysFromNow })
      .andWhere('s.trial_end < :end', { end: twoDaysPlusOne })
      .getMany();

    for (const subscription of expiringIn2Days) {
      await this.sendTrialReminder(subscription, 2);
    }

    this.logger.log(
      `✅ Trial check complete: ${expiredTrials.length} expired, ` +
      `${expiringIn7Days.length} expiring in 7 days, ` +
      `${expiringIn2Days.length} expiring in 2 days`
    );
  }

  /**
   * Expire a trial subscription
   */
  private async expireTrial(subscription: Subscription): Promise<void> {
    try {
      // Update subscription status to expired
      await this.subscriptionRepo.update(subscription.id, {
        status: SubscriptionStatus.EXPIRED,
      });

      // Update company status
      await this.companyRepo.update(subscription.companyId, {
        status: 'expired',
        subscriptionStatus: 'expired',
      });

      // Get owner to send email
      const owner = await this.userRepo.findOne({
        where: { companyId: subscription.companyId, role: 'owner' as any },
      });

      const company = await this.companyRepo.findOne({
        where: { id: subscription.companyId },
      });

      if (owner && company) {
        await this.emailService.sendTrialExpiredEmail(
          owner.email,
          owner.name,
          company.name,
        ).catch(e => this.logger.warn(`Failed to send trial expired email: ${e.message}`));
      }

      this.logger.log(`⏰ Trial expired for company ${subscription.companyId}`);
    } catch (e) {
      this.logger.error(`Failed to expire trial ${subscription.id}: ${e.message}`);
    }
  }

  /**
   * Send trial reminder email
   */
  private async sendTrialReminder(subscription: Subscription, daysRemaining: number): Promise<void> {
    try {
      const owner = await this.userRepo.findOne({
        where: { companyId: subscription.companyId, role: 'owner' as any },
      });

      const company = await this.companyRepo.findOne({
        where: { id: subscription.companyId },
      });

      if (owner && company) {
        await this.emailService.sendTrialReminderEmail(
          owner.email,
          owner.name,
          company.name,
          daysRemaining,
        ).catch(e => this.logger.warn(`Failed to send trial reminder email: ${e.message}`));

        this.logger.log(
          `📧 Sent ${daysRemaining}-day trial reminder to ${owner.email} (${company.name})`
        );
      }
    } catch (e) {
      this.logger.error(`Failed to send trial reminder for ${subscription.id}: ${e.message}`);
    }
  }
}

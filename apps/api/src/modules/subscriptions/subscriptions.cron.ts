import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription, SubscriptionStatus } from './subscription.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel } from '../notifications/notification.entity';

@Injectable()
export class SubscriptionsCron {
  private readonly logger = new Logger(SubscriptionsCron.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  /**
   * Check expired subscriptions daily at 1:00 AM
   * This will:
   * 1. Mark active subscriptions as expired if end_date has passed
   * 2. Set grace_period_end_date (end_date + 3 days)
   * 3. Mark expired subscriptions as suspended if grace period has passed
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'check-expired-subscriptions',
    timeZone: 'Asia/Jakarta',
  })
  async handleExpiredSubscriptions() {
    this.logger.log('Running daily subscription expiry check...');

    try {
      await this.subscriptionsService.checkExpiredSubscriptions();
      this.logger.log('Subscription expiry check completed successfully');
    } catch (error) {
      this.logger.error('Failed to check expired subscriptions', error);
      // Don't throw error to prevent cron from stopping
    }
  }

  /**
   * Optional: Run check every hour for more frequent updates
   * Uncomment if you need more frequent checks
   */
  // @Cron(CronExpression.EVERY_HOUR, {
  //   name: 'check-expired-subscriptions-hourly',
  //   timeZone: 'Asia/Jakarta',
  // })
  // async handleExpiredSubscriptionsHourly() {
  //   this.logger.log('Running hourly subscription expiry check...');
  //   try {
  //     await this.subscriptionsService.checkExpiredSubscriptions();
  //   } catch (error) {
  //     this.logger.error('Failed to check expired subscriptions', error);
  //   }
  // }

  /**
   * Manual trigger for testing
   * Can be called via API endpoint
   */
  async triggerManualCheck() {
    this.logger.log('Manual subscription expiry check triggered');
    await this.subscriptionsService.checkExpiredSubscriptions();
    return { message: 'Subscription expiry check completed' };
  }

  /**
   * Check subscriptions and send renewal notifications daily at 9:00 AM
   * Sends notifications at -7, -3, -1, 0, +1, +2, +3 days relative to end_date
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: 'send-renewal-notifications',
    timeZone: 'Asia/Jakarta',
  })
  async handleRenewalNotifications() {
    this.logger.log('Running daily renewal notification check...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate target dates for notifications
      const notificationDays = [7, 3, 1, 0, -1, -2, -3];
      let totalSent = 0;

      for (const days of notificationDays) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + days);

        // Find subscriptions that match the target date
        let subscriptions: Subscription[];

        if (days >= 0) {
          // For future dates (expiring soon), find active subscriptions
          subscriptions = await this.subscriptionRepository.find({
            where: {
              status: SubscriptionStatus.ACTIVE,
              endDate: targetDate,
            },
            relations: ['company', 'plan'],
          });
        } else if (days === -3) {
          // For day -3, find subscriptions that should be suspended
          subscriptions = await this.subscriptionRepository.find({
            where: {
              status: SubscriptionStatus.EXPIRED,
              gracePeriodEndDate: LessThan(today),
            },
            relations: ['company', 'plan'],
          });
        } else {
          // For days -1 and -2 (grace period), find expired subscriptions
          subscriptions = await this.subscriptionRepository.find({
            where: {
              status: SubscriptionStatus.EXPIRED,
              endDate: targetDate,
            },
            relations: ['company', 'plan'],
          });
        }

        // Send notifications for each subscription
        for (const subscription of subscriptions) {
          try {
            // Default channels: email and in-app
            // SMS and WhatsApp are placeholders for future implementation
            const channels = [
              NotificationChannel.EMAIL,
              NotificationChannel.IN_APP,
            ];

            await this.notificationsService.sendRenewalReminder(
              subscription,
              days,
              channels,
            );

            totalSent++;
          } catch (error) {
            this.logger.error(
              `Failed to send renewal notification for subscription ${subscription.id}`,
              error,
            );
          }
        }

        this.logger.log(
          `Sent ${subscriptions.length} renewal notifications for day ${days}`,
        );
      }

      this.logger.log(
        `Renewal notification check completed. Total sent: ${totalSent}`,
      );
    } catch (error) {
      this.logger.error('Failed to send renewal notifications', error);
      // Don't throw error to prevent cron from stopping
    }
  }

  /**
   * Manual trigger for renewal notifications (for testing)
   */
  async triggerManualRenewalCheck() {
    this.logger.log('Manual renewal notification check triggered');
    await this.handleRenewalNotifications();
    return { message: 'Renewal notification check completed' };
  }
}

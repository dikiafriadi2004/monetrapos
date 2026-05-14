import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription, SubscriptionStatus } from './subscription.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel } from '../notifications/notification.entity';
import { UsageService } from '../usage/usage.service';

@Injectable()
export class SubscriptionsCron {
  private readonly logger = new Logger(SubscriptionsCron.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => UsageService))
    private readonly usageService: UsageService,
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
            // Build channels based on available contact info
            const channels: NotificationChannel[] = [NotificationChannel.IN_APP];

            // Always send email if company has email
            if ((subscription as any).company?.email) {
              channels.push(NotificationChannel.EMAIL);
            }

            // Send SMS if company has phone and Twilio is configured
            if (
              (subscription as any).company?.phone &&
              process.env.TWILIO_ACCOUNT_SID &&
              process.env.TWILIO_AUTH_TOKEN
            ) {
              channels.push(NotificationChannel.SMS);
            }

            // Send WhatsApp if company has phone and WhatsApp is configured
            if (
              (subscription as any).company?.phone &&
              process.env.TWILIO_ACCOUNT_SID &&
              process.env.TWILIO_AUTH_TOKEN
            ) {
              channels.push(NotificationChannel.WHATSAPP);
            }

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

  /**
   * Reset monthly transaction usage at midnight on the 1st of each month
   */
  @Cron('0 0 1 * *', {
    name: 'reset-monthly-usage',
    timeZone: 'Asia/Jakarta',
  })
  async handleMonthlyUsageReset() {
    this.logger.log('Running monthly usage reset...');
    try {
      await this.usageService.resetMonthlyUsage();
      this.logger.log('Monthly usage reset completed');
    } catch (error) {
      this.logger.error('Failed to reset monthly usage', error);
    }
  }

  /**
   * Auto-check pending payments every 10 minutes
   * Queries Xendit for payment status and activates subscriptions
   */
  @Cron('*/10 * * * *', {
    name: 'auto-check-pending-payments',
    timeZone: 'Asia/Jakarta',
  })
  async handlePendingPaymentCheck() {
    try {
      // Find invoices pending > 5 minutes
      const pendingInvoices = await this.subscriptionRepository.manager.query(`
        SELECT 
          i.id as invoice_id,
          i.invoice_number,
          i.payment_url,
          i.company_id,
          TIMESTAMPDIFF(MINUTE, i.created_at, NOW()) as minutes_pending
        FROM invoices i
        WHERE i.status = 'pending'
          AND i.payment_url IS NOT NULL
          AND i.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY i.created_at DESC
        LIMIT 20
      `);

      if (pendingInvoices.length === 0) return;

      this.logger.log(`Auto-check: Found ${pendingInvoices.length} pending invoices`);

      for (const invoice of pendingInvoices) {
        try {
          // Extract Xendit invoice ID from payment URL
          const urlMatch = invoice.payment_url?.match(/\/web\/([a-f0-9]+)$/);
          if (!urlMatch) continue;

          const xenditInvoiceId = urlMatch[1];

          // Check Xendit status via payment gateway service
          const result = await this.subscriptionRepository.manager.query(`
            SELECT pgc.secretKey 
            FROM payment_gateway_configs pgc 
            WHERE pgc.gateway = 'xendit' AND pgc.isEnabled = 1
            LIMIT 1
          `);

          if (!result?.[0]?.secretKey) continue;

          const axios = require('axios');
          const xenditRes = await axios.get(
            `https://api.xendit.co/v2/invoices/${xenditInvoiceId}`,
            {
              auth: { username: result[0].secretKey, password: '' },
              timeout: 5000,
            }
          ).catch(() => null);

          if (!xenditRes?.data) continue;

          const status = xenditRes.data.status?.toUpperCase();

          if (status === 'PAID' || status === 'SETTLED') {
            this.logger.log(`Auto-check: Activating ${invoice.invoice_number}`);

            // Update invoice
            await this.subscriptionRepository.manager.query(
              `UPDATE invoices SET status='paid', paid_at=NOW(), payment_method='xendit', updated_at=NOW() WHERE id=?`,
              [invoice.invoice_id]
            );

            // Activate subscription
            await this.subscriptionRepository.manager.query(`
              UPDATE subscriptions s
              JOIN invoices i ON i.subscription_id = s.id
              SET s.status='active', s.start_date=NOW(),
                  s.end_date=DATE_ADD(NOW(), INTERVAL COALESCE(s.duration_months,1) MONTH),
                  s.updated_at=NOW()
              WHERE i.id=?
            `, [invoice.invoice_id]);

            // Activate company
            await this.subscriptionRepository.manager.query(`
              UPDATE companies c
              JOIN invoices i ON i.company_id = c.id
              SET c.status='active', c.subscription_status='active',
                  c.subscription_ends_at=DATE_ADD(NOW(), INTERVAL (
                    SELECT COALESCE(duration_months,1) FROM subscriptions WHERE id=i.subscription_id
                  ) MONTH), c.updated_at=NOW()
              WHERE i.id=?
            `, [invoice.invoice_id]);

            this.logger.log(`Auto-check: Activated ${invoice.invoice_number}`);
          } else if (status === 'EXPIRED') {
            await this.subscriptionRepository.manager.query(
              `UPDATE invoices SET status='failed', notes='Expired di Xendit', updated_at=NOW() WHERE id=?`,
              [invoice.invoice_id]
            );
          }
        } catch (err: any) {
          this.logger.warn(`Auto-check failed for ${invoice.invoice_number}: ${err.message}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Auto-check pending payments error: ${error.message}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Queue } from 'bull';
import { QUEUE_NAMES } from '../../common/queue/queues.constants';
import { SendEmailDto, SendSMSDto, SendWhatsAppDto } from './dto';
import {
  Notification,
  NotificationType,
  NotificationChannel,
} from './notification.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private emailQueue: Queue,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly emailService: EmailService,
  ) {}

  async sendEmail(dto: SendEmailDto): Promise<any> {
    this.logger.log(`Sending email to ${dto.to}: ${dto.subject}`);
    const result = await this.emailService.sendMail({
      to: dto.to,
      subject: dto.subject,
      html: dto.body,
    });
    return result;
  }

  /**
   * Queue email for background processing
   */
  async queueEmail(dto: SendEmailDto, priority: number = 5): Promise<void> {
    await this.emailQueue.add('send-email', dto, {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
    this.logger.log(`Email queued for ${dto.to}: ${dto.subject}`);
  }

  /**
   * Queue welcome email after subscription activation
   */
  async queueWelcomeEmail(
    email: string,
    ownerName: string,
    companyName: string,
  ): Promise<void> {
    // Use EmailService's built-in welcome template directly
    try {
      await this.emailService.sendWelcomeEmail(email, ownerName, companyName);
      this.logger.log(`Welcome email sent to ${email} for ${companyName}`);
    } catch (err: any) {
      this.logger.error(`Failed to send welcome email to ${email}: ${err.message}`);
      // Fallback: queue via Bull
      const emailDto: SendEmailDto = {
        to: email,
        subject: `Selamat Datang di MonetraPOS - ${companyName}`,
        body: this.generateWelcomeEmailBody(ownerName, companyName),
      };
      await this.queueEmail(emailDto, 10);
    }
  }

  /**
   * Generate welcome email HTML body
   */
  private generateWelcomeEmailBody(
    ownerName: string,
    companyName: string,
  ): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4CAF50;">Welcome to MonetraPOS!</h1>
            
            <p>Hi ${ownerName},</p>
            
            <p>Thank you for subscribing to MonetraPOS! Your account for <strong>${companyName}</strong> has been successfully activated.</p>
            
            <h2 style="color: #2196F3;">Getting Started</h2>
            <ul>
              <li>Access your dashboard at <a href="${process.env.FRONTEND_URL || 'http://localhost:4403'}">${process.env.FRONTEND_URL || 'http://localhost:4403'}</a></li>
              <li>Set up your first store and products</li>
              <li>Add your team members</li>
              <li>Start processing transactions</li>
            </ul>
            
            <h2 style="color: #2196F3;">What's Included</h2>
            <ul>
              <li>✅ Point of Sale (POS) system</li>
              <li>✅ Inventory management</li>
              <li>✅ Customer loyalty program</li>
              <li>✅ Sales reporting & analytics</li>
              <li>✅ Multi-store support</li>
              <li>✅ Employee management</li>
            </ul>
            
            <h2 style="color: #2196F3;">Need Help?</h2>
            <p>Our support team is here to help you succeed:</p>
            <ul>
              <li>📧 Email: support@monetrapos.com</li>
              <li>📱 WhatsApp: +62 812-3456-7890</li>
              <li>📚 Documentation: <a href="https://docs.monetrapos.com">docs.monetrapos.com</a></li>
            </ul>
            
            <div style="margin-top: 30px; padding: 20px; background-color: #f5f5f5; border-radius: 5px;">
              <p style="margin: 0;"><strong>Pro Tip:</strong> Complete your store setup within the first 24 hours to get the most out of your subscription!</p>
            </div>
            
            <p style="margin-top: 30px;">Best regards,<br>The MonetraPOS Team</p>
            
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #999;">
              This email was sent to ${ownerName}. If you have any questions, please contact our support team.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  async sendSMS(dto: SendSMSDto): Promise<any> {
    // TODO: Integrate with Twilio or Vonage
    this.logger.log(`Sending SMS to ${dto.phone}`);

    // Placeholder implementation
    return {
      success: true,
      message: `SMS sent to ${dto.phone}`,
      provider: 'twilio', // or 'vonage'
      messageId: `sms_${Date.now()}`,
    };
  }

  async sendWhatsApp(dto: SendWhatsAppDto): Promise<any> {
    // TODO: Integrate with WhatsApp Business API
    this.logger.log(`Sending WhatsApp to ${dto.phone}`);

    // Placeholder implementation
    return {
      success: true,
      message: `WhatsApp sent to ${dto.phone}`,
      provider: 'whatsapp-business-api',
      messageId: `wa_${Date.now()}`,
    };
  }

  // Helper methods for common notifications
  async sendTransactionReceipt(
    email: string,
    transactionId: string,
  ): Promise<any> {
    return this.sendEmail({
      to: email,
      subject: 'Your Receipt',
      body: `Thank you for your purchase. Transaction ID: ${transactionId}`,
    });
  }

  async sendLowStockAlert(
    email: string,
    productName: string,
    currentStock: number,
  ): Promise<any> {
    const subject = `⚠️ Low Stock Alert: ${productName}`;
    const body = this.generateLowStockEmailBody(productName, currentStock);

    return this.sendEmail({
      to: email,
      subject,
      body,
    });
  }

  /**
   * Generate low stock alert email HTML body
   */
  private generateLowStockEmailBody(
    productName: string,
    currentStock: number,
  ): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #ff9800; color: white; padding: 20px; border-radius: 5px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">⚠️ Low Stock Alert</h1>
            </div>
            
            <div style="padding: 20px; background-color: #fff3e0; margin-top: 20px; border-radius: 5px; border-left: 4px solid #ff9800;">
              <p style="font-size: 16px; margin: 0;">
                <strong>Product:</strong> ${productName}<br>
                <strong>Current Stock:</strong> ${currentStock} units
              </p>
            </div>
            
            <div style="margin-top: 20px;">
              <p>The stock level for <strong>${productName}</strong> has fallen below the minimum threshold.</p>
              <p>Please consider restocking this product to avoid running out of inventory.</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:4403'}/inventory" 
                 style="display: inline-block; padding: 15px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                View Inventory
              </a>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background-color: #f5f5f5; border-radius: 5px;">
              <h3 style="color: #2196F3; margin-top: 0;">Recommended Actions</h3>
              <ul>
                <li>Review current stock levels</li>
                <li>Create a purchase order</li>
                <li>Contact your supplier</li>
                <li>Consider adjusting minimum stock threshold</li>
              </ul>
            </div>
            
            <p style="margin-top: 30px;">Best regards,<br>MonetraPOS Inventory System</p>
            
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #999;">
              This is an automated alert from your inventory management system. 
              To adjust alert settings, please visit your dashboard.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  async sendShiftReport(email: string, shiftId: string): Promise<any> {
    return this.sendEmail({
      to: email,
      subject: 'Shift Report',
      body: `Your shift report is ready. Shift ID: ${shiftId}`,
    });
  }

  /**
   * Send renewal reminder notification
   * Supports multiple channels: email, in-app, SMS, WhatsApp
   * Tracks sent notifications to prevent duplicates
   */
  async sendRenewalReminder(
    subscription: Subscription,
    daysUntilExpiry: number,
    channels: NotificationChannel[] = [NotificationChannel.EMAIL],
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if notification already sent for this subscription and day
    const existingNotification = await this.notificationRepository.findOne({
      where: {
        subscriptionId: subscription.id,
        scheduledFor: today,
        type:
          daysUntilExpiry >= 0
            ? NotificationType.SUBSCRIPTION_EXPIRING
            : daysUntilExpiry === 0
              ? NotificationType.SUBSCRIPTION_EXPIRED
              : NotificationType.SUBSCRIPTION_SUSPENDED,
      },
    });

    if (existingNotification) {
      this.logger.log(
        `Renewal notification already sent for subscription ${subscription.id} on ${today.toISOString()}`,
      );
      return;
    }

    // Get notification content based on days until expiry
    const { title, message, type } =
      this.getRenewalNotificationContent(daysUntilExpiry);

    // Send notification through each channel
    for (const channel of channels) {
      try {
        // Create notification record
        const notification = this.notificationRepository.create({
          companyId: subscription.companyId,
          subscriptionId: subscription.id,
          type,
          title,
          message,
          channel,
          scheduledFor: today,
          sentAt: new Date(),
          data: {
            subscriptionId: subscription.id,
            planId: subscription.planId,
            endDate: subscription.endDate,
            daysUntilExpiry,
          },
        });

        await this.notificationRepository.save(notification);

        // Send through appropriate channel
        switch (channel) {
          case NotificationChannel.EMAIL:
            await this.sendRenewalEmail(subscription, daysUntilExpiry);
            break;
          case NotificationChannel.SMS:
            // Placeholder for SMS integration
            this.logger.log(
              `SMS renewal reminder for subscription ${subscription.id} (not implemented)`,
            );
            break;
          case NotificationChannel.WHATSAPP:
            // Placeholder for WhatsApp integration
            this.logger.log(
              `WhatsApp renewal reminder for subscription ${subscription.id} (not implemented)`,
            );
            break;
          case NotificationChannel.IN_APP:
            // In-app notification already created above
            this.logger.log(
              `In-app renewal reminder created for subscription ${subscription.id}`,
            );
            break;
        }

        this.logger.log(
          `Renewal reminder sent via ${channel} for subscription ${subscription.id}, days until expiry: ${daysUntilExpiry}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send renewal reminder via ${channel} for subscription ${subscription.id}`,
          error,
        );
      }
    }
  }

  /**
   * Get notification content based on days until expiry
   */
  private getRenewalNotificationContent(daysUntilExpiry: number): {
    title: string;
    message: string;
    type: NotificationType;
  } {
    if (daysUntilExpiry === 7) {
      return {
        title: 'Subscription akan berakhir dalam 7 hari',
        message:
          'Subscription Anda akan berakhir dalam 7 hari. Perpanjang sekarang untuk melanjutkan akses tanpa gangguan.',
        type: NotificationType.SUBSCRIPTION_EXPIRING,
      };
    } else if (daysUntilExpiry === 3) {
      return {
        title: 'Subscription akan berakhir dalam 3 hari',
        message:
          'Subscription Anda akan berakhir dalam 3 hari. Jangan lewatkan kesempatan untuk perpanjang sekarang!',
        type: NotificationType.SUBSCRIPTION_EXPIRING,
      };
    } else if (daysUntilExpiry === 1) {
      return {
        title: 'Subscription akan berakhir besok',
        message:
          'Subscription Anda akan berakhir besok. Perpanjang sekarang untuk menghindari gangguan layanan.',
        type: NotificationType.SUBSCRIPTION_EXPIRING,
      };
    } else if (daysUntilExpiry === 0) {
      return {
        title: 'Subscription Anda telah berakhir',
        message:
          'Subscription Anda telah berakhir. Anda memiliki grace period 3 hari dengan akses read-only. Perpanjang sekarang untuk akses penuh.',
        type: NotificationType.SUBSCRIPTION_EXPIRED,
      };
    } else if (daysUntilExpiry === -1) {
      return {
        title: 'Grace period tersisa 2 hari',
        message:
          'Grace period Anda tersisa 2 hari. Perpanjang subscription sekarang untuk menghindari penangguhan akun.',
        type: NotificationType.SUBSCRIPTION_EXPIRED,
      };
    } else if (daysUntilExpiry === -2) {
      return {
        title: 'Grace period tersisa 1 hari',
        message:
          'Grace period Anda tersisa 1 hari. Perpanjang subscription sekarang atau akun Anda akan ditangguhkan besok.',
        type: NotificationType.SUBSCRIPTION_EXPIRED,
      };
    } else if (daysUntilExpiry === -3) {
      return {
        title: 'Akun Anda telah disuspend',
        message:
          'Akun Anda telah ditangguhkan karena subscription berakhir. Silakan perpanjang subscription untuk mengaktifkan kembali akun Anda.',
        type: NotificationType.SUBSCRIPTION_SUSPENDED,
      };
    }

    // Default message
    return {
      title: 'Perpanjang Subscription Anda',
      message: 'Subscription Anda memerlukan perpanjangan.',
      type: NotificationType.SUBSCRIPTION_EXPIRING,
    };
  }

  /**
   * Send renewal reminder email
   */
  private async sendRenewalEmail(
    subscription: Subscription,
    daysUntilExpiry: number,
  ): Promise<void> {
    // Use companyEmail from subscription relation if available
    const toEmail =
      (subscription as any).company?.email ||
      (subscription as any).companyEmail ||
      null;

    if (!toEmail) {
      this.logger.warn(
        `No email found for subscription ${subscription.id} — skipping renewal email`,
      );
      return;
    }

    const emailDto: SendEmailDto = {
      to: toEmail,
      subject: this.getRenewalEmailSubject(daysUntilExpiry),
      body: this.generateRenewalEmailBody(subscription, daysUntilExpiry),
    };

    await this.queueEmail(emailDto, 8); // High priority
  }

  /**
   * Get renewal email subject based on days until expiry
   */
  private getRenewalEmailSubject(daysUntilExpiry: number): string {
    if (daysUntilExpiry === 7) {
      return 'Subscription Anda akan berakhir dalam 7 hari';
    } else if (daysUntilExpiry === 3) {
      return 'Subscription Anda akan berakhir dalam 3 hari';
    } else if (daysUntilExpiry === 1) {
      return 'Subscription Anda akan berakhir besok';
    } else if (daysUntilExpiry === 0) {
      return 'Subscription Anda telah berakhir - Grace period 3 hari';
    } else if (daysUntilExpiry < 0 && daysUntilExpiry >= -2) {
      return `Grace period tersisa ${3 + daysUntilExpiry} hari`;
    } else if (daysUntilExpiry === -3) {
      return 'Akun Anda telah disuspend - Silakan perpanjang';
    }
    return 'Perpanjang Subscription Anda';
  }

  /**
   * Generate renewal email HTML body
   */
  private generateRenewalEmailBody(
    subscription: Subscription,
    daysUntilExpiry: number,
  ): string {
    const endDate = subscription.endDate
      ? new Date(subscription.endDate).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'N/A';

    const urgencyColor =
      daysUntilExpiry <= 1 ? '#f44336' : daysUntilExpiry <= 3 ? '#ff9800' : '#2196F3';
    const urgencyIcon =
      daysUntilExpiry <= 0 ? '🚨' : daysUntilExpiry <= 3 ? '⚠️' : '📅';

    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: ${urgencyColor}; color: white; padding: 20px; border-radius: 5px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">${urgencyIcon} ${this.getRenewalEmailSubject(daysUntilExpiry)}</h1>
            </div>
            
            <div style="padding: 20px; background-color: #f9f9f9; margin-top: 20px; border-radius: 5px;">
              <p style="font-size: 16px; margin: 0;">
                ${this.getRenewalNotificationContent(daysUntilExpiry).message}
              </p>
            </div>
            
            <div style="margin-top: 20px;">
              <h2 style="color: #2196F3;">Detail Subscription</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Tanggal Berakhir:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${endDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${subscription.status}</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:4403'}/subscriptions/renew" 
                 style="display: inline-block; padding: 15px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                Perpanjang Sekarang
              </a>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background-color: #e3f2fd; border-radius: 5px;">
              <h3 style="color: #2196F3; margin-top: 0;">Pilihan Durasi Perpanjangan</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 5px 0;">✓ 1 Bulan - Rp 250,000</li>
                <li style="padding: 5px 0;">✓ 3 Bulan - Rp 712,500 (Hemat 5%)</li>
                <li style="padding: 5px 0;">✓ 6 Bulan - Rp 1,350,000 (Hemat 10%)</li>
                <li style="padding: 5px 0;">✓ 1 Tahun - Rp 2,400,000 (Hemat 20%)</li>
              </ul>
            </div>
            
            <div style="margin-top: 30px;">
              <h3 style="color: #2196F3;">Butuh Bantuan?</h3>
              <p>Tim support kami siap membantu Anda:</p>
              <ul>
                <li>📧 Email: support@monetrapos.com</li>
                <li>📱 WhatsApp: +62 812-3456-7890</li>
              </ul>
            </div>
            
            <p style="margin-top: 30px;">Terima kasih,<br>Tim MonetraPOS</p>
            
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #999;">
              Email ini dikirim secara otomatis. Jika Anda memiliki pertanyaan, silakan hubungi tim support kami.
            </p>
          </div>
        </body>
      </html>
    `;
  }
}


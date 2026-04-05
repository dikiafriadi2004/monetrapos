import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { QUEUE_NAMES } from '../../../common/queue/queues.constants';
import { SendEmailDto } from '../dto';
import { EmailService } from '../../email/email.service';

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('send-email')
  async handleSendEmail(job: Job<SendEmailDto>) {
    this.logger.log(`Processing email job ${job.id} for ${job.data.to}`);

    try {
      const result = await this.emailService.sendMail({
        to: job.data.to,
        subject: job.data.subject,
        html: job.data.body,
      });

      if (!result.success) {
        this.logger.warn(`Email not sent (no config?): ${result.error}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to send email to ${job.data.to}`, error);
      throw error; // Bull will retry
    }
  }

  @Process('send-invoice-email')
  async handleSendInvoiceEmail(
    job: Job<{
      invoiceId: string;
      companyId: string;
      email: string;
      invoiceNumber: string;
      pdfPath?: string;
    }>,
  ) {
    this.logger.log(
      `Processing invoice email job ${job.id} for ${job.data.email}`,
    );

    try {
      const result = await this.emailService.sendMail({
        to: job.data.email,
        subject: `Invoice ${job.data.invoiceNumber} - MonetraPOS`,
        html: `
          <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto;">
            <h2 style="color:#4f46e5;">Invoice ${job.data.invoiceNumber}</h2>
            <p>Terima kasih atas pembayaran Anda. Invoice Anda telah diproses.</p>
            <p><strong>Invoice Number:</strong> ${job.data.invoiceNumber}</p>
            ${job.data.pdfPath ? `<p>PDF invoice tersedia di dashboard Anda.</p>` : ''}
            <div style="margin-top:24px;">
              <a href="${process.env.MEMBER_ADMIN_URL || 'http://localhost:4403'}/dashboard/billing"
                 style="background:#4f46e5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
                Lihat Invoice
              </a>
            </div>
          </div>
        `,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send invoice email to ${job.data.email}`,
        error,
      );
      throw error;
    }
  }

  @Process('birthday-reminder')
  async handleBirthdayReminder(
    job: Job<{ companyId: string; customerId: string; customerName: string; email?: string }>,
  ) {
    if (!job.data.email) return { skipped: true };

    await this.emailService.sendMail({
      to: job.data.email,
      subject: `🎂 Selamat Ulang Tahun, ${job.data.customerName}!`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto;text-align:center;">
          <h1 style="font-size:48px;margin:0;">🎂</h1>
          <h2 style="color:#4f46e5;">Selamat Ulang Tahun!</h2>
          <p>Halo <strong>${job.data.customerName}</strong>,</p>
          <p>Kami mengucapkan selamat ulang tahun! Semoga hari Anda menyenangkan.</p>
          <p style="color:#6b7280;font-size:0.9rem;">Kunjungi toko kami untuk hadiah spesial hari ini.</p>
        </div>
      `,
    });

    return { success: true };
  }

  @Process('anniversary-reminder')
  async handleAnniversaryReminder(
    job: Job<{ companyId: string; customerId: string; customerName: string; email?: string; yearsSince: number }>,
  ) {
    if (!job.data.email) return { skipped: true };

    await this.emailService.sendMail({
      to: job.data.email,
      subject: `🎉 ${job.data.yearsSince} Tahun Bersama Kami, ${job.data.customerName}!`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto;text-align:center;">
          <h1 style="font-size:48px;margin:0;">🎉</h1>
          <h2 style="color:#4f46e5;">Terima Kasih Atas Kesetiaan Anda!</h2>
          <p>Halo <strong>${job.data.customerName}</strong>,</p>
          <p>Sudah <strong>${job.data.yearsSince} tahun</strong> Anda bersama kami. Terima kasih atas kepercayaan Anda!</p>
        </div>
      `,
    });

    return { success: true };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { EmailService } from '../email/email.service';
import { Company } from '../companies/company.entity';

@Injectable()
export class BirthdayReminderService {
  private readonly logger = new Logger(BirthdayReminderService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Run every day at 08:00 WIB to send birthday emails
   */
  @Cron('0 8 * * *', { timeZone: 'Asia/Jakarta' })
  async sendBirthdayReminders() {
    this.logger.log('Running birthday reminder job...');

    const today = new Date();
    const month = today.getMonth() + 1; // 1-12
    const day = today.getDate();

    try {
      // Find customers with birthday today (match month and day only)
      const customers = await this.customerRepo
        .createQueryBuilder('customer')
        .leftJoinAndSelect('customer.company', 'company')
        .where('customer.date_of_birth IS NOT NULL')
        .andWhere('customer.email IS NOT NULL')
        .andWhere('customer.is_active = 1')
        .andWhere('MONTH(customer.date_of_birth) = :month', { month })
        .andWhere('DAY(customer.date_of_birth) = :day', { day })
        .getMany();

      this.logger.log(`Found ${customers.length} customers with birthday today`);

      let sent = 0;
      for (const customer of customers) {
        if (!customer.email) continue;
        try {
          const companyName = (customer as any).company?.name || 'Toko Kami';
          await this.emailService.sendMail({
            to: customer.email,
            subject: `🎂 Selamat Ulang Tahun, ${customer.name}! Hadiah spesial menanti Anda`,
            html: this.birthdayTemplate(customer.name, companyName, customer.loyaltyPoints || 0),
          });

          // Add birthday bonus points (100 pts)
          await this.customerRepo.update(customer.id, {
            loyaltyPoints: (customer.loyaltyPoints || 0) + 100,
          });

          sent++;
          this.logger.log(`Birthday email sent to ${customer.email} (${customer.name})`);
        } catch (err: any) {
          this.logger.warn(`Failed to send birthday email to ${customer.email}: ${err.message}`);
        }
      }

      this.logger.log(`Birthday reminder job completed. Sent: ${sent}/${customers.length}`);
    } catch (err: any) {
      this.logger.error(`Birthday reminder job failed: ${err.message}`);
    }
  }

  /**
   * Manual trigger — send birthday emails for a specific date (for testing)
   */
  async sendBirthdayRemindersForDate(month: number, day: number): Promise<{ sent: number; total: number }> {
    const customers = await this.customerRepo
      .createQueryBuilder('customer')
      .where('customer.date_of_birth IS NOT NULL')
      .andWhere('customer.email IS NOT NULL')
      .andWhere('customer.is_active = 1')
      .andWhere('MONTH(customer.date_of_birth) = :month', { month })
      .andWhere('DAY(customer.date_of_birth) = :day', { day })
      .getMany();

    let sent = 0;
    for (const customer of customers) {
      if (!customer.email) continue;
      try {
        await this.emailService.sendMail({
          to: customer.email,
          subject: `🎂 Selamat Ulang Tahun, ${customer.name}!`,
          html: this.birthdayTemplate(customer.name, 'Toko Kami', customer.loyaltyPoints || 0),
        });
        sent++;
      } catch {}
    }

    return { sent, total: customers.length };
  }

  private birthdayTemplate(name: string, companyName: string, points: number): string {
    const bonusPoints = 100; // Birthday bonus points
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px 12px 0 0;padding:40px;text-align:center;">
          <div style="font-size:60px;margin-bottom:12px;">🎂</div>
          <h1 style="color:white;font-size:28px;font-weight:700;margin:0 0 8px;">Selamat Ulang Tahun!</h1>
          <p style="color:rgba(255,255,255,0.85);font-size:16px;margin:0;">Semoga hari spesialmu penuh kebahagiaan</p>
        </td></tr>
        <tr><td style="background:white;padding:40px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">
            Halo <strong>${name}</strong>,
          </p>
          <p style="color:#374151;line-height:1.6;margin:0 0 24px;">
            Seluruh tim <strong>${companyName}</strong> mengucapkan selamat ulang tahun! 🎉
            Semoga di hari spesialmu ini, semua harapan dan impianmu terwujud.
          </p>

          <!-- Birthday Gift Box -->
          <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #f59e0b;border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
            <div style="font-size:36px;margin-bottom:8px;">🎁</div>
            <h3 style="color:#92400e;font-size:18px;font-weight:700;margin:0 0 8px;">Hadiah Ulang Tahun Untukmu!</h3>
            <p style="color:#78350f;font-size:14px;margin:0 0 16px;">Kami memberikan bonus poin spesial sebagai hadiah ulang tahun</p>
            <div style="background:white;border-radius:8px;padding:16px;display:inline-block;min-width:200px;">
              <div style="font-size:36px;font-weight:800;color:#f59e0b;">${bonusPoints}</div>
              <div style="color:#92400e;font-size:13px;font-weight:600;">BONUS POIN ULANG TAHUN</div>
            </div>
          </div>

          <!-- Current Points -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;margin:0 0 28px;">
            <p style="color:#166534;font-size:13px;margin:0 0 4px;">Total Poin Loyalitas Anda</p>
            <div style="font-size:28px;font-weight:700;color:#15803d;">${points + bonusPoints} poin</div>
            <p style="color:#166534;font-size:12px;margin:4px 0 0;">Gunakan poin untuk diskon di transaksi berikutnya</p>
          </div>

          <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">
            Bonus poin akan otomatis ditambahkan ke akun Anda.<br>
            Terima kasih telah menjadi pelanggan setia kami! ❤️
          </p>
        </td></tr>
        <tr><td style="padding:24px 0;text-align:center;color:#9ca3af;font-size:12px;">
          © ${new Date().getFullYear()} ${companyName} powered by MonetraPOS
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}

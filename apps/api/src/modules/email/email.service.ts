import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { EmailConfig, EmailProvider } from './email-config.entity';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectRepository(EmailConfig)
    private configRepo: Repository<EmailConfig>,
  ) {}

  // ─── Get active config ───────────────────────────────────────────────────────

  async getConfig(): Promise<EmailConfig | null> {
    return this.configRepo.findOne({ where: { isEnabled: true } });
  }

  async getAllConfigs(): Promise<EmailConfig[]> {
    return this.configRepo.find({ order: { createdAt: 'ASC' } });
  }

  // ─── Create transporter from config ─────────────────────────────────────────

  private async createTransporter(config: EmailConfig): Promise<nodemailer.Transporter> {
    if (config.provider === EmailProvider.GMAIL && config.oauthClientId) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: config.fromEmail,
          clientId: config.oauthClientId,
          clientSecret: config.oauthClientSecret,
          refreshToken: config.oauthRefreshToken,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      } as any);
    }

    return nodemailer.createTransport({
      host: config.host,
      port: config.port || 587,
      secure: config.secure || false,
      auth: {
        user: config.username,
        pass: config.password,
      },
      connectionTimeout: 5000,  // 5 detik koneksi
      greetingTimeout: 5000,    // 5 detik greeting
      socketTimeout: 10000,     // 10 detik socket
    });
  }

  // ─── Send email ──────────────────────────────────────────────────────────────

  async sendMail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = await this.getConfig();

    if (!config) {
      this.logger.warn(`Email not configured — skipping send to ${options.to}: ${options.subject}`);
      return { success: false, error: 'Email not configured' };
    }

    try {
      const transporter = await this.createTransporter(config);
      const from = `"${config.fromName || 'MonetraPOS'}" <${config.fromEmail || 'noreply@monetrapos.com'}>`;

      // Wrap with timeout to prevent hanging
      const sendPromise = transporter.sendMail({
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Email send timeout after 15s')), 15000)
      );

      const info = await Promise.race([sendPromise, timeoutPromise]);

      this.logger.log(`Email sent to ${options.to}: ${options.subject} [${info.messageId}]`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${options.to}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // ─── Test connection ─────────────────────────────────────────────────────────

  async testConnection(configData: Partial<EmailConfig>): Promise<{ success: boolean; message: string }> {
    try {
      const transporter = await this.createTransporter(configData as EmailConfig);
      await transporter.verify();
      return { success: true, message: '✅ Koneksi email berhasil! Konfigurasi valid.' };
    } catch (err: any) {
      return { success: false, message: `❌ Koneksi gagal: ${err.message}` };
    }
  }

  // ─── Send email with explicit config (for testing) ───────────────────────────

  async sendMailDirect(config: Partial<EmailConfig>, options: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const transporter = await this.createTransporter(config as EmailConfig);
      const from = `"${config.fromName || 'MonetraPOS'}" <${config.fromEmail || 'noreply@monetrapos.com'}>`;
      const info = await transporter.sendMail({
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.log(`Direct email sent to ${options.to}: ${options.subject} [${info.messageId}]`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      this.logger.error(`Failed to send direct email: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // ─── Upsert config ───────────────────────────────────────────────────────────

  async upsertConfig(provider: EmailProvider, data: Partial<EmailConfig>): Promise<EmailConfig> {
    // Disable all others if enabling this one
    if (data.isEnabled) {
      // Use query builder to avoid empty criteria error
      await this.configRepo
        .createQueryBuilder()
        .update(EmailConfig)
        .set({ isEnabled: false })
        .where('provider != :provider', { provider })
        .execute();
    }

    let config = await this.configRepo.findOne({ where: { provider } });
    if (!config) {
      config = this.configRepo.create({ provider, ...data });
    } else {
      Object.assign(config, data);
    }
    return this.configRepo.save(config);
  }

  // ─── Pre-built email templates ───────────────────────────────────────────────

  async sendVerificationEmail(to: string, name: string, token: string, frontendUrl: string): Promise<void> {
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
    await this.sendMail({
      to,
      subject: 'Verifikasi Email Anda - MonetraPOS',
      html: this.verificationTemplate(name, verifyUrl),
    });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string, frontendUrl: string): Promise<void> {
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    await this.sendMail({
      to,
      subject: 'Reset Password - MonetraPOS',
      html: this.passwordResetTemplate(name, resetUrl),
    });
  }

  async sendWelcomeEmail(to: string, name: string, companyName: string): Promise<void> {
    await this.sendMail({
      to,
      subject: `Selamat Datang di MonetraPOS - Trial 14 Hari Dimulai!`,
      html: this.welcomeTrialTemplate(name, companyName),
    });
  }

  async sendTrialReminderEmail(to: string, name: string, companyName: string, daysRemaining: number): Promise<void> {
    await this.sendMail({
      to,
      subject: `⏰ ${daysRemaining} hari lagi trial MonetraPOS Anda berakhir - ${companyName}`,
      html: this.trialReminderTemplate(name, companyName, daysRemaining),
    });
  }

  async sendTrialExpiredEmail(to: string, name: string, companyName: string): Promise<void> {
    await this.sendMail({
      to,
      subject: `Trial MonetraPOS Anda telah berakhir - ${companyName}`,
      html: this.trialExpiredTemplate(name, companyName),
    });
  }

  async sendPaymentInvoiceEmail(to: string, name: string, invoiceNumber: string, amount: number, paymentUrl: string, dueDate: Date): Promise<void> {
    await this.sendMail({
      to,
      subject: `Invoice Pembayaran - ${invoiceNumber}`,
      html: this.paymentInvoiceTemplate(name, invoiceNumber, amount, paymentUrl, dueDate),
    });
  }

  // ─── Email Templates ─────────────────────────────────────────────────────────

  private baseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MonetraPOS</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="background:#4f46e5;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
          <span style="color:white;font-size:22px;font-weight:700;letter-spacing:-0.5px;">MonetraPOS</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:white;padding:40px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 0;text-align:center;color:#9ca3af;font-size:12px;">
          © ${new Date().getFullYear()} MonetraPOS. All rights reserved.<br>
          Jika Anda tidak merasa mendaftar, abaikan email ini.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private verificationTemplate(name: string, verifyUrl: string): string {
    return this.baseTemplate(`
      <h2 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;">Verifikasi Email Anda</h2>
      <p style="color:#6b7280;margin:0 0 24px;">Halo <strong>${name}</strong>,</p>
      <p style="color:#374151;line-height:1.6;margin:0 0 32px;">
        Terima kasih telah mendaftar di MonetraPOS. Klik tombol di bawah untuk memverifikasi alamat email Anda.
      </p>
      <div style="text-align:center;margin:0 0 32px;">
        <a href="${verifyUrl}" style="display:inline-block;background:#4f46e5;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Verifikasi Email
        </a>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:0;">
        Link ini berlaku selama <strong>24 jam</strong>. Jika tombol tidak berfungsi, salin URL berikut:<br>
        <a href="${verifyUrl}" style="color:#4f46e5;word-break:break-all;">${verifyUrl}</a>
      </p>
    `);
  }

  private passwordResetTemplate(name: string, resetUrl: string): string {
    return this.baseTemplate(`
      <h2 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;">Reset Password</h2>
      <p style="color:#6b7280;margin:0 0 24px;">Halo <strong>${name}</strong>,</p>
      <p style="color:#374151;line-height:1.6;margin:0 0 32px;">
        Kami menerima permintaan reset password untuk akun Anda. Klik tombol di bawah untuk membuat password baru.
      </p>
      <div style="text-align:center;margin:0 0 32px;">
        <a href="${resetUrl}" style="display:inline-block;background:#ef4444;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Reset Password
        </a>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:0;">
        Link ini berlaku selama <strong>1 jam</strong>. Jika Anda tidak meminta reset password, abaikan email ini.
      </p>
    `);
  }

  private welcomeTemplate(name: string, companyName: string): string {
    return this.baseTemplate(`
      <h2 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;">Selamat Datang! 🎉</h2>
      <p style="color:#6b7280;margin:0 0 24px;">Halo <strong>${name}</strong>,</p>
      <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
        Akun <strong>${companyName}</strong> telah berhasil diaktifkan di MonetraPOS.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:0 0 32px;">
        <p style="color:#166534;font-weight:600;margin:0 0 12px;">Yang bisa Anda lakukan sekarang:</p>
        <ul style="color:#15803d;margin:0;padding-left:20px;line-height:2;">
          <li>Setup toko pertama Anda</li>
          <li>Tambahkan produk dan kategori</li>
          <li>Mulai transaksi POS</li>
          <li>Undang karyawan Anda</li>
        </ul>
      </div>
      <div style="text-align:center;">
        <a href="${process.env.MEMBER_ADMIN_URL || 'http://localhost:4403'}/login" style="display:inline-block;background:#4f46e5;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Masuk ke Dashboard
        </a>
      </div>
    `);
  }

  private welcomeTrialTemplate(name: string, companyName: string): string {
    const dashboardUrl = process.env.MEMBER_ADMIN_URL || 'http://localhost:4403';
    return this.baseTemplate(`
      <h2 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;">Trial 14 Hari Dimulai! 🚀</h2>
      <p style="color:#6b7280;margin:0 0 24px;">Halo <strong>${name}</strong>,</p>
      <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
        Selamat! Akun trial <strong>${companyName}</strong> telah berhasil dibuat. Anda memiliki <strong>14 hari</strong> untuk mencoba MonetraPOS secara gratis.
      </p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:0 0 16px;">
        <p style="color:#1e40af;font-weight:600;margin:0 0 12px;">✅ Yang tersedia di masa trial:</p>
        <ul style="color:#1d4ed8;margin:0;padding-left:20px;line-height:2;">
          <li>Sistem POS (kasir)</li>
          <li>Manajemen inventori</li>
          <li>Laporan dasar</li>
          <li>Hingga 50 produk</li>
          <li>Hingga 100 transaksi/bulan</li>
          <li>2 pengguna</li>
        </ul>
      </div>
      <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:20px;margin:0 0 32px;">
        <p style="color:#854d0e;font-weight:600;margin:0 0 12px;">🔒 Upgrade untuk unlock semua fitur:</p>
        <ul style="color:#713f12;margin:0;padding-left:20px;line-height:2;">
          <li>Manajemen pelanggan & loyalitas</li>
          <li>Manajemen karyawan</li>
          <li>Laporan lanjutan & analitik</li>
          <li>Multi-toko</li>
          <li>Produk & transaksi tidak terbatas</li>
          <li>Dukungan prioritas</li>
        </ul>
      </div>
      <div style="text-align:center;margin-bottom:16px;">
        <a href="${dashboardUrl}/dashboard" style="display:inline-block;background:#4f46e5;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Mulai Sekarang →
        </a>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:13px;">
        Trial berakhir dalam 14 hari. Tidak perlu kartu kredit untuk memulai.
      </p>
    `);
  }

  private trialReminderTemplate(name: string, companyName: string, daysRemaining: number): string {
    const upgradeUrl = process.env.MEMBER_ADMIN_URL || 'http://localhost:4403';
    const isUrgent = daysRemaining <= 2;
    const bgColor = isUrgent ? '#fef2f2' : '#fef9c3';
    const borderColor = isUrgent ? '#fecaca' : '#fde047';
    const textColor = isUrgent ? '#991b1b' : '#854d0e';
    const subTextColor = isUrgent ? '#7f1d1d' : '#713f12';

    return this.baseTemplate(`
      <h2 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;">
        ${isUrgent ? '🚨' : '⏰'} ${daysRemaining} hari lagi trial Anda berakhir
      </h2>
      <p style="color:#6b7280;margin:0 0 24px;">Halo <strong>${name}</strong>,</p>
      <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
        Trial MonetraPOS untuk <strong>${companyName}</strong> akan berakhir dalam <strong>${daysRemaining} hari</strong>.
      </p>
      <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:20px;margin:0 0 32px;">
        <p style="color:${textColor};font-weight:600;margin:0 0 8px;">
          ${isUrgent ? '⚠️ Segera upgrade sebelum akses Anda terbatas!' : '💡 Jangan lewatkan kesempatan ini!'}
        </p>
        <p style="color:${subTextColor};margin:0;line-height:1.6;">
          Setelah trial berakhir, Anda hanya bisa melihat data (read-only). Upgrade sekarang untuk tetap bisa mengelola bisnis Anda.
        </p>
      </div>
      <div style="text-align:center;margin-bottom:16px;">
        <a href="${upgradeUrl}/upgrade" style="display:inline-block;background:#4f46e5;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Upgrade Sekarang →
        </a>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:13px;">
        Mulai dari Rp 299.000/bulan. Batalkan kapan saja.
      </p>
    `);
  }

  private trialExpiredTemplate(name: string, companyName: string): string {
    const upgradeUrl = process.env.MEMBER_ADMIN_URL || 'http://localhost:4403';
    return this.baseTemplate(`
      <h2 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;">Trial Anda Telah Berakhir 😢</h2>
      <p style="color:#6b7280;margin:0 0 24px;">Halo <strong>${name}</strong>,</p>
      <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
        Trial 14 hari MonetraPOS untuk <strong>${companyName}</strong> telah berakhir.
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin:0 0 16px;">
        <p style="color:#991b1b;font-weight:600;margin:0 0 8px;">🔒 Akses Anda sekarang terbatas:</p>
        <ul style="color:#7f1d1d;margin:0;padding-left:20px;line-height:2;">
          <li>Tidak bisa membuat transaksi baru</li>
          <li>Tidak bisa menambah produk</li>
          <li>Hanya bisa melihat data yang ada</li>
        </ul>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:0 0 32px;">
        <p style="color:#166534;font-weight:600;margin:0 0 8px;">✅ Data Anda aman!</p>
        <p style="color:#15803d;margin:0;line-height:1.6;">
          Semua data Anda tersimpan dengan aman. Upgrade sekarang untuk memulihkan akses penuh.
        </p>
      </div>
      <div style="text-align:center;margin-bottom:16px;">
        <a href="${upgradeUrl}/upgrade" style="display:inline-block;background:#4f46e5;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Upgrade & Pulihkan Akses →
        </a>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:13px;">
        Mulai dari Rp 299.000/bulan. Batalkan kapan saja.
      </p>
    `);
  }

  private paymentInvoiceTemplate(name: string, invoiceNumber: string, amount: number, paymentUrl: string, dueDate: Date): string {
    const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    const formattedDueDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(dueDate);
    
    return this.baseTemplate(`
      <h2 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px;">Invoice Pembayaran 💳</h2>
      <p style="color:#6b7280;margin:0 0 24px;">Halo <strong>${name}</strong>,</p>
      <p style="color:#374151;line-height:1.6;margin:0 0 32px;">
        Terima kasih telah mendaftar di MonetraPOS. Berikut adalah detail invoice pembayaran Anda:
      </p>
      
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:24px;margin:0 0 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#6b7280;padding:8px 0;">Invoice Number:</td>
            <td style="color:#111827;font-weight:600;padding:8px 0;text-align:right;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:8px 0;">Total Amount:</td>
            <td style="color:#111827;font-weight:700;font-size:18px;padding:8px 0;text-align:right;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:8px 0;">Due Date:</td>
            <td style="color:#ef4444;font-weight:600;padding:8px 0;text-align:right;">${formattedDueDate}</td>
          </tr>
        </table>
      </div>

      <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:20px;margin:0 0 32px;">
        <p style="color:#92400e;font-weight:600;margin:0 0 8px;">⚠️ Pembayaran Diperlukan</p>
        <p style="color:#78350f;margin:0;line-height:1.6;">
          Akun Anda akan diaktifkan setelah pembayaran dikonfirmasi. Silakan selesaikan pembayaran sebelum tanggal jatuh tempo.
        </p>
      </div>

      <div style="text-align:center;margin:0 0 32px;">
        <a href="${paymentUrl}" style="display:inline-block;background:#10b981;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Bayar Sekarang
        </a>
      </div>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;">
        <p style="color:#075985;font-weight:600;margin:0 0 12px;">Metode Pembayaran yang Tersedia:</p>
        <ul style="color:#0c4a6e;margin:0;padding-left:20px;line-height:2;">
          <li>Virtual Account (BCA, BNI, Mandiri, BRI)</li>
          <li>QRIS (Scan & Pay)</li>
          <li>E-Wallet (OVO, DANA, LinkAja, ShopeePay)</li>
          <li>Kartu Kredit/Debit</li>
        </ul>
      </div>
    `);
  }
}

import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { EmailService } from './email.service';
import { EmailProvider } from './email-config.entity';

@ApiTags('Email Config')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get all email configs' })
  async getConfigs() {
    const configs = await this.emailService.getAllConfigs();
    // Mask passwords
    return configs.map(c => ({
      ...c,
      password: c.password ? '••••••••' : null,
      oauthClientSecret: c.oauthClientSecret ? '••••••••' : null,
      oauthRefreshToken: c.oauthRefreshToken ? '••••••••' : null,
    }));
  }

  @Put('config/mailtrap')
  @ApiOperation({ summary: 'Save Mailtrap config (for testing)' })
  async saveMailtrap(@Body() body: {
    isEnabled?: boolean;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    fromName?: string;
    fromEmail?: string;
  }) {
    const config = await this.emailService.upsertConfig(EmailProvider.MAILTRAP, {
      ...body,
      host: body.host || 'sandbox.smtp.mailtrap.io',
      port: body.port || 2525,
      secure: false,
    });
    return { ...config, password: config.password ? '••••••••' : null };
  }

  @Put('config/gmail')
  @ApiOperation({ summary: 'Save Gmail config (for production)' })
  async saveGmail(@Body() body: {
    isEnabled?: boolean;
    username?: string;
    password?: string; // App password
    fromName?: string;
    fromEmail?: string;
  }) {
    const config = await this.emailService.upsertConfig(EmailProvider.GMAIL, {
      ...body,
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
    });
    return { ...config, password: config.password ? '••••••••' : null };
  }

  @Put('config/smtp')
  @ApiOperation({ summary: 'Save custom SMTP config' })
  async saveSmtp(@Body() body: {
    isEnabled?: boolean;
    host?: string;
    port?: number;
    secure?: boolean;
    username?: string;
    password?: string;
    fromName?: string;
    fromEmail?: string;
  }) {
    const config = await this.emailService.upsertConfig(EmailProvider.SMTP, body);
    return { ...config, password: config.password ? '••••••••' : null };
  }

  @Post('test')
  @ApiOperation({ summary: 'Test email connection and send test email' })
  async testEmail(@Body() body: {
    provider: EmailProvider;
    host?: string;
    port?: number;
    secure?: boolean;
    username?: string;
    password?: string;
    fromName?: string;
    fromEmail?: string;
    testTo: string;
  }) {
    const { testTo, ...configData } = body;

    // If no password provided, load from saved config
    let testConfig: any = { ...configData };
    if (!testConfig.password) {
      const saved = await this.emailService.getAllConfigs();
      const savedForProvider = saved.find(c => c.provider === body.provider);
      if (savedForProvider?.password) {
        testConfig.password = savedForProvider.password;
        testConfig.host = testConfig.host || savedForProvider.host;
        testConfig.port = testConfig.port || savedForProvider.port;
        testConfig.username = testConfig.username || savedForProvider.username;
        testConfig.fromName = testConfig.fromName || savedForProvider.fromName;
        testConfig.fromEmail = testConfig.fromEmail || savedForProvider.fromEmail;
      }
    }

    if (!testConfig.username || !testConfig.password) {
      return { success: false, message: '❌ Username dan password harus diisi. Simpan konfigurasi terlebih dahulu.' };
    }

    // Test connection first
    const connResult = await this.emailService.testConnection(testConfig as any);
    if (!connResult.success) return connResult;

    // Send test email
    const sendResult = await this.emailService.sendMailDirect(testConfig as any, {
      to: testTo,
      subject: '✅ Test Email - MonetraPOS',
      html: `
        <div style="font-family:Arial,sans-serif;padding:32px;max-width:500px;margin:0 auto;">
          <div style="background:#4f46e5;border-radius:12px 12px 0 0;padding:24px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:20px;">MonetraPOS</h1>
          </div>
          <div style="background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:32px;">
            <h2 style="color:#111827;margin:0 0 16px;">✅ Konfigurasi Email Berhasil!</h2>
            <p style="color:#374151;margin:0 0 16px;">Email MonetraPOS berfungsi dengan baik.</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:8px 0;color:#6b7280;">Provider</td><td style="padding:8px 0;font-weight:600;">${body.provider}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Host</td><td style="padding:8px 0;font-weight:600;">${testConfig.host}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Waktu</td><td style="padding:8px 0;font-weight:600;">${new Date().toLocaleString('id-ID')}</td></tr>
            </table>
            <p style="color:#6b7280;font-size:13px;margin:24px 0 0;">Email ini dikirim sebagai test dari MonetraPOS.</p>
          </div>
        </div>
      `,
    });

    if (sendResult.success) {
      return { success: true, message: `✅ Test email berhasil dikirim ke ${testTo}` };
    }
    return { success: false, message: `Koneksi OK tapi gagal kirim: ${sendResult.error}` };
  }
}

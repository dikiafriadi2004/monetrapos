import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCouponsWebhookEmailTables1711659984000 implements MigrationInterface {
  name = 'CreateCouponsWebhookEmailTables1711659984000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Coupons table
    const hasCoupons = await queryRunner.hasTable('coupons');
    if (!hasCoupons) {
      await queryRunner.query(`
        CREATE TABLE coupons (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          discount_type ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
          discount_value DECIMAL(10,2) NOT NULL,
          max_uses INT NULL,
          used_count INT NOT NULL DEFAULT 0,
          expires_at TIMESTAMP NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          description TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    }

    // Webhook logs table
    const hasWebhooks = await queryRunner.hasTable('webhook_logs');
    if (!hasWebhooks) {
      await queryRunner.query(`
        CREATE TABLE webhook_logs (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          event VARCHAR(100) NOT NULL,
          source VARCHAR(50) NOT NULL,
          status ENUM('success','failed','pending') NOT NULL DEFAULT 'pending',
          payload JSON NULL,
          response JSON NULL,
          error_message TEXT NULL,
          processed_at TIMESTAMP NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_webhook_logs_status (status),
          INDEX idx_webhook_logs_created (created_at)
        )
      `);
    }

    // Email templates table
    const hasEmailTemplates = await queryRunner.hasTable('email_templates');
    if (!hasEmailTemplates) {
      await queryRunner.query(`
        CREATE TABLE email_templates (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          type VARCHAR(100) NOT NULL UNIQUE,
          name VARCHAR(200) NOT NULL,
          subject VARCHAR(300) NOT NULL,
          body LONGTEXT NOT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          variables TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Seed default email templates
      const templates = [
        { type: 'welcome', name: 'Selamat Datang', subject: 'Selamat Datang di MonetraPOS, {{name}}!', variables: 'name,email,companyName', body: '<h2>Selamat Datang, {{name}}!</h2><p>Akun Anda di MonetraPOS telah berhasil dibuat.</p><p>Email: {{email}}</p><p>Silakan login dan mulai kelola bisnis Anda.</p>' },
        { type: 'email_verification', name: 'Verifikasi Email', subject: 'Verifikasi Email Anda — MonetraPOS', variables: 'name,verificationUrl', body: '<h2>Halo {{name}},</h2><p>Klik link berikut untuk memverifikasi email Anda:</p><p><a href="{{verificationUrl}}">Verifikasi Email</a></p><p>Link berlaku 24 jam.</p>' },
        { type: 'invoice', name: 'Invoice Subscription', subject: 'Invoice #{{invoiceNumber}} — MonetraPOS', variables: 'name,invoiceNumber,amount,dueDate,paymentUrl', body: '<h2>Invoice #{{invoiceNumber}}</h2><p>Halo {{name}},</p><p>Berikut invoice subscription Anda:</p><p><strong>Total: {{amount}}</strong></p><p>Jatuh tempo: {{dueDate}}</p><p><a href="{{paymentUrl}}">Bayar Sekarang</a></p>' },
        { type: 'payment_success', name: 'Pembayaran Berhasil', subject: 'Pembayaran Berhasil — Subscription Aktif', variables: 'name,planName,expiryDate', body: '<h2>Pembayaran Berhasil! ✅</h2><p>Halo {{name}},</p><p>Subscription <strong>{{planName}}</strong> Anda telah aktif hingga {{expiryDate}}.</p>' },
        { type: 'subscription_expiry', name: 'Subscription Hampir Habis', subject: 'Subscription Anda akan berakhir dalam 7 hari', variables: 'name,expiryDate,renewUrl', body: '<h2>Reminder: Subscription Hampir Habis ⏰</h2><p>Halo {{name}},</p><p>Subscription Anda akan berakhir pada {{expiryDate}}.</p><p><a href="{{renewUrl}}">Perpanjang Sekarang</a></p>' },
        { type: 'subscription_expired', name: 'Subscription Expired', subject: 'Subscription Anda telah berakhir', variables: 'name,renewUrl', body: '<h2>Subscription Berakhir 🔴</h2><p>Halo {{name}},</p><p>Subscription Anda telah berakhir. Perpanjang untuk melanjutkan akses.</p><p><a href="{{renewUrl}}">Perpanjang Sekarang</a></p>' },
        { type: 'password_reset', name: 'Reset Password', subject: 'Reset Password MonetraPOS', variables: 'name,resetUrl', body: '<h2>Reset Password 🔑</h2><p>Halo {{name}},</p><p>Klik link berikut untuk reset password:</p><p><a href="{{resetUrl}}">Reset Password</a></p><p>Link berlaku 1 jam.</p>' },
      ];

      for (const t of templates) {
        const id = require('crypto').randomUUID();
        await queryRunner.query(
          `INSERT INTO email_templates (id, type, name, subject, body, variables) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, t.type, t.name, t.subject, t.body, t.variables]
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS email_templates');
    await queryRunner.query('DROP TABLE IF EXISTS webhook_logs');
    await queryRunner.query('DROP TABLE IF EXISTS coupons');
  }
}

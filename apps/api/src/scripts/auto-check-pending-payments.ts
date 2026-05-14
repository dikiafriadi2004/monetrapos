#!/usr/bin/env ts-node
/**
 * AUTO CHECK PENDING PAYMENTS
 * 
 * Script ini otomatis mengecek payment status dari Xendit
 * untuk semua invoice yang masih pending.
 * 
 * Jalankan via cron job setiap 10 menit:
 * Contoh crontab: star-slash-10 star star star star cd /path/to/apps/api && npm run check-payments
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { XenditPaymentService } from '../modules/payments/xendit-payment.service';

async function checkPendingPayments() {
  const logger = new Logger('AutoCheckPayments');
  logger.log('🔄 Starting auto-check pending payments...');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const xenditService = app.get(XenditPaymentService);

    // Get all pending invoices from last 7 days
    const pendingInvoices = await dataSource.query(`
      SELECT 
        i.id as invoice_id,
        i.invoice_number,
        i.total,
        i.created_at,
        c.name as company_name,
        c.email as company_email,
        u.email as owner_email,
        TIMESTAMPDIFF(HOUR, i.created_at, NOW()) as hours_pending
      FROM invoices i
      JOIN companies c ON c.id = i.company_id
      LEFT JOIN users u ON u.company_id = c.id AND u.role = 'owner'
      WHERE i.status = 'pending'
      AND i.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY i.created_at DESC
    `);

    if (pendingInvoices.length === 0) {
      logger.log('✅ No pending invoices found');
      await app.close();
      return;
    }

    logger.log(`📋 Found ${pendingInvoices.length} pending invoices`);

    let activatedCount = 0;
    let failedCount = 0;

    for (const invoice of pendingInvoices) {
      try {
        logger.log(`🔍 Checking invoice: ${invoice.invoice_number} (${invoice.hours_pending}h pending)`);

        // Get payment transaction to find Xendit invoice ID
        const transactions = await dataSource.query(`
          SELECT gateway_transaction_id
          FROM payment_transactions
          WHERE invoice_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `, [invoice.invoice_id]);

        let xenditInvoiceId = transactions[0]?.gateway_transaction_id;

        // If no transaction yet, try to extract from payment_url or use invoice_number
        if (!xenditInvoiceId) {
          // Try to get payment_url from invoice
          const invoiceData = await dataSource.query(`
            SELECT payment_url, payment_reference
            FROM invoices
            WHERE id = ?
          `, [invoice.invoice_id]);

          if (invoiceData[0]?.payment_url) {
            // Extract Xendit invoice ID from URL
            // URL format: https://checkout-staging.xendit.co/web/{invoice_id}
            const urlMatch = invoiceData[0].payment_url.match(/\/web\/([a-f0-9]+)$/);
            if (urlMatch) {
              xenditInvoiceId = urlMatch[1];
              logger.log(`Extracted Xendit invoice ID from URL: ${xenditInvoiceId}`);
            }
          } else if (invoiceData[0]?.payment_reference) {
            xenditInvoiceId = invoiceData[0].payment_reference;
          } else {
            logger.warn(`No transaction or payment URL found for ${invoice.invoice_number}, skipping`);
            continue;
          }
        }

        // Check status from Xendit
        try {
          const xenditInvoice = await xenditService.getInvoice(xenditInvoiceId);
          
          if (!xenditInvoice) {
            logger.warn(`Invoice ${invoice.invoice_number} not found in Xendit`);
            continue;
          }

          const status = xenditInvoice.status?.toUpperCase();
          logger.log(`Xendit status for ${invoice.invoice_number}: ${status}`);

          if (status === 'PAID' || status === 'SETTLED') {
            logger.log(`✅ Payment confirmed! Activating ${invoice.invoice_number}...`);

            // Update invoice
            await dataSource.query(`
              UPDATE invoices 
              SET status = 'paid',
                  paid_at = NOW(),
                  payment_method = 'xendit',
                  payment_reference = ?,
                  updated_at = NOW()
              WHERE id = ?
            `, [
              xenditInvoice.id,
              invoice.invoice_id
            ]);

            // Activate subscription
            await dataSource.query(`
              UPDATE subscriptions s
              JOIN invoices i ON i.subscription_id = s.id
              SET s.status = 'active',
                  s.start_date = NOW(),
                  s.end_date = DATE_ADD(NOW(), INTERVAL COALESCE(s.duration_months, 1) MONTH),
                  s.current_period_start = NOW(),
                  s.current_period_end = DATE_ADD(NOW(), INTERVAL COALESCE(s.duration_months, 1) MONTH),
                  s.updated_at = NOW()
              WHERE i.id = ?
            `, [invoice.invoice_id]);

            // Activate company
            await dataSource.query(`
              UPDATE companies c
              JOIN invoices i ON i.company_id = c.id
              SET c.status = 'active',
                  c.subscription_status = 'active',
                  c.subscription_ends_at = (
                    SELECT DATE_ADD(NOW(), INTERVAL COALESCE(s.duration_months, 1) MONTH)
                    FROM subscriptions s
                    WHERE s.id = i.subscription_id
                  ),
                  c.updated_at = NOW()
              WHERE i.id = ?
            `, [invoice.invoice_id]);

            // Update/create payment transaction
            if (transactions.length > 0) {
              await dataSource.query(`
                UPDATE payment_transactions
                SET status = 'success',
                    gateway_transaction_id = ?,
                    payment_method = 'xendit',
                    payment_channel = 'xendit',
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE invoice_id = ?
              `, [
                xenditInvoice.id,
                invoice.invoice_id
              ]);
            } else {
              // Create transaction if doesn't exist
              await dataSource.query(`
                INSERT INTO payment_transactions (
                  id, invoice_id, company_id, amount, gateway, status,
                  gateway_transaction_id, payment_method, payment_channel,
                  completed_at, created_at, updated_at
                ) VALUES (UUID(), ?, (SELECT company_id FROM invoices WHERE id = ?), ?, 'xendit', 'success', ?, 'xendit', 'xendit', NOW(), NOW(), NOW())
              `, [
                invoice.invoice_id,
                invoice.invoice_id,
                xenditInvoice.amount || invoice.total,
                xenditInvoice.id
              ]);
            }

            // Verify email
            await dataSource.query(`
              UPDATE users u
              JOIN invoices i ON i.company_id = u.company_id
              SET u.email_verified = 1,
                  u.email_verified_at = NOW()
              WHERE i.id = ?
              AND u.role = 'owner'
              AND u.email_verified = 0
            `, [invoice.invoice_id]);

            logger.log(`✅ Successfully activated ${invoice.invoice_number} for ${invoice.owner_email}`);
            activatedCount++;

          } else if (status === 'EXPIRED') {
            logger.warn(`⏰ Invoice ${invoice.invoice_number} expired in Xendit`);
            // Optionally mark as expired in database
            await dataSource.query(`
              UPDATE invoices SET status = 'expired', updated_at = NOW() WHERE id = ?
            `, [invoice.invoice_id]);
          } else {
            logger.log(`⏳ Invoice ${invoice.invoice_number} still ${status} in Xendit`);
          }

        } catch (xenditError: any) {
          logger.error(`Failed to check Xendit for ${invoice.invoice_number}: ${xenditError.message}`);
          failedCount++;
        }

      } catch (error: any) {
        logger.error(`Error processing invoice ${invoice.invoice_number}: ${error.message}`);
        failedCount++;
      }
    }

    logger.log(`\n📊 Summary:`);
    logger.log(`   Total pending: ${pendingInvoices.length}`);
    logger.log(`   ✅ Activated: ${activatedCount}`);
    logger.log(`   ❌ Failed: ${failedCount}`);
    logger.log(`   ⏳ Still pending: ${pendingInvoices.length - activatedCount - failedCount}`);

  } catch (error: any) {
    logger.error(`Fatal error: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await app.close();
  }
}

// Run the script
checkPendingPayments()
  .then(() => {
    console.log('\n✅ Auto-check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Auto-check failed:', error);
    process.exit(1);
  });


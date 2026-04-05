import {
  Controller,
  Post,
  Get,
  Body,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentGatewayService } from './payment-gateway.service';
import { UnifiedPaymentService } from './unified-payment.service';
import { BillingService } from '../billing/billing.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { StoresService } from '../stores/stores.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service';
import { EmailService } from '../email/email.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../companies/company.entity';
import { User, UserRole } from '../users/user.entity';
import { PaymentWebhook } from '../billing/payment-webhook.entity';
import { PaymentTransactionStatus } from '../billing/payment-transaction.entity';
import { InvoiceStatus } from '../billing/invoice.entity';

@ApiTags('Payment Gateway')
@Controller('payment-gateway')
export class PaymentGatewayController {
  private readonly logger = new Logger(PaymentGatewayController.name);

  constructor(
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly unifiedPaymentService: UnifiedPaymentService,
    private readonly billingService: BillingService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly storesService: StoresService,
    private readonly notificationsService: NotificationsService,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly emailService: EmailService,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PaymentWebhook) private readonly webhookRepo: Repository<PaymentWebhook>,
  ) {}

  @Get('available')
  @ApiOperation({ summary: 'Get available payment gateways' })
  async getAvailableGateways() {
    return { gateways: await this.unifiedPaymentService.getAvailableGateways() };
  }

  @Get('preference')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async getGatewayPreference() {
    return { gateway: 'xendit', available: await this.unifiedPaymentService.getAvailableGateways() };
  }

  /**
   * Admin: Manually verify payment from Xendit and activate subscription
   * POST /payment-gateway/admin/verify-payment
   * Body: { invoiceNumber: string } OR { xenditInvoiceId: string }
   */
  @Post('admin/verify-payment')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Manually verify Xendit payment and activate subscription' })
  async adminVerifyPayment(@Body() body: { invoiceNumber?: string; xenditInvoiceId?: string }, @Request() req: any) {
    if (req.user?.type !== 'company_admin') {
      return { success: false, message: 'Only platform admins can manually verify payments' };
    }

    try {
      let invoiceNumber = body.invoiceNumber;

      if (!invoiceNumber && body.xenditInvoiceId) {
        const xenditInvoice = await this.unifiedPaymentService.getXenditInvoice(body.xenditInvoiceId);
        invoiceNumber = xenditInvoice?.externalId;
      }

      if (!invoiceNumber) {
        return { success: false, message: 'invoiceNumber or xenditInvoiceId required' };
      }

      // Find invoice directly by invoice number
      const invoices = await this.billingService.findAllInvoices();
      const invoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);

      if (!invoice) {
        return { success: false, message: `Invoice not found: ${invoiceNumber}` };
      }

      if (invoice.status === 'paid') {
        // Invoice already paid but subscription might not be activated yet - try to activate
        this.logger.warn(`Invoice ${invoiceNumber} already paid, attempting to activate subscription...`);
        await this.activateSubscription(invoice.id);
        return { success: true, message: `Subscription diaktifkan dari invoice yang sudah dibayar: ${invoiceNumber}` };
      }

      // Mark invoice as paid
      await this.billingService.updateInvoiceStatus(invoice.id, InvoiceStatus.PAID, {
        paymentMethod: 'manual_verify',
        paymentReference: `admin-verify-${Date.now()}`,
      });

      // Activate subscription
      await this.activateSubscription(invoice.id);

      this.logger.log(`Payment manually verified for invoice: ${invoiceNumber} by admin: ${req.user.email}`);
      return { success: true, message: `✅ Invoice ${invoiceNumber} diverifikasi dan subscription diaktifkan!` };
    } catch (err: any) {
      this.logger.error('Manual payment verification failed', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Admin: List all pending invoices
   */
  @Get('admin/pending-invoices')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] List pending invoices' })
  async getPendingInvoices(@Request() req: any) {
    if (req.user?.type !== 'company_admin') {
      return { success: false, message: 'Only platform admins can access this' };
    }
    return this.billingService.findAllInvoices();
  }

  /**
   * Member: Check payment status from Xendit and auto-activate if paid
   * POST /payment-gateway/check-payment
   * Body: { invoiceNumber: string }
   * Useful when webhook didn't arrive (local dev / firewall)
   */
  @Post('check-payment')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check payment status from Xendit and activate if paid' })
  async checkPaymentStatus(@Body() body: { invoiceNumber: string }, @Request() req: any) {
    const { invoiceNumber } = body;
    if (!invoiceNumber) return { success: false, message: 'invoiceNumber required' };

    try {
      // Find invoice in DB
      const invoices = await this.billingService.findInvoicesByCompany(req.user.companyId);
      const invoice = invoices.find((inv: any) => inv.invoiceNumber === invoiceNumber);

      if (!invoice) return { success: false, message: 'Invoice not found' };
      if (invoice.status === 'paid') return { success: true, message: 'Already paid', alreadyPaid: true };

      // Check status directly from Xendit
      const xenditInvoice = await this.unifiedPaymentService.getXenditInvoice(invoiceNumber);
      if (!xenditInvoice) return { success: false, message: 'Invoice not found in Xendit' };

      const status = xenditInvoice.status?.toUpperCase();
      if (status === 'PAID' || status === 'SETTLED') {
        await this.activateSubscription(invoice.id);
        return { success: true, message: 'Payment confirmed and subscription activated!' };
      }

      return { success: false, message: `Payment status: ${status}. Please complete payment first.`, status };
    } catch (err: any) {
      this.logger.error('check-payment error:', err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * Xendit webhook handler
   * POST /payment-gateway/webhook/xendit
   */
  @Post('webhook/xendit')
  async handleXenditWebhook(@Body() notification: any) {
    this.logger.log(`Received Xendit webhook for invoice: ${notification.id}`);

    const webhook = this.webhookRepo.create({
      paymentGateway: 'xendit' as any,
      eventType: notification.status,
      payload: notification,
      isVerified: false,
      isProcessed: false,
    });
    await this.webhookRepo.save(webhook);

    try {
      const parsed = await this.unifiedPaymentService.parseWebhookNotification(notification);
      const invoiceNumber = parsed.orderId;

      const transactions = await this.billingService.findPaymentTransactionsByInvoiceNumber(invoiceNumber);
      if (transactions.length === 0) {
        this.logger.error(`No transaction found for invoice: ${invoiceNumber}`);
        return { success: false, message: 'Transaction not found' };
      }

      const transaction = transactions[0];
      let transactionStatus: PaymentTransactionStatus;
      if (parsed.isSuccess) transactionStatus = PaymentTransactionStatus.SUCCESS;
      else if (parsed.isPending) transactionStatus = PaymentTransactionStatus.PENDING;
      else transactionStatus = PaymentTransactionStatus.FAILED;

      await this.billingService.updatePaymentTransaction(transaction.id, {
        status: transactionStatus,
        gatewayTransactionId: notification.id,
        paymentMethod: notification.payment_method || 'xendit',
        paymentChannel: notification.payment_channel || 'xendit',
        gatewayResponse: notification,
      });

      if (parsed.isSuccess) {
        await this.activateSubscription(transaction.invoiceId);
      }

      webhook.isVerified = true;
      webhook.isProcessed = true;
      webhook.processedAt = new Date();
      await this.webhookRepo.save(webhook);

      return { success: true, message: 'Webhook processed' };
    } catch (error) {
      this.logger.error('Error processing Xendit webhook', error);
      webhook.errorMessage = error.message;
      await this.webhookRepo.save(webhook);
      throw error;
    }
  }

  private async activateSubscription(invoiceId: string): Promise<void> {
    this.logger.log(`Activating subscription for invoice: ${invoiceId}`);

    const invoice = await this.billingService.findInvoice(invoiceId, null);
    if (!invoice) {
      this.logger.error(`Invoice not found: ${invoiceId}`);
      return;
    }
    if (!invoice.subscriptionId) {
      this.logger.error(`Invoice ${invoiceId} has no subscriptionId`);
      return;
    }

    // Mark invoice as paid first
    await this.billingService.updateInvoiceStatus(invoiceId, InvoiceStatus.PAID);

    const subscription = await this.subscriptionsService.findOne(invoice.subscriptionId);
    if (!subscription) {
      this.logger.error(`Subscription not found: ${invoice.subscriptionId}`);
      return;
    }

    if (subscription.pendingRenewal) {
      await this.subscriptionsService.applyRenewal(subscription.id);
      this.logger.log(`Renewal applied for subscription: ${subscription.id}`);
      return;
    }

    const now = new Date();
    const endDate = new Date(now);

    // Get duration from subscription, or parse from invoice lineItems as fallback
    let durationMonths = subscription.durationMonths;
    if (!durationMonths || durationMonths < 1) {
      // Try to parse from invoice lineItems description e.g. "Basic - 12 months"
      const desc = invoice.lineItems?.[0]?.description || '';
      const match = desc.match(/(\d+)\s*month/i);
      durationMonths = match ? parseInt(match[1]) : 1;
      this.logger.warn(`subscription.durationMonths was null, parsed ${durationMonths} from invoice lineItems`);
    }

    endDate.setMonth(endDate.getMonth() + durationMonths);
    this.logger.log(`Duration: ${durationMonths} months → end date: ${endDate.toISOString()}`);

    await this.subscriptionsService.update(subscription.id, {
      status: 'active' as any,
      startDate: now,
      endDate,
      durationMonths,
      currentPeriodStart: now,
      currentPeriodEnd: endDate,
    });

    await this.companyRepo.update(subscription.companyId, {
      status: 'active',
      subscriptionStatus: 'active',
      subscriptionEndsAt: endDate,
    });

    this.logger.log(`Subscription ${subscription.id} activated, ends: ${endDate.toISOString()}`);

    // Create default store first, then seed payment methods
    let defaultStoreId: string | null = null;
    try {
      const company = await this.companyRepo.findOne({ where: { id: subscription.companyId } });
      const store = await this.storesService.createDefaultStore(subscription.companyId, company?.name || 'Default Store');
      defaultStoreId = (store as any)?.id || null;
      this.logger.log(`Default store created: ${defaultStoreId}`);
    } catch (e) {
      // Store might already exist
      this.logger.warn('createDefaultStore skipped:', e.message);
      // Try to get existing store
      try {
        const stores = await this.storesService.findAll(subscription.companyId);
        defaultStoreId = (stores as any)?.[0]?.id || null;
      } catch {}
    }

    if (defaultStoreId) {
      try {
        await this.paymentMethodsService.seedDefaultPaymentMethods(subscription.companyId);
        this.logger.log('Default payment methods seeded');
      } catch (e) { this.logger.warn('seedPaymentMethods skipped:', e.message); }
    }

    const owner = await this.userRepo.findOne({ where: { companyId: subscription.companyId, role: UserRole.OWNER } });
    if (owner) {
      try {
        const company = await this.companyRepo.findOne({ where: { id: subscription.companyId } });
        await this.emailService.sendWelcomeEmail(owner.email, owner.name, company?.name || '');
      } catch (e) { this.logger.warn('sendWelcomeEmail skipped:', e.message); }
    }

    this.logger.log(`✅ Subscription fully activated for company: ${subscription.companyId}`);
  }
}

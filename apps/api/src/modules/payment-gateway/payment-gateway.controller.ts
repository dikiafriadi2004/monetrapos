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
    if (!invoice?.subscriptionId) return;

    await this.billingService.updateInvoiceStatus(invoiceId, InvoiceStatus.PAID);

    const subscription = await this.subscriptionsService.findOne(invoice.subscriptionId);
    if (!subscription) return;

    if (subscription.pendingRenewal) {
      await this.subscriptionsService.applyRenewal(subscription.id);
      return;
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + (subscription.durationMonths || 1));

    subscription.status = 'active' as any;
    subscription.startDate = now;
    subscription.endDate = endDate;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = endDate;
    await this.subscriptionsService.update(subscription.id, subscription);

    const company = await this.companyRepo.findOne({ where: { id: subscription.companyId } });
    if (!company) return;

    await this.companyRepo.update(subscription.companyId, {
      status: 'active',
      subscriptionStatus: 'active',
      subscriptionEndsAt: endDate,
    });

    try { await this.storesService.createDefaultStore(subscription.companyId, company.name); } catch {}
    try { await this.paymentMethodsService.seedDefaultPaymentMethods(subscription.companyId); } catch {}

    const owner = await this.userRepo.findOne({ where: { companyId: subscription.companyId, role: UserRole.OWNER } });
    if (owner) {
      try { await this.notificationsService.queueWelcomeEmail(owner.email, owner.name, company.name); } catch {}
    }

    this.logger.log(`Subscription activated for company: ${subscription.companyId}`);
  }
}

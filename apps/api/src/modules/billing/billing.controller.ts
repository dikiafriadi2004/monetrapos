import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { PaymentGateway } from './payment-transaction.entity';

@Controller('billing')
// @UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices')
  async getInvoices(@Request() req: any) {
    // TODO: Get companyId from authenticated user
    const companyId = req.user?.companyId || 'temp-company-id';

    return this.billingService.findInvoicesByCompany(companyId);
  }

  @Get('invoices/:id')
  async getInvoice(@Param('id') id: string, @Request() req: any) {
    // TODO: Get companyId from authenticated user
    const companyId = req.user?.companyId || 'temp-company-id';

    return this.billingService.findInvoice(id, companyId);
  }

  @Post('invoices/:id/pay')
  async createPayment(
    @Param('id') invoiceId: string,
    @Body() body: { gateway: PaymentGateway },
    @Request() req: any,
  ) {
    // TODO: Get companyId from authenticated user
    const companyId = req.user?.companyId || 'temp-company-id';

    // Get invoice
    const invoice = await this.billingService.findInvoice(invoiceId, companyId);

    // Create payment transaction
    const transaction = await this.billingService.createPaymentTransaction({
      invoiceId: invoice.id,
      companyId,
      gateway: body.gateway,
      amount: invoice.total,
    });

    // TODO: Generate payment URL from payment gateway
    // For now, return transaction
    return {
      transaction,
      paymentUrl: `https://payment-gateway.com/pay/${transaction.id}`,
    };
  }

  @Post('webhooks/:gateway')
  async handleWebhook(
    @Param('gateway') gateway: string,
    @Body() body: any,
  ) {
    // TODO: Verify webhook signature

    // Parse webhook data based on gateway
    // This is a simplified example
    const webhookData = {
      gateway: gateway as PaymentGateway,
      gatewayTransactionId: body.transaction_id || body.order_id,
      status: this.mapGatewayStatus(body.transaction_status || body.status),
      paymentMethod: body.payment_type,
      paymentChannel: body.payment_channel,
      gatewayResponse: body,
    };

    await this.billingService.handlePaymentWebhook(webhookData);

    return { success: true };
  }

  private mapGatewayStatus(gatewayStatus: string): any {
    // Map gateway-specific status to our status
    const statusMap: Record<string, string> = {
      // Midtrans
      capture: 'success',
      settlement: 'success',
      pending: 'pending',
      deny: 'failed',
      cancel: 'failed',
      expire: 'expired',
      refund: 'refunded',
      // Xendit
      PAID: 'success',
      PENDING: 'pending',
      EXPIRED: 'expired',
      FAILED: 'failed',
    };

    return statusMap[gatewayStatus] || 'pending';
  }
}

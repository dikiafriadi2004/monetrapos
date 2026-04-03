import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { BillingService } from './billing.service';
import { PaymentGateway } from './payment-transaction.entity';
import * as path from 'path';
import * as fs from 'fs';

@Controller('billing')
// @UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('admin/invoices')
  @UseGuards(AuthGuard('jwt'))
  async getAllInvoices(@Request() req: any) {
    // Company admin can see all invoices
    if (req.user?.type !== 'company_admin') {
      return this.billingService.findInvoicesByCompany(req.user?.companyId);
    }
    return this.billingService.findAllInvoices();
  }

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

  @Get('invoices/:id/download')
  async downloadInvoice(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    // TODO: Get companyId from authenticated user
    const companyId = req.user?.companyId || null;

    const invoice = await this.billingService.findInvoice(id, companyId);

    if (!invoice.invoicePdfUrl) {
      // Generate PDF if not exists
      await this.billingService.generateAndSaveInvoicePdf(invoice);
      // Reload invoice to get updated PDF URL
      const updatedInvoice = await this.billingService.findInvoice(
        id,
        companyId,
      );
      invoice.invoicePdfUrl = updatedInvoice.invoicePdfUrl;
    }

    const filePath = path.join(process.cwd(), invoice.invoicePdfUrl);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Invoice PDF not found');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Post('invoices/:id/regenerate-pdf')
  async regenerateInvoicePdf(@Param('id') id: string, @Request() req: any) {
    // TODO: Get companyId from authenticated user
    const companyId = req.user?.companyId || null;

    const invoice = await this.billingService.findInvoice(id, companyId);
    const pdfPath =
      await this.billingService.generateAndSaveInvoicePdf(invoice);

    return {
      message: 'Invoice PDF regenerated successfully',
      pdfUrl: pdfPath,
    };
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
  async handleWebhook(@Param('gateway') gateway: string, @Body() body: any) {
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

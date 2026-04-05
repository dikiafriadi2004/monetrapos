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
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    @Inject(forwardRef(() => PaymentGatewayService))
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {}

  /** GET /billing/admin/invoices — All invoices (company_admin only) */
  @Get('admin/invoices')
  @ApiOperation({ summary: 'Get all invoices (admin only)' })
  async getAllInvoices(@Request() req: any) {
    if (req.user?.type !== 'company_admin') {
      return this.billingService.findInvoicesByCompany(req.user?.companyId);
    }
    return this.billingService.findAllInvoices();
  }

  /** GET /billing/invoices */
  @Get('invoices')
  @ApiOperation({ summary: 'Get invoices for current company' })
  async getInvoices(@Request() req: any) {
    const companyId = req.user?.companyId;
    if (!companyId) throw new UnauthorizedException('Company not found');
    return this.billingService.findInvoicesByCompany(companyId);
  }

  /** GET /billing/invoices/:id */
  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get single invoice' })
  async getInvoice(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user?.companyId;
    return this.billingService.findInvoice(id, companyId);
  }

  /** GET /billing/invoices/:id/download */
  @Get('invoices/:id/download')
  @ApiOperation({ summary: 'Download invoice PDF' })
  async downloadInvoice(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const companyId = req.user?.companyId;
    const invoice = await this.billingService.findInvoice(id, companyId);

    if (!invoice.invoicePdfUrl) {
      await this.billingService.generateAndSaveInvoicePdf(invoice);
      const updated = await this.billingService.findInvoice(id, companyId);
      invoice.invoicePdfUrl = updated.invoicePdfUrl;
    }

    const filePath = path.join(process.cwd(), invoice.invoicePdfUrl);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Invoice PDF not found');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    fs.createReadStream(filePath).pipe(res);
  }

  /** POST /billing/invoices/:id/regenerate-pdf */
  @Post('invoices/:id/regenerate-pdf')
  @ApiOperation({ summary: 'Regenerate invoice PDF' })
  async regenerateInvoicePdf(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user?.companyId;
    const invoice = await this.billingService.findInvoice(id, companyId);
    const pdfPath = await this.billingService.generateAndSaveInvoicePdf(invoice);
    return { message: 'Invoice PDF regenerated successfully', pdfUrl: pdfPath };
  }

  /** POST /billing/invoices/:id/pay — Initiate payment via gateway */
  @Post('invoices/:id/pay')
  @ApiOperation({ summary: 'Initiate payment for invoice' })
  async createPayment(
    @Param('id') invoiceId: string,
    @Body() body: { gateway?: string },
    @Request() req: any,
  ) {
    const companyId = req.user?.companyId;
    if (!companyId) throw new UnauthorizedException('Company not found');

    const invoice = await this.billingService.findInvoice(invoiceId, companyId);

    // Try to generate real payment URL via configured gateway
    try {
      const frontendUrl = process.env.MEMBER_ADMIN_URL || 'http://localhost:4403';
      const paymentResponse = await this.paymentGatewayService.createPaymentUrl({
        orderId: invoice.invoiceNumber,
        amount: invoice.total,
        customerName: req.user?.name || 'Customer',
        customerEmail: req.user?.email || '',
        successRedirectUrl: `${frontendUrl}/payment-callback?status=PAID`,
        failureRedirectUrl: `${frontendUrl}/payment-callback?status=FAILED`,
        itemDetails: [{
          id: invoice.id,
          name: `Invoice ${invoice.invoiceNumber}`,
          price: invoice.total,
          quantity: 1,
        }],
      });

      // Update invoice with payment URL
      await this.billingService.updateInvoicePaymentUrl(invoice.id, paymentResponse.redirectUrl);

      return { paymentUrl: paymentResponse.redirectUrl, invoiceNumber: invoice.invoiceNumber };
    } catch (err) {
      // Gateway not configured — return pending status
      return {
        paymentUrl: null,
        invoiceNumber: invoice.invoiceNumber,
        message: 'Payment gateway not configured. Please contact support.',
      };
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import Xendit from 'xendit-node';
import { PaymentGatewayConfigService } from '../payment-gateway/payment-gateway-config.service';

export interface XenditInvoiceData {
  externalId: string;
  amount: number;
  payerEmail: string;
  description: string;
  invoiceDuration?: number;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
  currency?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    category?: string;
  }>;
}

export interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  status: string;
  amount: number;
  payer_email: string;
  description: string;
  invoice_url: string;
  expiry_date: string;
  currency: string;
}

@Injectable()
export class XenditPaymentService {
  private readonly logger = new Logger(XenditPaymentService.name);

  constructor(private configService: PaymentGatewayConfigService) {}

  private async getClient(): Promise<Xendit> {
    const config = await this.configService.getXenditConfig();
    if (!config) throw new Error('Xendit payment gateway is not configured. Please set up Xendit credentials in Platform Settings.');
    return new Xendit({ secretKey: config.secretKey });
  }

  async isEnabled(): Promise<boolean> {
    const config = await this.configService.getXenditConfig();
    return !!config;
  }

  async createInvoice(data: XenditInvoiceData): Promise<XenditInvoiceResponse> {
    const client = await this.getClient();
    try {
      this.logger.log(`Creating Xendit invoice for ${data.externalId}`);
      const { Invoice } = client;
      const invoice = await Invoice.createInvoice({
        data: {
          externalId: data.externalId,
          amount: data.amount,
          payerEmail: data.payerEmail,
          description: data.description,
          invoiceDuration: data.invoiceDuration || 86400,
          successRedirectUrl: data.successRedirectUrl,
          failureRedirectUrl: data.failureRedirectUrl,
          currency: data.currency || 'IDR',
          items: data.items,
          shouldSendEmail: true,
        },
      });
      this.logger.log(`Xendit invoice created: ${(invoice as any).id}`);
      return invoice as unknown as XenditInvoiceResponse;
    } catch (error) {
      this.logger.error('Failed to create Xendit invoice', error);
      throw new Error(`Xendit invoice creation failed: ${error.message}`);
    }
  }

  async getInvoice(invoiceId: string): Promise<XenditInvoiceResponse> {
    const client = await this.getClient();
    const { Invoice } = client;
    const invoice = await Invoice.getInvoiceById({ invoiceId });
    return invoice as unknown as XenditInvoiceResponse;
  }

  async verifyWebhookToken(receivedToken: string): Promise<boolean> {
    const config = await this.configService.getXenditConfig();
    if (!config?.webhookToken) return false;
    return receivedToken === config.webhookToken;
  }

  parseWebhookNotification(payload: any): {
    invoiceId: string;
    externalId: string;
    status: string;
    amount: number;
    paidAmount: number;
    paymentMethod: string;
    paymentChannel: string;
    paidAt: Date | null;
  } {
    return {
      invoiceId: payload.id,
      externalId: payload.external_id,
      status: payload.status,
      amount: payload.amount,
      paidAmount: payload.paid_amount || 0,
      paymentMethod: payload.payment_method || 'unknown',
      paymentChannel: payload.payment_channel || 'unknown',
      paidAt: payload.paid_at ? new Date(payload.paid_at) : null,
    };
  }

  mapXenditStatus(xenditStatus: string): string {
    const statusMap: Record<string, string> = {
      PENDING: 'pending',
      PAID: 'paid',
      SETTLED: 'paid',
      EXPIRED: 'expired',
    };
    return statusMap[xenditStatus] || 'pending';
  }
}

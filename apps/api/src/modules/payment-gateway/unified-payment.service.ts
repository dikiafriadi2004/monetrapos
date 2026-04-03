import { Injectable, Logger } from '@nestjs/common';
import { XenditPaymentService } from '../payments/xendit-payment.service';

export type PaymentGatewayType = 'xendit';

export interface UnifiedPaymentRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  description: string;
  itemDetails?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
}

export interface UnifiedPaymentResponse {
  gateway: PaymentGatewayType;
  redirectUrl: string;
  orderId: string;
  invoiceId?: string;
}

@Injectable()
export class UnifiedPaymentService {
  private readonly logger = new Logger(UnifiedPaymentService.name);

  constructor(private xenditService: XenditPaymentService) {}

  async createPayment(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResponse> {
    this.logger.log(`Creating Xendit payment for order ${request.orderId}`);

    const invoice = await this.xenditService.createInvoice({
      externalId: request.orderId,
      amount: request.amount,
      payerEmail: request.customerEmail,
      description: request.description,
      successRedirectUrl: request.successRedirectUrl,
      failureRedirectUrl: request.failureRedirectUrl,
      items: request.itemDetails?.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    });

    return {
      gateway: 'xendit',
      redirectUrl: invoice.invoice_url,
      orderId: request.orderId,
      invoiceId: invoice.id,
    };
  }

  async parseWebhookNotification(payload: any): Promise<{
    orderId: string;
    status: string;
    isSuccess: boolean;
    isPending: boolean;
    isFailed: boolean;
    amount?: number;
    paidAt?: Date;
  }> {
    const parsed = this.xenditService.parseWebhookNotification(payload);
    const mappedStatus = this.xenditService.mapXenditStatus(parsed.status);

    return {
      orderId: parsed.externalId,
      status: mappedStatus,
      isSuccess: mappedStatus === 'paid',
      isPending: mappedStatus === 'pending',
      isFailed: mappedStatus === 'expired' || mappedStatus === 'failed',
      amount: parsed.amount,
      paidAt: parsed.paidAt || undefined,
    };
  }

  async verifyWebhookToken(token: string): Promise<boolean> {
    return this.xenditService.verifyWebhookToken(token);
  }

  async getAvailableGateways() {
    const enabled = await this.xenditService.isEnabled();
    return [{ gateway: 'xendit', name: 'Xendit', enabled }];
  }
}

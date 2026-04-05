import { Injectable, Logger } from '@nestjs/common';
import { XenditPaymentService } from '../payments/xendit-payment.service';

export interface PaymentRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  itemDetails?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
}

export interface PaymentResponse {
  token?: string;
  redirectUrl: string;
  orderId: string;
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(private xenditService: XenditPaymentService) {}

  async createPaymentUrl(request: PaymentRequest): Promise<PaymentResponse> {
    const invoice = await this.xenditService.createInvoice({
      externalId: request.orderId,
      amount: request.amount,
      payerEmail: request.customerEmail,
      description: `Payment for order ${request.orderId}`,
      successRedirectUrl: request.successRedirectUrl,
      failureRedirectUrl: request.failureRedirectUrl,
      items: request.itemDetails?.map(i => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
    });

    return {
      redirectUrl: (invoice as any).invoiceUrl || (invoice as any).invoice_url,
      orderId: request.orderId,
    };
  }

  async verifyWebhookToken(token: string): Promise<boolean> {
    return this.xenditService.verifyWebhookToken(token);
  }

  parseWebhookNotification(payload: any) {
    const parsed = this.xenditService.parseWebhookNotification(payload);
    const status = this.xenditService.mapXenditStatus(parsed.status);
    return {
      isSuccess: status === 'paid',
      isPending: status === 'pending',
      isFailed: status === 'expired' || status === 'failed',
      status,
    };
  }
}

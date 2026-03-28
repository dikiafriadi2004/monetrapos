import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

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
}

export interface PaymentResponse {
  token: string;
  redirectUrl: string;
  orderId: string;
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly serverKey: string;
  private readonly clientKey: string;
  private readonly isProduction: boolean;
  private readonly snapUrl: string;

  constructor(private configService: ConfigService) {
    this.serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY') || '';
    this.clientKey = this.configService.get<string>('MIDTRANS_CLIENT_KEY') || '';
    this.isProduction =
      this.configService.get<string>('MIDTRANS_ENVIRONMENT') === 'production';
    this.snapUrl = this.isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
  }

  async createPaymentUrl(request: PaymentRequest): Promise<PaymentResponse> {
    const payload = {
      transaction_details: {
        order_id: request.orderId,
        gross_amount: request.amount,
      },
      customer_details: {
        first_name: request.customerName,
        email: request.customerEmail,
        phone: request.customerPhone,
      },
      item_details: request.itemDetails || [
        {
          id: 'subscription',
          name: 'Subscription Payment',
          price: request.amount,
          quantity: 1,
        },
      ],
    };

    try {
      const response = await fetch(this.snapUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(this.serverKey + ':').toString('base64')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Midtrans API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json();

      return {
        token: data.token,
        redirectUrl: data.redirect_url,
        orderId: request.orderId,
      };
    } catch (error) {
      this.logger.error('Failed to create payment URL', error);
      throw error;
    }
  }

  verifySignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signatureKey: string,
  ): boolean {
    const hash = crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${this.serverKey}`)
      .digest('hex');

    return hash === signatureKey;
  }

  async getTransactionStatus(orderId: string): Promise<any> {
    const url = this.isProduction
      ? `https://api.midtrans.com/v2/${orderId}/status`
      : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(this.serverKey + ':').toString('base64')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get transaction status');
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Failed to get transaction status', error);
      throw error;
    }
  }
}

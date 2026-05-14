import { Controller, Post, Get, Body, Param, UseGuards, Request, Logger, Optional } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { PaymentGatewayConfigService } from './payment-gateway-config.service';
import Xendit from 'xendit-node';

export type VAChannel = 'BCA' | 'BNI' | 'BRI' | 'MANDIRI' | 'PERMATA' | 'BSI';
export type EwalletChannel = 'OVO' | 'DANA' | 'SHOPEEPAY' | 'LINKAJA';

const VA_BANK_NAMES: Record<VAChannel, string> = {
  BCA: 'BCA', BNI: 'BNI', BRI: 'BRI', MANDIRI: 'Mandiri',
  PERMATA: 'Permata', BSI: 'BSI',
};

@ApiTags('Custom Payment')
@Controller('payment/custom')
export class CustomPaymentController {
  private readonly logger = new Logger(CustomPaymentController.name);

  constructor(private configService: PaymentGatewayConfigService) {}

  private async getClient(): Promise<Xendit> {
    const config = await this.configService.getXenditConfig();
    if (!config) throw new Error('Payment gateway not configured');
    return new Xendit({ secretKey: config.secretKey });
  }

  /**
   * Buat Virtual Account — PUBLIC endpoint, tidak butuh auth
   * POST /payment/custom/va
   */
  @Post('va')
  @ApiOperation({ summary: 'Create Virtual Account payment (no redirect, no auth required)' })
  async createVA(@Body() body: {
    invoiceNumber: string;
    amount: number;
    customerName: string;
    customerEmail: string;
    channel: VAChannel;
    description?: string;
  }) {
    this.logger.log(`Creating VA ${body.channel} for ${body.invoiceNumber}`);
    const client = await this.getClient();

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam

    const result = await client.PaymentRequest.createPaymentRequest({
      data: {
        currency: 'IDR',
        amount: body.amount,
        referenceId: body.invoiceNumber,
        description: body.description || `Pembayaran ${body.invoiceNumber}`,
        paymentMethod: {
          type: 'VIRTUAL_ACCOUNT',
          reusability: 'ONE_TIME_USE',
          virtualAccount: {
            channelCode: body.channel,
            channelProperties: {
              customerName: body.customerName,
              expiresAt,
            },
          },
        },
      },
    } as any);

    const vaNumber = (result as any).paymentMethod?.virtualAccount?.channelProperties?.virtualAccountNumber;
    const paymentRequestId = (result as any).id;

    return {
      success: true,
      method: 'virtual_account',
      channel: body.channel,
      bankName: VA_BANK_NAMES[body.channel] || body.channel,
      vaNumber,
      amount: body.amount,
      expiresAt: expiresAt.toISOString(),
      paymentRequestId,
      instructions: [
        `Buka aplikasi ${VA_BANK_NAMES[body.channel] || body.channel} mobile banking`,
        'Pilih menu Transfer / Bayar',
        `Masukkan nomor VA: ${vaNumber}`,
        `Masukkan nominal: Rp ${body.amount.toLocaleString('id-ID')}`,
        'Konfirmasi pembayaran',
        'Pembayaran akan dikonfirmasi otomatis dalam beberapa menit',
      ],
    };
  }

  /**
   * Buat QRIS — PUBLIC endpoint, tidak butuh auth
   * POST /payment/custom/qris
   */
  @Post('qris')
  @ApiOperation({ summary: 'Create QRIS payment (no redirect, no auth required)' })
  async createQRIS(@Body() body: {
    invoiceNumber: string;
    amount: number;
    customerName: string;
    description?: string;
  }) {
    this.logger.log(`Creating QRIS for ${body.invoiceNumber}`);
    const client = await this.getClient();

    const result = await client.PaymentRequest.createPaymentRequest({
      data: {
        currency: 'IDR',
        amount: body.amount,
        referenceId: body.invoiceNumber,
        description: body.description || `Pembayaran ${body.invoiceNumber}`,
        paymentMethod: {
          type: 'QR_CODE',
          reusability: 'ONE_TIME_USE',
          qrCode: { channelCode: 'QRIS' },
        },
      },
    } as any);

    const qrString = (result as any).paymentMethod?.qrCode?.channelProperties?.qrString;
    const paymentRequestId = (result as any).id;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 menit

    return {
      success: true,
      method: 'qris',
      qrString,
      qrImageUrl: qrString ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}` : null,
      amount: body.amount,
      expiresAt: expiresAt.toISOString(),
      paymentRequestId,
      instructions: [
        'Buka aplikasi GoPay, OVO, Dana, ShopeePay, atau mobile banking',
        'Pilih menu Scan QR / QRIS',
        'Scan QR code di atas',
        `Konfirmasi pembayaran sebesar Rp ${body.amount.toLocaleString('id-ID')}`,
        'Pembayaran dikonfirmasi otomatis',
      ],
    };
  }

  /**
   * Buat E-Wallet payment — PUBLIC endpoint, tidak butuh auth
   * POST /payment/custom/ewallet
   * Channel: GOPAY | OVO | DANA | SHOPEEPAY | LINKAJA
   */
  @Post('ewallet')
  @ApiOperation({ summary: 'Create E-Wallet payment (no redirect, no auth required)' })
  async createEWallet(@Body() body: {
    invoiceNumber: string;
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    channel: 'GOPAY' | 'OVO' | 'DANA' | 'SHOPEEPAY' | 'LINKAJA';
    successRedirectUrl?: string;
    failureRedirectUrl?: string;
    description?: string;
  }) {
    this.logger.log(`Creating E-Wallet ${body.channel} for ${body.invoiceNumber}`);
    const client = await this.getClient();

    const channelNames: Record<string, string> = {
      GOPAY: 'GoPay', OVO: 'OVO', DANA: 'DANA',
      SHOPEEPAY: 'ShopeePay', LINKAJA: 'LinkAja',
    };

    const successUrl = body.successRedirectUrl || `${process.env.MEMBER_ADMIN_URL || 'http://localhost:4403'}/payment-callback?status=PAID`;
    const failureUrl = body.failureRedirectUrl || `${process.env.MEMBER_ADMIN_URL || 'http://localhost:4403'}/payment-callback?status=FAILED`;

    const result = await client.PaymentRequest.createPaymentRequest({
      data: {
        currency: 'IDR',
        amount: body.amount,
        referenceId: body.invoiceNumber,
        description: body.description || `Pembayaran ${body.invoiceNumber}`,
        paymentMethod: {
          type: 'EWALLET',
          reusability: 'ONE_TIME_USE',
          ewallet: {
            channelCode: body.channel,
            channelProperties: {
              successReturnUrl: successUrl,
              failureReturnUrl: failureUrl,
              cancelReturnUrl: failureUrl,
              mobileNumber: body.customerPhone,
            },
          },
        },
      },
    } as any);

    const paymentRequestId = (result as any).id;
    const actions = (result as any).actions || [];
    // Get redirect URL from actions
    const mobileWebUrl = actions.find((a: any) => a.urlType === 'MOBILE_WEB')?.url
      || actions.find((a: any) => a.urlType === 'WEB')?.url
      || actions.find((a: any) => a.action === 'AUTH')?.url
      || actions[0]?.url;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

    return {
      success: true,
      method: 'ewallet',
      channel: body.channel,
      channelName: channelNames[body.channel] || body.channel,
      redirectUrl: mobileWebUrl,
      amount: body.amount,
      expiresAt: expiresAt.toISOString(),
      paymentRequestId,
      instructions: [
        `Klik tombol "Buka ${channelNames[body.channel] || body.channel}" di bawah`,
        `Anda akan diarahkan ke aplikasi ${channelNames[body.channel] || body.channel}`,
        `Konfirmasi pembayaran sebesar Rp ${body.amount.toLocaleString('id-ID')}`,
        'Kembali ke halaman ini setelah pembayaran selesai',
        'Pembayaran dikonfirmasi otomatis dalam beberapa detik',
      ],
    };
  }

  /**
   * Cek status payment request — PUBLIC endpoint
   * GET /payment/custom/status/:paymentRequestId
   */
  @Get('status/:paymentRequestId')
  @ApiOperation({ summary: 'Check payment request status (no auth required)' })
  async checkStatus(@Param('paymentRequestId') paymentRequestId: string) {
    const client = await this.getClient();
    try {
      const result = await client.PaymentRequest.getPaymentRequestByID({
        paymentRequestId,
      } as any);

      const status = (result as any).status;
      return {
        paymentRequestId,
        status,
        isPaid: status === 'SUCCEEDED',
        isFailed: status === 'FAILED' || status === 'EXPIRED',
        isPending: status === 'PENDING',
      };
    } catch (e) {
      return { paymentRequestId, status: 'UNKNOWN', isPaid: false, isFailed: false, isPending: true };
    }
  }
}

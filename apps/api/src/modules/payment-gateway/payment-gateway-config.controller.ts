import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { PaymentGatewayConfigService } from './payment-gateway-config.service';

class UpdateXenditConfigDto {
  @IsBoolean() @IsOptional() isEnabled?: boolean;
  @IsString() @IsOptional() secretKey?: string;
  @IsString() @IsOptional() webhookToken?: string;
  @IsString() @IsOptional() webhookUrl?: string;
  @IsBoolean() @IsOptional() isProduction?: boolean;
}

@ApiTags('Payment Gateway Config')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/payment-gateway')
export class PaymentGatewayConfigController {
  constructor(private configService: PaymentGatewayConfigService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get Xendit config (safe - no secrets)' })
  async getConfig() {
    return this.configService.getSafeConfig('xendit');
  }

  @Put('config')
  @ApiOperation({ summary: 'Update Xendit config' })
  async updateConfig(@Body() dto: UpdateXenditConfigDto) {
    await this.configService.upsertConfig('xendit', dto);
    return this.configService.getSafeConfig('xendit');
  }

  @Get('status')
  @ApiOperation({ summary: 'Get payment gateway status (public for members)' })
  async getStatus() {
    const config = await this.configService.getSafeConfig('xendit');
    return {
      xendit: {
        enabled: config?.isEnabled && config?.hasSecretKey,
        isProduction: config?.isProduction || false,
      },
    };
  }

  @Put('test')
  @ApiOperation({ summary: 'Test Xendit connection with real API call' })
  async testConnection() {
    try {
      const config = await this.configService.getXenditConfig();
      if (!config) {
        return { success: false, message: 'Xendit belum dikonfigurasi atau dinonaktifkan', code: 'NOT_CONFIGURED' };
      }
      const key = config.secretKey;
      if (!key.startsWith('xnd_development_') && !key.startsWith('xnd_production_')) {
        return {
          success: false,
          message: 'Format API key salah. Gunakan Secret Key (xnd_development_... atau xnd_production_...), bukan Public Key (xnd_public_...).',
          code: 'INVALID_KEY_FORMAT',
        };
      }
      // Real test — try to list invoices (lightweight read operation)
      const Xendit = require('xendit-node').default;
      const client = new Xendit({ secretKey: key });
      await client.Invoice.getInvoices({ limit: 1 });
      return { success: true, message: '✅ Koneksi Xendit berhasil! API key valid dan IP sudah diizinkan.', code: 'OK' };
    } catch (err: any) {
      const msg: string = err?.response?.message || err?.message || '';
      if (msg.includes('UNAUTHORIZED_SENDER_IP') || msg.includes('IP Allowlist')) {
        const ipMatch = msg.match(/IP (\d+\.\d+\.\d+\.\d+)/);
        const serverIp = ipMatch ? ipMatch[1] : 'unknown';
        return {
          success: false,
          message: `IP server (${serverIp}) belum ditambahkan ke Xendit IP Allowlist.`,
          code: 'IP_NOT_ALLOWED',
          serverIp,
          fix: `Buka dashboard.xendit.co → Settings → Developers → IP Allowlist → tambahkan IP: ${serverIp}. Atau nonaktifkan IP restriction untuk development.`,
        };
      }
      if (msg.includes('INVALID_API_KEY') || msg.includes('401')) {
        return { success: false, message: 'API Key tidak valid atau sudah expired.', code: 'INVALID_KEY' };
      }
      return { success: false, message: `Error: ${msg}`, code: 'UNKNOWN' };
    }
  }
}

import { Controller, Get, Put, Body, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';
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
@UseGuards(AuthGuard('jwt'))
@Controller('admin/payment-gateway')
export class PaymentGatewayConfigController {
  constructor(private configService: PaymentGatewayConfigService) {}

  private ensureAdmin(req: any) {
    if (req.user?.type !== 'company_admin') {
      throw new UnauthorizedException('Only platform admins can manage payment gateway config');
    }
  }

  @Get('config')
  @ApiOperation({ summary: 'Get Xendit config (safe - no secrets)' })
  async getConfig(@Request() req: any) {
    this.ensureAdmin(req);
    return this.configService.getSafeConfig('xendit');
  }

  @Put('config')
  @ApiOperation({ summary: 'Update Xendit config' })
  async updateConfig(@Request() req: any, @Body() dto: UpdateXenditConfigDto) {
    this.ensureAdmin(req);
    const saved = await this.configService.upsertConfig('xendit', dto);
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
}

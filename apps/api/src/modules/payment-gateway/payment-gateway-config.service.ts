import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentGatewayConfig } from './payment-gateway-config.entity';

@Injectable()
export class PaymentGatewayConfigService {
  private readonly logger = new Logger(PaymentGatewayConfigService.name);

  constructor(
    @InjectRepository(PaymentGatewayConfig)
    private configRepo: Repository<PaymentGatewayConfig>,
  ) {}

  async getConfig(gateway: string): Promise<PaymentGatewayConfig | null> {
    return this.configRepo.findOne({ where: { gateway } });
  }

  async getAllConfigs(): Promise<PaymentGatewayConfig[]> {
    return this.configRepo.find();
  }

  async upsertConfig(gateway: string, data: {
    isEnabled?: boolean;
    secretKey?: string;
    webhookToken?: string;
    webhookUrl?: string;
    isProduction?: boolean;
    metadata?: Record<string, any>;
  }): Promise<PaymentGatewayConfig> {
    let config = await this.configRepo.findOne({ where: { gateway } });

    if (!config) {
      config = this.configRepo.create({ gateway, ...data });
    } else {
      Object.assign(config, data);
    }

    const saved = await this.configRepo.save(config);
    this.logger.log(`Payment gateway config updated: ${gateway}`);
    return saved;
  }

  async getXenditConfig(): Promise<{ secretKey: string; webhookToken: string; isProduction: boolean } | null> {
    const config = await this.getConfig('xendit');
    if (!config || !config.isEnabled || !config.secretKey) return null;
    return {
      secretKey: config.secretKey,
      webhookToken: config.webhookToken || '',
      isProduction: config.isProduction,
    };
  }

  // Return safe config (no secret keys) for frontend display
  async getSafeConfig(gateway: string): Promise<any> {
    const config = await this.getConfig(gateway);
    if (!config) return null;
    return {
      id: config.id,
      gateway: config.gateway,
      isEnabled: config.isEnabled,
      isProduction: config.isProduction,
      webhookUrl: config.webhookUrl,
      hasSecretKey: !!config.secretKey,
      hasWebhookToken: !!config.webhookToken,
      updatedAt: config.updatedAt,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PaymentGatewayConfig } from './payment-gateway-config.entity';

@Injectable()
export class PaymentGatewayConfigService {
  private readonly logger = new Logger(PaymentGatewayConfigService.name);

  constructor(
    @InjectRepository(PaymentGatewayConfig)
    private configRepo: Repository<PaymentGatewayConfig>,
    private configService: ConfigService,
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

    // Priority 1: DB config (if enabled and has valid secret key)
    if (config && config.isEnabled && config.secretKey) {
      const key = config.secretKey;
      // Validate it's actually a secret key, not a public key
      if (key.startsWith('xnd_development_') || key.startsWith('xnd_production_')) {
        return {
          secretKey: key,
          webhookToken: config.webhookToken || '',
          isProduction: config.isProduction,
        };
      }
      this.logger.warn('Xendit config in DB has invalid key format (public key?), falling back to env');
    }

    // Priority 2: Environment variable fallback
    const envKey = this.configService.get<string>('XENDIT_SECRET_KEY');
    if (envKey && (envKey.startsWith('xnd_development_') || envKey.startsWith('xnd_production_'))) {
      this.logger.log('Using Xendit secret key from environment variable');
      return {
        secretKey: envKey,
        webhookToken: this.configService.get<string>('XENDIT_WEBHOOK_TOKEN') || '',
        isProduction: this.configService.get<string>('XENDIT_IS_PRODUCTION') === 'true',
      };
    }

    return null;
  }

  // Return safe config (no secret keys) for frontend display
  async getSafeConfig(gateway: string): Promise<any> {
    const config = await this.getConfig(gateway);
    const envKey = this.configService.get<string>('XENDIT_SECRET_KEY') || '';
    const hasEnvKey = envKey.startsWith('xnd_development_') || envKey.startsWith('xnd_production_');

    // Check if DB key is valid
    const dbKeyValid = !!(config?.secretKey &&
      (config.secretKey.startsWith('xnd_development_') || config.secretKey.startsWith('xnd_production_')));

    return {
      id: config?.id,
      gateway: config?.gateway || gateway,
      isEnabled: config?.isEnabled || hasEnvKey,
      isProduction: config?.isProduction || this.configService.get<string>('XENDIT_IS_PRODUCTION') === 'true',
      webhookUrl: config?.webhookUrl,
      hasSecretKey: dbKeyValid || hasEnvKey,
      hasWebhookToken: !!(config?.webhookToken) || !!(this.configService.get<string>('XENDIT_WEBHOOK_TOKEN')),
      keySource: dbKeyValid ? 'database' : hasEnvKey ? 'environment' : 'none',
      updatedAt: config?.updatedAt,
    };
  }
}

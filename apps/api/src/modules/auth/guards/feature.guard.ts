import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';

export const FEATURE_KEY = 'required_feature';
export const RequireFeature = (featureCode: string) =>
  SetMetadata(FEATURE_KEY, featureCode);

/**
 * Guard that checks if the company's subscription plan includes a specific feature.
 * Usage: @UseGuards(FeatureGuard) @RequireFeature('fnb_module')
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No feature requirement — allow
    if (!requiredFeature) return true;

    const request = context.switchToHttp().getRequest();
    const companyId = request.user?.companyId || request.user?.company_id;

    if (!companyId) return true; // Let auth guard handle this

    try {
      // Get company's current plan features
      const rows = await this.dataSource.query(
        `SELECT sp.features FROM companies c
         JOIN subscriptions s ON s.company_id = c.id AND s.status = 'active'
         JOIN subscription_plans sp ON sp.id = s.plan_id
         WHERE c.id = ? LIMIT 1`,
        [companyId],
      );

      if (!rows?.length) return true; // No plan found — allow (don't block)

      const features: Record<string, boolean> = rows[0].features || {};

      if (features[requiredFeature] === false) {
        throw new ForbiddenException(
          `Fitur "${requiredFeature}" tidak tersedia di paket subscription Anda. Upgrade plan untuk mengakses fitur ini.`,
        );
      }

      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      return true; // On DB error, allow access
    }
  }
}

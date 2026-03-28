import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from '../subscriptions.service';

export const FEATURE_KEY = 'feature';
export const RequireFeature = (featureCode: string) =>
  SetMetadata(FEATURE_KEY, featureCode);

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true; // No feature requirement
    }

    const request = context.switchToHttp().getRequest();
    const companyId = request.user?.companyId;

    if (!companyId) {
      throw new ForbiddenException('Company ID not found');
    }

    const subscription =
      await this.subscriptionsService.findActiveByCompany(companyId);

    if (!subscription) {
      throw new ForbiddenException('No active subscription');
    }

    const hasFeature =
      subscription.plan.features &&
      subscription.plan.features[requiredFeature] === true;

    if (!hasFeature) {
      throw new ForbiddenException(
        `Feature '${requiredFeature}' is not available in your plan`,
      );
    }

    return true;
  }
}

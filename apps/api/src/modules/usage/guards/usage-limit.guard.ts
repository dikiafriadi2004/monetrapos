import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageService } from '../usage.service';

export const USAGE_METRIC_KEY = 'usageMetric';
export const CheckUsageLimit = (metricName: string) =>
  SetMetadata(USAGE_METRIC_KEY, metricName);

@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usageService: UsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metricName = this.reflector.getAllAndOverride<string>(
      USAGE_METRIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metricName) {
      return true; // No usage limit check required
    }

    const request = context.switchToHttp().getRequest();
    const companyId = request.user?.companyId;

    if (!companyId) {
      throw new ForbiddenException('Company ID not found');
    }

    const canUse = await this.usageService.checkLimit(companyId, metricName as any);

    if (!canUse) {
      throw new ForbiddenException(
        `Usage limit exceeded for ${metricName}. Please upgrade your plan.`,
      );
    }

    return true;
  }
}

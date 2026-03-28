import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const companyId = request.user?.companyId;

    if (!companyId) {
      throw new ForbiddenException('Company ID not found');
    }

    const subscription =
      await this.subscriptionsService.findActiveByCompany(companyId);

    if (!subscription) {
      throw new ForbiddenException('No active subscription found');
    }

    if (subscription.status !== 'active') {
      throw new ForbiddenException(
        `Subscription is ${subscription.status}. Please renew your subscription.`,
      );
    }

    // Attach subscription to request for later use
    request.subscription = subscription;

    return true;
  }
}

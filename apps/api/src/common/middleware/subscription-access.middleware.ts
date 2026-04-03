import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Subscription,
  SubscriptionStatus,
} from '../../modules/subscriptions/subscription.entity';

@Injectable()
export class SubscriptionAccessMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SubscriptionAccessMiddleware.name);

  // Routes that should bypass subscription check
  private readonly whitelistedRoutes = [
    '/api/v1/health',
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/register-company',
    '/api/v1/auth/verify-email',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/v1/billing/webhooks',
    '/api/v1/payment-gateway/webhooks',
    '/api/v1/subscriptions/renew',
    '/api/v1/subscriptions/plans',
    '/api/v1/billing/invoices', // Allow viewing invoices
  ];

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Check if route is whitelisted
    const path = req.path;
    const isWhitelisted = this.whitelistedRoutes.some((route) =>
      path.startsWith(route),
    );

    if (isWhitelisted) {
      return next();
    }

    // Extract company_id from request (set by TenantMiddleware or JWT)
    const companyId = (req as any).companyId || (req as any).user?.companyId;

    // Skip check if no company context (e.g., public routes)
    if (!companyId) {
      return next();
    }

    // Skip subscription check for company_admin (platform admin)
    const userType = (req as any).user?.type;
    if (userType === 'company_admin') {
      return next();
    }

    // Get company's active subscription
    const subscription = await this.subscriptionRepository.findOne({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });

    // If no subscription found, block access
    if (!subscription) {
      this.logger.warn(`No subscription found for company ${companyId}`);
      throw new ForbiddenException({
        statusCode: 403,
        message:
          'No active subscription found. Please subscribe to a plan to access this feature.',
        error: 'SUBSCRIPTION_REQUIRED',
        renewalUrl: '/subscriptions/plans',
      });
    }

    const httpMethod = req.method.toUpperCase();
    const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      httpMethod,
    );
    const isReadOperation = httpMethod === 'GET';

    // Check subscription status and enforce access control
    switch (subscription.status) {
      case SubscriptionStatus.ACTIVE:
      case SubscriptionStatus.TRIAL:
      case SubscriptionStatus.PENDING:
        // Allow all operations
        this.logger.debug(
          `Access granted for company ${companyId} - Status: ${subscription.status}`,
        );
        break;

      case SubscriptionStatus.EXPIRED:
        // Grace period: Allow GET only, block write operations
        if (isWriteOperation) {
          const daysRemaining = this.calculateDaysRemaining(
            subscription.gracePeriodEndDate,
          );

          this.logger.warn(
            `Write operation blocked for company ${companyId} - Grace period (${daysRemaining} days remaining)`,
          );

          throw new ForbiddenException({
            statusCode: 403,
            message: `Your subscription has expired. You are in a ${daysRemaining}-day grace period with read-only access. Please renew to restore full access.`,
            error: 'SUBSCRIPTION_EXPIRED_GRACE_PERIOD',
            status: subscription.status,
            gracePeriodEndDate: subscription.gracePeriodEndDate,
            daysRemaining,
            renewalUrl: '/subscriptions/renew',
          });
        }

        // Log read access during grace period
        this.logger.debug(
          `Read-only access granted for company ${companyId} - Grace period`,
        );
        break;

      case SubscriptionStatus.SUSPENDED:
      case SubscriptionStatus.CANCELLED:
        // Block all operations
        this.logger.warn(
          `Access blocked for company ${companyId} - Status: ${subscription.status}`,
        );

        throw new ForbiddenException({
          statusCode: 403,
          message:
            subscription.status === SubscriptionStatus.SUSPENDED
              ? 'Your account has been suspended due to expired subscription. Please renew to restore access.'
              : 'Your subscription has been cancelled. Please reactivate to restore access.',
          error:
            subscription.status === SubscriptionStatus.SUSPENDED
              ? 'SUBSCRIPTION_SUSPENDED'
              : 'SUBSCRIPTION_CANCELLED',
          status: subscription.status,
          renewalUrl: '/subscriptions/renew',
        });

      case SubscriptionStatus.PAST_DUE:
        // Similar to expired - allow read only
        if (isWriteOperation) {
          this.logger.warn(
            `Write operation blocked for company ${companyId} - Payment past due`,
          );

          throw new ForbiddenException({
            statusCode: 403,
            message:
              'Your subscription payment is past due. Please update your payment to restore full access.',
            error: 'SUBSCRIPTION_PAST_DUE',
            status: subscription.status,
            renewalUrl: '/subscriptions/renew',
          });
        }
        break;

      default:
        // Unknown status - block access for safety
        this.logger.error(
          `Unknown subscription status for company ${companyId}: ${subscription.status}`,
        );

        throw new ForbiddenException({
          statusCode: 403,
          message:
            'Unable to verify subscription status. Please contact support.',
          error: 'SUBSCRIPTION_STATUS_UNKNOWN',
        });
    }

    next();
  }

  /**
   * Calculate days remaining in grace period
   */
  private calculateDaysRemaining(gracePeriodEndDate: Date | null): number {
    if (!gracePeriodEndDate) {
      return 0;
    }

    const now = new Date();
    const endDate = new Date(gracePeriodEndDate);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }
}

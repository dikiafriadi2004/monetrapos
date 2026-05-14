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
import { SubscriptionPlan } from '../../modules/subscriptions/subscription-plan.entity';

/**
 * FEATURE MATRIX PER PLAN
 * ========================
 * Feature Key          | Trial | Starter | Professional | Enterprise
 * ---------------------|-------|---------|--------------|----------
 * pos                  |  ✅   |   ✅    |     ✅       |    ✅
 * inventory            |  ✅   |   ✅    |     ✅       |    ✅
 * basic_reports        |  ✅   |   ✅    |     ✅       |    ✅
 * receipt_printing     |  ✅   |   ✅    |     ✅       |    ✅
 * customer_management  |  ❌   |   ✅    |     ✅       |    ✅
 * customer_loyalty     |  ❌   |   ✅    |     ✅       |    ✅
 * employee_management  |  ❌   |   ✅    |     ✅       |    ✅
 * advanced_reports     |  ❌   |   ❌    |     ✅       |    ✅
 * multi_store          |  ❌   |   ❌    |     ✅       |    ✅
 * kds                  |  ❌   |   ❌    |     ✅       |    ✅
 * online_ordering      |  ❌   |   ❌    |     ✅       |    ✅
 * api_access           |  ❌   |   ❌    |     ✅       |    ✅
 * delivery_management  |  ❌   |   ❌    |     ❌       |    ✅
 * priority_support     |  ❌   |   ❌    |     ❌       |    ✅
 * white_label          |  ❌   |   ❌    |     ❌       |    ✅
 * custom_integrations  |  ❌   |   ❌    |     ❌       |    ✅
 *
 * RESOURCE LIMITS
 * ===============
 * Resource             | Trial | Starter | Professional | Enterprise
 * ---------------------|-------|---------|--------------|----------
 * max_stores           |   1   |    1    |      3       |  Unlimited
 * max_users            |   2   |    5    |     20       |  Unlimited
 * max_employees        |   2   |   10    |     50       |  Unlimited
 * max_products         |  50   |  100    |   1,000      |  Unlimited
 * max_transactions/mo  | 100   | 1,000   |  10,000      |  Unlimited
 * max_customers        |  50   |  500    |   5,000      |  Unlimited
 */

// Route → Feature mapping: which feature is required to access this route
const FEATURE_ROUTE_MAP: Array<{
  pathPattern: RegExp | string;
  methods: string[];
  requiredFeature: string;
  message: string;
}> = [
  // Customer management (write) - path without /api/v1 prefix
  {
    pathPattern: /\/customers/,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    requiredFeature: 'customer_management',
    message: 'Manajemen pelanggan tidak tersedia di paket Anda. Upgrade untuk mengakses fitur ini.',
  },
  // Customer loyalty
  {
    pathPattern: /\/customers\/loyalty/,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE', 'GET'],
    requiredFeature: 'customer_loyalty',
    message: 'Program loyalitas tidak tersedia di paket Anda. Upgrade untuk mengakses fitur ini.',
  },
  // Employee management (write)
  {
    pathPattern: /\/employees/,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    requiredFeature: 'employee_management',
    message: 'Manajemen karyawan tidak tersedia di paket Anda. Upgrade untuk mengakses fitur ini.',
  },
  // Advanced reports (employee performance, customer analytics - NOT monthly finance)
  {
    pathPattern: /\/reports\/advanced\/(employee-performance|customers|profit-loss)/,
    methods: ['GET', 'POST'],
    requiredFeature: 'advanced_reports',
    message: 'Laporan lanjutan tidak tersedia di paket Anda. Upgrade ke Professional atau Enterprise.',
  },
  // Multi-store (create new store)
  {
    pathPattern: /^\/stores$/,
    methods: ['POST'],
    requiredFeature: 'multi_store',
    message: 'Multi-toko tidak tersedia di paket Anda. Upgrade ke Professional atau Enterprise.',
  },
  // KDS (Kitchen Display System)
  {
    pathPattern: /\/kds|\/fnb\/kds/,
    methods: ['GET', 'POST', 'PUT', 'PATCH'],
    requiredFeature: 'kds',
    message: 'Kitchen Display System tidak tersedia di paket Anda. Upgrade ke Professional atau Enterprise.',
  },
  // Online ordering
  {
    pathPattern: /\/online-ordering/,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    requiredFeature: 'online_ordering',
    message: 'Pemesanan online tidak tersedia di paket Anda. Upgrade ke Professional atau Enterprise.',
  },
  // API access (add-ons, integrations)
  {
    pathPattern: /\/add-ons|\/integrations/,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    requiredFeature: 'api_access',
    message: 'Akses API tidak tersedia di paket Anda. Upgrade ke Professional atau Enterprise.',
  },
  // Delivery management
  {
    pathPattern: /\/delivery/,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    requiredFeature: 'delivery_management',
    message: 'Manajemen pengiriman tidak tersedia di paket Anda. Upgrade ke Enterprise.',
  },
];

@Injectable()
export class SubscriptionAccessMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SubscriptionAccessMiddleware.name);

  // Routes that bypass subscription check entirely
  private readonly whitelistedRoutes = [
    '/api/v1/health',
    '/api/v1/auth/',
    '/api/v1/billing/webhooks',
    '/api/v1/payment-gateway/webhook',
    '/api/v1/payment-gateway/check-payment',
    '/api/v1/subscriptions/renew',
    '/api/v1/subscriptions/plans',
    '/api/v1/subscription-plans',
    '/api/v1/billing/invoices',
    '/api/v1/billing/upgrade',
    '/api/v1/landing',
  ];

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Use originalUrl which contains the full path including /api/v1/...
    // Fallback to baseUrl + path for NestJS sub-routing
    const fullPath = req.originalUrl?.split('?')[0]
      || ((req as any).baseUrl ? (req as any).baseUrl + req.path : req.url?.split('?')[0])
      || req.path;

    // Also check the combined baseUrl + path
    const basePath = ((req as any).baseUrl || '') + (req.path || '');

    this.logger.log(`[Middleware] method=${req.method} path=${req.path} baseUrl=${(req as any).baseUrl} originalUrl=${req.originalUrl} fullPath=${fullPath} basePath=${basePath}`);

    // Bypass whitelisted routes
    if (this.whitelistedRoutes.some((route) => fullPath.startsWith(route) || basePath.startsWith(route))) {
      return next();
    }

    // Decode JWT to get companyId (Guards haven't run yet at middleware stage)
    let companyId = (req as any).companyId || (req as any).user?.companyId;
    let userType = (req as any).user?.type;

    if (!companyId) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            companyId = payload.companyId;
            userType = payload.type;
          }
        } catch {
          // Invalid token - let Guards handle it
        }
      }
    }

    if (!companyId) return next();

    // Admin bypass
    if (userType === 'admin') return next();

    // Get subscription with plan
    const subscription = await this.subscriptionRepository.findOne({
      where: { companyId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      this.logger.debug(`No subscription for company ${companyId} - allowing`);
      return next();
    }

    const method = req.method.toUpperCase();
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    switch (subscription.status) {
      case SubscriptionStatus.ACTIVE:
        // Enforce plan feature limits for paid plans
        await this.enforcePlanFeatures(req, subscription, method, fullPath, basePath);
        break;

      case SubscriptionStatus.TRIAL:
        // Check trial expiration first
        if (subscription.trialEnd && new Date() > new Date(subscription.trialEnd)) {
          throw new ForbiddenException({
            statusCode: 403,
            message: 'Masa trial Anda telah berakhir. Silakan upgrade ke paket berbayar untuk melanjutkan.',
            error: 'TRIAL_EXPIRED',
            upgradeUrl: '/upgrade',
          });
        }
        // Enforce trial feature limits
        await this.enforcePlanFeatures(req, subscription, method, fullPath, basePath);
        break;

      case SubscriptionStatus.PENDING:
        // Allow access while pending
        break;

      case SubscriptionStatus.EXPIRED:
        if (isWrite) {
          const days = this.daysRemaining(subscription.gracePeriodEndDate);
          throw new ForbiddenException({
            statusCode: 403,
            message: days > 0
              ? `Subscription berakhir. Masa tenggang ${days} hari (read-only). Perpanjang untuk akses penuh.`
              : 'Subscription Anda telah berakhir. Silakan perpanjang untuk melanjutkan.',
            error: 'SUBSCRIPTION_EXPIRED',
            daysRemaining: days,
            upgradeUrl: '/upgrade',
          });
        }
        break;

      case SubscriptionStatus.SUSPENDED:
        throw new ForbiddenException({
          statusCode: 403,
          message: 'Akun Anda disuspend. Silakan perpanjang subscription.',
          error: 'SUBSCRIPTION_SUSPENDED',
          upgradeUrl: '/upgrade',
        });

      case SubscriptionStatus.CANCELLED:
        throw new ForbiddenException({
          statusCode: 403,
          message: 'Subscription dibatalkan. Silakan aktifkan kembali.',
          error: 'SUBSCRIPTION_CANCELLED',
          upgradeUrl: '/upgrade',
        });

      case SubscriptionStatus.PAST_DUE:
        if (isWrite) {
          throw new ForbiddenException({
            statusCode: 403,
            message: 'Pembayaran jatuh tempo. Perbarui pembayaran untuk akses penuh.',
            error: 'SUBSCRIPTION_PAST_DUE',
            upgradeUrl: '/upgrade',
          });
        }
        break;
    }

    next();
  }

  /**
   * Enforce plan features and resource limits for ALL subscription statuses
   * (trial, active, etc.)
   */
  private async enforcePlanFeatures(
    req: Request,
    subscription: Subscription,
    method: string,
    path: string,
    basePath: string = '',
  ): Promise<void> {
    const plan = subscription.plan;
    if (!plan) return;

    const features = (plan.features as Record<string, boolean>) || {};
    const companyId = (req as any).companyId || (req as any).user?.companyId || this.extractCompanyId(req);
    const isTrial = subscription.status === SubscriptionStatus.TRIAL;
    const daysLeft = isTrial ? this.daysRemaining(subscription.trialEnd) : null;

    // Use the most specific path available
    const checkPath = basePath || path;

    // ── 1. Feature-based access control ──────────────────────────────────────
    for (const rule of FEATURE_ROUTE_MAP) {
      const pathMatches = typeof rule.pathPattern === 'string'
        ? checkPath.includes(rule.pathPattern)
        : rule.pathPattern.test(checkPath);

      if (!pathMatches) continue;
      if (!rule.methods.includes(method)) continue;

      // Feature is disabled for this plan
      if (features[rule.requiredFeature] === false) {
        const planName = plan.name;
        throw new ForbiddenException({
          statusCode: 403,
          message: rule.message,
          error: 'PLAN_FEATURE_BLOCKED',
          feature: rule.requiredFeature,
          currentPlan: planName,
          upgradeUrl: '/upgrade',
          ...(isTrial && { daysRemaining: daysLeft }),
        });
      }
    }

    // ── 2. Resource limit enforcement ─────────────────────────────────────────
    if (method === 'POST') {
      // Products limit
      if (/\/products$/.test(checkPath)) {
        const count = await this.countResource(companyId, 'products');
        if (plan.maxProducts !== 999999 && count >= plan.maxProducts) {
          throw new ForbiddenException({
            statusCode: 403,
            message: `Batas produk paket ${plan.name} (${plan.maxProducts} produk) telah tercapai. Upgrade untuk menambah lebih banyak produk.`,
            error: 'PLAN_LIMIT_REACHED',
            resource: 'products',
            limit: plan.maxProducts,
            current: count,
            upgradeUrl: '/upgrade',
          });
        }
      }

      // Transactions limit (monthly)
      if (/\/transactions$/.test(checkPath)) {
        const count = await this.countMonthlyTransactions(companyId);
        if (plan.maxTransactionsPerMonth !== 999999 && count >= plan.maxTransactionsPerMonth) {
          throw new ForbiddenException({
            statusCode: 403,
            message: `Batas transaksi paket ${plan.name} (${plan.maxTransactionsPerMonth}/bulan) telah tercapai. Upgrade untuk transaksi tidak terbatas.`,
            error: 'PLAN_LIMIT_REACHED',
            resource: 'transactions',
            limit: plan.maxTransactionsPerMonth,
            current: count,
            upgradeUrl: '/upgrade',
          });
        }
      }

      // Employees limit
      if (/\/employees$/.test(checkPath)) {
        const count = await this.countResource(companyId, 'employees');
        if (plan.maxEmployees !== 999 && count >= plan.maxEmployees) {
          throw new ForbiddenException({
            statusCode: 403,
            message: `Batas karyawan paket ${plan.name} (${plan.maxEmployees} karyawan) telah tercapai. Upgrade untuk menambah lebih banyak karyawan.`,
            error: 'PLAN_LIMIT_REACHED',
            resource: 'employees',
            limit: plan.maxEmployees,
            current: count,
            upgradeUrl: '/upgrade',
          });
        }
      }

      // Customers limit
      if (/\/customers$/.test(checkPath)) {
        const count = await this.countResource(companyId, 'customers');
        if (plan.maxCustomers !== 999999 && count >= plan.maxCustomers) {
          throw new ForbiddenException({
            statusCode: 403,
            message: `Batas pelanggan paket ${plan.name} (${plan.maxCustomers} pelanggan) telah tercapai. Upgrade untuk menambah lebih banyak pelanggan.`,
            error: 'PLAN_LIMIT_REACHED',
            resource: 'customers',
            limit: plan.maxCustomers,
            current: count,
            upgradeUrl: '/upgrade',
          });
        }
      }

      // Stores limit (multi-store)
      if (/\/stores$/.test(checkPath)) {
        const count = await this.countResource(companyId, 'stores');
        if (plan.maxStores !== 999 && count >= plan.maxStores) {
          throw new ForbiddenException({
            statusCode: 403,
            message: `Batas toko paket ${plan.name} (${plan.maxStores} toko) telah tercapai. Upgrade ke Professional atau Enterprise untuk multi-toko.`,
            error: 'PLAN_LIMIT_REACHED',
            resource: 'stores',
            limit: plan.maxStores,
            current: count,
            upgradeUrl: '/upgrade',
          });
        }
      }
    }

    // Attach plan info to request for downstream use
    (req as any).planInfo = {
      planName: plan.name,
      planSlug: plan.slug,
      isTrial,
      daysRemaining: daysLeft,
      features,
      limits: {
        maxProducts: plan.maxProducts,
        maxTransactions: plan.maxTransactionsPerMonth,
        maxEmployees: plan.maxEmployees,
        maxUsers: plan.maxUsers,
        maxStores: plan.maxStores,
        maxCustomers: plan.maxCustomers,
      },
    };
  }

  private extractCompanyId(req: Request): string | null {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          return payload.companyId || null;
        }
      }
    } catch { /* ignore */ }
    return null;
  }

  private async countResource(companyId: string, table: string): Promise<number> {
    try {
      const result = await this.subscriptionRepository.manager.query(
        `SELECT COUNT(*) as count FROM ${table} WHERE company_id = ? AND deleted_at IS NULL`,
        [companyId],
      );
      return parseInt(result[0]?.count || '0', 10);
    } catch {
      return 0;
    }
  }

  private async countMonthlyTransactions(companyId: string): Promise<number> {
    try {
      const result = await this.subscriptionRepository.manager.query(
        `SELECT COUNT(*) as count FROM transactions 
         WHERE company_id = ? 
         AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
         AND status != 'voided'`,
        [companyId],
      );
      return parseInt(result[0]?.count || '0', 10);
    } catch {
      return 0;
    }
  }

  private daysRemaining(endDate: Date | null | undefined): number {
    if (!endDate) return 0;
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
}

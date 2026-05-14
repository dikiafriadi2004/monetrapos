import * as Sentry from '@sentry/node';

/**
 * Initialize Sentry for error monitoring and performance tracking.
 * Called FIRST in main.ts before creating the NestJS app.
 *
 * Required env vars:
 * - SENTRY_DSN: Your Sentry project DSN
 * - SENTRY_ENVIRONMENT: development | staging | production
 * - SENTRY_RELEASE: release version (optional)
 * - SENTRY_TRACES_SAMPLE_RATE: 0.0–1.0 (default 0.1)
 */
export function initializeSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log('ℹ️  SENTRY_DSN not set — error monitoring disabled');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || 'development',
      release: process.env.SENTRY_RELEASE || 'unknown',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

      beforeSend(event) {
        // Redact sensitive headers
        if (event.request?.headers) {
          ['authorization', 'cookie', 'x-api-key'].forEach(h => {
            if (event.request!.headers![h]) event.request!.headers![h] = '[REDACTED]';
          });
        }
        return event;
      },

      ignoreErrors: [
        'BadRequestException', 'UnauthorizedException', 'NotFoundException',
        'ForbiddenException', 'ConflictException', 'ValidationError',
        'jwt expired', 'jwt malformed', 'invalid signature',
      ],
    });

    console.log(`✅ Sentry initialized — env: ${process.env.SENTRY_ENVIRONMENT || 'development'}`);
  } catch (error: any) {
    console.error('❌ Failed to initialize Sentry:', error.message);
  }
}

export function captureExceptionWithContext(
  error: Error,
  context: { feature?: string; userId?: string; companyId?: string; [key: string]: any },
) {
  if (!process.env.SENTRY_DSN) return;
  Sentry.captureException(error, {
    tags: { feature: context.feature },
    user: context.userId ? { id: context.userId } : undefined,
    extra: context,
  });
}

export function setUserContext(user: { id: string; email?: string; companyId?: string }) {
  if (!process.env.SENTRY_DSN) return;
  Sentry.setUser({ id: user.id, email: user.email });
  if (user.companyId) Sentry.setTag('company_id', user.companyId);
}

export function clearUserContext() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.setUser(null);
}

export function addBreadcrumb(category: string, message: string, data?: Record<string, any>) {
  if (!process.env.SENTRY_DSN) return;
  Sentry.addBreadcrumb({ category, message, level: 'info', data });
}

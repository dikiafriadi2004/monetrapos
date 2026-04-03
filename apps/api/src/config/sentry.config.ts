// Sentry packages not installed yet - uncomment when ready to use
// import * as Sentry from '@sentry/node';
// import { ProfilingIntegration } from '@sentry/profiling-node';

/**
 * Initialize Sentry for error monitoring and performance tracking
 * 
 * This should be called FIRST in main.ts before creating the NestJS app
 * 
 * Environment Variables Required:
 * - SENTRY_DSN: Your Sentry project DSN (get from sentry.io)
 * - SENTRY_ENVIRONMENT: Environment name (development, staging, production)
 * - SENTRY_RELEASE: Release version (optional, defaults to 'unknown')
 * - SENTRY_TRACES_SAMPLE_RATE: Percentage of requests to trace (0.0 to 1.0)
 * - SENTRY_PROFILES_SAMPLE_RATE: Percentage of requests to profile (0.0 to 1.0)
 * 
 * NOTE: Sentry packages are not installed. To enable:
 * 1. npm install @sentry/node @sentry/profiling-node
 * 2. Uncomment the imports at the top of this file
 * 3. Uncomment the Sentry.init() code below
 */
export function initializeSentry() {
  const dsn = process.env.SENTRY_DSN;

  // Only initialize if DSN is provided
  if (!dsn) {
    console.log('ℹ️  Sentry DSN not provided, skipping error monitoring initialization');
    console.log('   To enable Sentry: Set SENTRY_DSN in your .env file');
    return;
  }

  console.log('ℹ️  Sentry packages not installed. To enable error monitoring:');
  console.log('   1. npm install @sentry/node @sentry/profiling-node');
  console.log('   2. Uncomment Sentry imports in src/config/sentry.config.ts');
  console.log('   3. Restart the application');

  /* Uncomment when Sentry packages are installed
  try {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || 'development',
      release: process.env.SENTRY_RELEASE || 'unknown',

      // Performance Monitoring
      // 0.1 = 10% of requests will be traced
      // Adjust based on your traffic volume
      tracesSampleRate: parseFloat(
        process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
      ),

      // Profiling
      // 0.1 = 10% of requests will be profiled
      // Profiling helps identify performance bottlenecks
      profilesSampleRate: parseFloat(
        process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1',
      ),

      integrations: [
        // Enable profiling for performance monitoring
        new ProfilingIntegration(),
      ],

      // Filter and sanitize data before sending to Sentry
      beforeSend(event: any, hint: any) {
        // Remove sensitive headers
        if (event.request?.headers) {
          const sensitiveHeaders = [
            'authorization',
            'cookie',
            'x-api-key',
            'x-auth-token',
          ];
          sensitiveHeaders.forEach((header) => {
            if (event.request.headers[header]) {
              event.request.headers[header] = '[REDACTED]';
            }
          });
        }

        // Remove sensitive query parameters
        if (event.request?.query_string) {
          const sensitiveParams = [
            'password',
            'token',
            'secret',
            'api_key',
            'apiKey',
            'access_token',
            'refresh_token',
          ];

          let queryString = event.request.query_string;
          sensitiveParams.forEach((param) => {
            const regex = new RegExp(`${param}=[^&]*`, 'gi');
            queryString = queryString.replace(regex, `${param}=[REDACTED]`);
          });
          event.request.query_string = queryString;
        }

        // Remove sensitive data from request body
        if (event.request?.data) {
          const data =
            typeof event.request.data === 'string'
              ? JSON.parse(event.request.data)
              : event.request.data;

          const sensitiveFields = [
            'password',
            'passwordHash',
            'currentPassword',
            'newPassword',
            'confirmPassword',
            'token',
            'refreshToken',
            'accessToken',
            'apiKey',
            'secret',
            'cardNumber',
            'cvv',
            'pin',
          ];

          sensitiveFields.forEach((field) => {
            if (data[field]) {
              data[field] = '[REDACTED]';
            }
          });

          event.request.data = data;
        }

        return event;
      },

      // Ignore certain errors that are expected or not actionable
      ignoreErrors: [
        // Browser errors (shouldn't happen in backend but just in case)
        'Non-Error exception captured',
        'Non-Error promise rejection captured',

        // Network errors that are expected
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        'ECONNRESET',

        // Client errors (4xx) - these are expected user errors
        'BadRequestException',
        'UnauthorizedException',
        'NotFoundException',
        'ForbiddenException',
        'ConflictException',
        'UnprocessableEntityException',

        // Validation errors - these are expected
        'ValidationError',
        'Validation failed',

        // JWT errors - these are expected when tokens expire
        'jwt expired',
        'jwt malformed',
        'invalid signature',
      ],

      // Ignore transactions (URLs) that shouldn't be monitored
      ignoreTransactions: [
        // Health check endpoints
        '/health',
        '/api/v1/health',

        // Metrics endpoints
        '/metrics',

        // Static files
        '/uploads/*',
        '/public/*',
      ],
    });

    console.log('✅ Sentry initialized successfully');
    console.log(`   Environment: ${process.env.SENTRY_ENVIRONMENT || 'development'}`);
    console.log(`   Release: ${process.env.SENTRY_RELEASE || 'unknown'}`);
    console.log(`   Traces Sample Rate: ${process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'}`);
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error.message);
    // Don't throw error - app should still start even if Sentry fails
  }
  */
}

/**
 * Capture an exception with additional context
 * 
 * NOTE: No-op until Sentry packages are installed
 * 
 * @example
 * try {
 *   await processPayment(invoiceId);
 * } catch (error) {
 *   captureExceptionWithContext(error, {
 *     feature: 'payment',
 *     invoiceId,
 *     companyId: user.companyId,
 *   });
 *   throw error;
 * }
 */
export function captureExceptionWithContext(
  error: Error,
  context: {
    feature?: string;
    action?: string;
    userId?: string;
    companyId?: string;
    [key: string]: any;
  },
) {
  // No-op until Sentry is installed
  console.error('Error captured (Sentry not installed):', error.message, context);
  
  /* Uncomment when Sentry packages are installed
  Sentry.captureException(error, {
    tags: {
      feature: context.feature,
      action: context.action,
    },
    user: context.userId
      ? {
          id: context.userId,
        }
      : undefined,
    extra: {
      ...context,
    },
  });
  */
}

/**
 * Set user context for all subsequent errors
 * Call this after user authentication
 * 
 * NOTE: No-op until Sentry packages are installed
 * 
 * @example
 * setUserContext({
 *   id: user.id,
 *   email: user.email,
 *   companyId: user.companyId,
 * });
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
  companyId?: string;
}) {
  // No-op until Sentry is installed
  
  /* Uncomment when Sentry packages are installed
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  if (user.companyId) {
    Sentry.setTag('company_id', user.companyId);
  }
  */
}

/**
 * Clear user context (call on logout)
 * 
 * NOTE: No-op until Sentry packages are installed
 */
export function clearUserContext() {
  // No-op until Sentry is installed
  
  /* Uncomment when Sentry packages are installed
  Sentry.setUser(null);
  */
}

/**
 * Add a breadcrumb for debugging
 * Breadcrumbs show the trail of events leading up to an error
 * 
 * NOTE: No-op until Sentry packages are installed
 * 
 * @example
 * addBreadcrumb('subscription', 'Checking subscription status', {
 *   subscriptionId: subscription.id,
 *   status: subscription.status,
 * });
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>,
) {
  // No-op until Sentry is installed
  
  /* Uncomment when Sentry packages are installed
  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
  });
  */
}

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  // Sensitive fields that should never be logged
  private readonly sensitiveFields = [
    'password',
    'password_hash',
    'passwordHash',
    'newPassword',
    'oldPassword',
    'confirmPassword',
    'token',
    'accessToken',
    'refreshToken',
    'access_token',
    'refresh_token',
    'authorization',
    'Authorization',
    'jwt',
    'secret',
    'apiKey',
    'api_key',
    'cardNumber',
    'card_number',
    'cvv',
    'cvc',
    'pin',
    'ssn',
    'creditCard',
    'credit_card',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, headers, user } = request;
    const now = Date.now();

    // Extract useful request metadata
    const userId = user?.id || 'anonymous';
    const companyId = user?.companyId || 'N/A';
    const userAgent = headers['user-agent'] || 'unknown';
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';

    // Sanitize request body
    const sanitizedBody = this.sanitizeData(body || {});

    // Log request with metadata
    this.logger.log(
      `→ [${method}] ${url} | User: ${userId} | Company: ${companyId} | IP: ${ip}`,
    );

    if (sanitizedBody && Object.keys(sanitizedBody).length > 0) {
      this.logger.debug(`  Body: ${JSON.stringify(sanitizedBody)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - now;
          const sanitizedResponse = this.sanitizeData(data);
          const responsePreview =
            JSON.stringify(sanitizedResponse).substring(0, 200) +
            (JSON.stringify(sanitizedResponse).length > 200 ? '...' : '');

          this.logger.log(
            `← [${method}] ${url} | ${responseTime}ms | User: ${userId}`,
          );
          this.logger.debug(`  Response: ${responsePreview}`);
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `✗ [${method}] ${url} | ${responseTime}ms | User: ${userId} | Error: ${error.message}`,
          );

          // Log stack trace for debugging (only in development)
          if (process.env.NODE_ENV === 'development' && error.stack) {
            this.logger.debug(`  Stack: ${error.stack}`);
          }
        },
      }),
    );
  }

  /**
   * Recursively sanitize data by removing sensitive fields
   */
  private sanitizeData(data: any): any {
    if (!data) return data;

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    // Handle objects
    if (typeof data === 'object') {
      const sanitized: any = {};

      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          // Check if field is sensitive
          if (this.isSensitiveField(key)) {
            sanitized[key] = '***REDACTED***';
          } else {
            // Recursively sanitize nested objects
            sanitized[key] = this.sanitizeData(data[key]);
          }
        }
      }

      return sanitized;
    }

    // Return primitive values as-is
    return data;
  }

  /**
   * Check if a field name is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return this.sensitiveFields.some((sensitive) =>
      lowerFieldName.includes(sensitive.toLowerCase()),
    );
  }
}

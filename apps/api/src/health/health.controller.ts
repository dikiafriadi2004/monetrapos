import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
// import * as Sentry from '@sentry/node'; // Uncomment when Sentry packages are installed

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check API health status' })
  async check() {
    const dbHealthy = this.dataSource.isInitialized;
    const memoryUsage = process.memoryUsage();

    return {
      status: dbHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbHealthy ? 'up' : 'down',
        type: 'mysql',
      },
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      },
    };
  }

  @Get('simple')
  @ApiOperation({ summary: 'Simple health check' })
  simple() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('sentry-test')
  @ApiOperation({ summary: 'Test Sentry error tracking (Development only)' })
  testSentry() {
    if (process.env.NODE_ENV === 'production') {
      return {
        message: 'Sentry test endpoint is disabled in production',
      };
    }

    return {
      message: 'Sentry packages not installed',
      note: 'Install @sentry/node and @sentry/profiling-node to enable error monitoring',
    };

    /* Uncomment when Sentry packages are installed
    try {
      throw new Error('Test error for Sentry monitoring');
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          test: 'true',
          endpoint: 'health/sentry-test',
        },
        extra: {
          message: 'This is a test error to verify Sentry integration',
          timestamp: new Date().toISOString(),
        },
      });
    }

    return {
      message: 'Test error sent to Sentry',
      note: 'Check your Sentry dashboard at https://sentry.io',
    };
    */
  }

  @Get('sentry-message')
  @ApiOperation({ summary: 'Test Sentry message tracking (Development only)' })
  testSentryMessage() {
    if (process.env.NODE_ENV === 'production') {
      return {
        message: 'Sentry test endpoint is disabled in production',
      };
    }

    return {
      message: 'Sentry packages not installed',
      note: 'Install @sentry/node and @sentry/profiling-node to enable error monitoring',
    };

    /* Uncomment when Sentry packages are installed
    Sentry.captureMessage('Test message from MonetraPOS API', {
      level: 'info',
      tags: {
        test: 'true',
        endpoint: 'health/sentry-message',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

    return {
      message: 'Test message sent to Sentry',
      note: 'Check your Sentry dashboard at https://sentry.io',
    };
    */
  }
}


import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getWelcome() {
    return {
      name: 'MonetraPOS API',
      version: '1.0.0',
      status: 'running',
      message: 'Welcome to MonetraPOS API',
      documentation: '/api/docs',
      endpoints: {
        health: '/api/v1/health',
        healthSimple: '/api/v1/health/simple',
        swagger: '/api/docs',
      },
      timestamp: new Date().toISOString(),
    };
  }
}


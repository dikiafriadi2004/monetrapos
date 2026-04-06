import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import { LandingService } from './modules/landing/landing.service';
import { FeaturesService } from './modules/features/features.service';
import { AddOnsSeeder } from './common/seeders/add-ons.seeder';
import { PaymentsService } from './modules/payments/payments.service';
import { PaymentMethodsService } from './modules/payment-methods/payment-methods.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Set timezone to WIB (UTC+7) for all date operations
  process.env.TZ = 'Asia/Jakarta';

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files (for invoice PDFs)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Security headers
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
      },
    },
  }));

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'http://localhost:4402',
        'http://localhost:4403',
        'http://localhost:4404',
        'http://10.1.2.254:4402',
        'http://10.1.2.254:4403',
        'http://10.1.2.254:4404',
      ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Logging Interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields, just strip them
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('MonetraPOS API')
    .setDescription('Multi-Business POS Application API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Companies', 'Company management')
    .addTag('Members', 'Member management')
    .addTag('Stores', 'Store management')
    .addTag('Products', 'Product management')
    .addTag('Transactions', 'Transaction management')
    .addTag('Payments', 'Payment management')
    .addTag('Inventory', 'Inventory management')
    .addTag('Customers', 'Customer management')
    .addTag('Employees', 'Employee management')
    .addTag('Shifts', 'Shift management')
    .addTag('Receipts', 'Receipt management')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4404;
  await app.listen(port, '0.0.0.0');

  // Auto-seed landing page default content
  try {
    const landingService = app.get(LandingService);
    await landingService.seedDefaults();
    logger.log('✅ Landing page content seeded');
  } catch (e) {
    logger.warn('⚠️  Landing page seed skipped:', e.message);
  }

  // Auto-seed platform features
  try {
    const featuresService = app.get(FeaturesService);
    await featuresService.seedDefaults();
    logger.log('✅ Platform features seeded');
  } catch (e) {
    logger.warn('⚠️  Features seed skipped:', e.message);
  }

  // Auto-setup QRIS dinamis dari gambar yang sudah ada
  try {
    const paymentsService = app.get(PaymentsService);
    const pmService = app.get(PaymentMethodsService);
    const allQrisMethods = await pmService.findAllQrisWithImage();
    for (const pm of allQrisMethods) {
      const existing = await paymentsService.findActiveQrisConfigByCompany(pm.companyId);
      if (existing?.parsedData) continue; // sudah ada, skip
      if (!pm.iconUrl) continue;
      try {
        const filePath = join(process.cwd(), pm.iconUrl);
        const { Jimp } = require('jimp');
        const jsQR = require('jsqr');
        const fs = require('fs');
        if (!fs.existsSync(filePath)) continue;
        const image = await Jimp.read(filePath);
        const { data, width, height } = image.bitmap;
        const code = jsQR(data, width, height);
        if (code?.data?.startsWith('000201')) {
          await paymentsService.upsertQrisConfigByCompany(pm.companyId, {
            parsedData: code.data,
            originalImage: code.data,
          });
          logger.log(`✅ QRIS auto-decoded for company ${pm.companyId}`);
        }
      } catch { /* skip */ }
    }
  } catch (e) {
    logger.warn('⚠️  QRIS auto-setup skipped:', e.message);
  }

  // Auto-seed add-ons
  try {
    const addOnsSeeder = app.get(AddOnsSeeder);
    await addOnsSeeder.seed();
    logger.log('✅ Add-ons seeded');
  } catch (e) {
    logger.warn('⚠️  Add-ons seed skipped:', e.message);
  }

  logger.log(`🚀 MonetraPOS API running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🔒 CORS enabled for: ${allowedOrigins.join(', ')}`);
}

bootstrap();


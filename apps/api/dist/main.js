"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api/v1');
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:4402', 'http://localhost:4403', 'http://localhost:4404'];
    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.useGlobalFilters(new http_exception_filter_1.AllExceptionsFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('MonetRAPOS API')
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
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT || 3003;
    await app.listen(port);
    logger.log(`🚀 MonetRAPOS API running on http://localhost:${port}`);
    logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`🔒 CORS enabled for: ${allowedOrigins.join(', ')}`);
}
bootstrap();
//# sourceMappingURL=main.js.map
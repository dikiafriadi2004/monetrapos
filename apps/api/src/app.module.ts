import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { validate } from './config/env.validation';
import { QueueModule } from './common/queue/queue.module';
import { CacheModule } from './common/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { FeaturesModule } from './modules/features/features.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { BillingModule } from './modules/billing/billing.module';
import { UsageModule } from './modules/usage/usage.module';
import { PaymentGatewayModule } from './modules/payment-gateway/payment-gateway.module';
import { StoresModule } from './modules/stores/stores.module';
import { RolesModule } from './modules/roles/roles.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ProductsModule } from './modules/products/products.module';
import { TaxesModule } from './modules/taxes/taxes.module';
import { DiscountsModule } from './modules/discounts/discounts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { AuditModule } from './modules/audit/audit.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PaymentMethodsModule } from './modules/payment-methods/payment-methods.module';
import { AddOnsModule } from './modules/add-ons/add-ons.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { FnbModule } from './modules/fnb/fnb.module';
import { LaundryModule } from './modules/laundry/laundry.module';
import { HealthModule } from './health/health.module';
import { PermissionSeeder } from './common/seeders/permission.seeder';
import { AdminSeeder } from './common/seeders/admin.seeder';
import {
  TenantMiddleware,
  SubscriptionAccessMiddleware,
} from './common/middleware';

// Entities
import { Company } from './modules/companies/company.entity';
import { User } from './modules/users/user.entity';
import { Store } from './modules/stores/store.entity';
import { Role } from './modules/roles/role.entity';
import { Permission } from './modules/roles/permission.entity';
import { Employee } from './modules/employees/employee.entity';
import { Product } from './modules/products/product.entity';
import { Category } from './modules/products/category.entity';
import { ProductVariant } from './modules/products/product-variant.entity';
import { Tax } from './modules/taxes/tax.entity';
import { Discount } from './modules/discounts/discount.entity';
import { PaymentMethod } from './modules/payments/payment-method.entity';
import { QrisConfig } from './modules/payments/qris-config.entity';
import { PaymentMethod as CompanyPaymentMethod } from './modules/payment-methods/payment-method.entity';
import { Transaction } from './modules/transactions/transaction.entity';
import { TransactionItem } from './modules/transactions/transaction-item.entity';
import { Feature } from './modules/features/feature.entity';
import { SubscriptionPlan } from './modules/subscriptions/subscription-plan.entity';
import { SubscriptionDuration } from './modules/subscriptions/subscription-duration.entity';
import { Subscription } from './modules/subscriptions/subscription.entity';
import { Invoice } from './modules/billing/invoice.entity';
import { PaymentTransaction } from './modules/billing/payment-transaction.entity';
import { UsageTracking } from './modules/usage/usage-tracking.entity';
import { EmailVerificationToken } from './modules/auth/email-verification-token.entity';
import { PasswordResetToken } from './modules/auth/password-reset-token.entity';
import { Notification } from './modules/notifications/notification.entity';
import { AuditLog } from './modules/audit/audit-log.entity';
import { Customer } from './modules/customers/customer.entity';
import { Shift } from './modules/shifts/shift.entity';
import { StockMovement } from './modules/inventory/stock-movement.entity';
import { StockOpname, StockOpnameItem } from './modules/inventory/stock-opname.entity';
import { AddOn } from './modules/add-ons/add-on.entity';
import { CompanyAddOn } from './modules/add-ons/company-add-on.entity';
import { Supplier } from './modules/suppliers/supplier.entity';
import { PurchaseOrder, PurchaseOrderItem } from './modules/purchase-orders/purchase-order.entity';
import { Table } from './modules/fnb/table.entity';
import { FnbOrder } from './modules/fnb/fnb-order.entity';
import { LaundryServiceType } from './modules/laundry/laundry-service-type.entity';
import { LaundryOrder } from './modules/laundry/laundry-order.entity';
import { LaundryItem } from './modules/laundry/laundry-item.entity';
import { DiscountUsage } from './modules/discounts/discount-usage.entity';
import { PaymentGatewayConfig } from './modules/payment-gateway/payment-gateway-config.entity';
import { SubscriptionHistory } from './modules/subscriptions/subscription-history.entity';

const entities = [
  Company,
  User,
  Store,
  Role,
  Permission,
  Employee,
  Product,
  Category,
  ProductVariant,
  Tax,
  Discount,
  PaymentMethod,
  CompanyPaymentMethod,
  QrisConfig,
  Transaction,
  TransactionItem,
  Feature,
  SubscriptionPlan,
  SubscriptionDuration,
  Subscription,
  Invoice,
  PaymentTransaction,
  UsageTracking,
  EmailVerificationToken,
  PasswordResetToken,
  Notification,
  AuditLog,
  Customer,
  Shift,
  StockMovement,
  StockOpname,
  StockOpnameItem,
  AddOn,
  CompanyAddOn,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  Table,
  FnbOrder,
  LaundryServiceType,
  LaundryOrder,
  LaundryItem,
  DiscountUsage,
  PaymentGatewayConfig,
  SubscriptionHistory,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate,
    }),
    ScheduleModule.forRoot(),
    QueueModule,
    CacheModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities,
        synchronize: true, // Auto-create tables in development
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([Permission, Company, User, Subscription]),
    AuthModule,
    CompaniesModule,
    UsersModule,
    FeaturesModule,
    SubscriptionsModule,
    BillingModule,
    UsageModule,
    PaymentGatewayModule,
    StoresModule,
    RolesModule,
    EmployeesModule,
    ProductsModule,
    TaxesModule,
    DiscountsModule,
    PaymentsModule,
    TransactionsModule,
    AuditModule,
    CustomersModule,
    ShiftsModule,
    InventoryModule,
    ReceiptsModule,
    NotificationsModule,
    ReportsModule,
    PaymentMethodsModule,
    AddOnsModule,
    SuppliersModule,
    PurchaseOrdersModule,
    FnbModule,
    LaundryModule,
    HealthModule,
  ],
  providers: [
    // PermissionSeeder, AdminSeeder, // Disabled - run manually with npm run seed
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply TenantMiddleware to all routes except public ones
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/verify-email', method: RequestMethod.POST },
        { path: 'auth/forgot-password', method: RequestMethod.POST },
        { path: 'auth/reset-password', method: RequestMethod.POST },
        { path: 'payment-gateway/webhook/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');

    // Apply SubscriptionAccessMiddleware after TenantMiddleware
    consumer
      .apply(SubscriptionAccessMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'auth/(.*)', method: RequestMethod.ALL },
        { path: 'payment-gateway/webhook/(.*)', method: RequestMethod.ALL },
        { path: 'subscriptions/(.*)', method: RequestMethod.ALL }, // Allow subscription management
        { path: 'billing/(.*)', method: RequestMethod.ALL }, // Allow billing/payment
      )
      .forRoutes('*');
  }
}

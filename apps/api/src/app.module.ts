import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validate } from './config/env.validation';
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
import { HealthModule } from './health/health.module';
import { PermissionSeeder } from './common/seeders/permission.seeder';
import { AdminSeeder } from './common/seeders/admin.seeder';

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
import { Transaction } from './modules/transactions/transaction.entity';
import { TransactionItem } from './modules/transactions/transaction-item.entity';
import { Feature } from './modules/features/feature.entity';
import { SubscriptionPlan } from './modules/subscriptions/subscription-plan.entity';
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
  QrisConfig,
  Transaction,
  TransactionItem,
  Feature,
  SubscriptionPlan,
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
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_DATABASE', 'monetrapos'),
        entities,
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([Permission, Company, User]),
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
    HealthModule,
  ],
  providers: [PermissionSeeder, AdminSeeder],
})
export class AppModule {}


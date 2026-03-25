import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { MembersModule } from './modules/members/members.module';
import { FeaturesModule } from './modules/features/features.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PermissionSeeder } from './common/seeders/permission.seeder';

// Entities
import { Company } from './modules/companies/company.entity';
import { Member } from './modules/members/member.entity';
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
import { AuditLog } from './modules/audit/audit-log.entity';

const entities = [
  Company,
  Member,
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
  AuditLog,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    TypeOrmModule.forFeature([Permission]),
    AuthModule,
    CompaniesModule,
    MembersModule,
    FeaturesModule,
    SubscriptionsModule,
  ],
  providers: [PermissionSeeder],
})
export class AppModule {}

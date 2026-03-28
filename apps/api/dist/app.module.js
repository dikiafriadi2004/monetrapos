"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const env_validation_1 = require("./config/env.validation");
const auth_module_1 = require("./modules/auth/auth.module");
const companies_module_1 = require("./modules/companies/companies.module");
const users_module_1 = require("./modules/users/users.module");
const features_module_1 = require("./modules/features/features.module");
const subscriptions_module_1 = require("./modules/subscriptions/subscriptions.module");
const billing_module_1 = require("./modules/billing/billing.module");
const usage_module_1 = require("./modules/usage/usage.module");
const payment_gateway_module_1 = require("./modules/payment-gateway/payment-gateway.module");
const stores_module_1 = require("./modules/stores/stores.module");
const roles_module_1 = require("./modules/roles/roles.module");
const employees_module_1 = require("./modules/employees/employees.module");
const products_module_1 = require("./modules/products/products.module");
const taxes_module_1 = require("./modules/taxes/taxes.module");
const discounts_module_1 = require("./modules/discounts/discounts.module");
const payments_module_1 = require("./modules/payments/payments.module");
const transactions_module_1 = require("./modules/transactions/transactions.module");
const audit_module_1 = require("./modules/audit/audit.module");
const customers_module_1 = require("./modules/customers/customers.module");
const shifts_module_1 = require("./modules/shifts/shifts.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const receipts_module_1 = require("./modules/receipts/receipts.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const health_module_1 = require("./health/health.module");
const permission_seeder_1 = require("./common/seeders/permission.seeder");
const admin_seeder_1 = require("./common/seeders/admin.seeder");
const company_entity_1 = require("./modules/companies/company.entity");
const user_entity_1 = require("./modules/users/user.entity");
const store_entity_1 = require("./modules/stores/store.entity");
const role_entity_1 = require("./modules/roles/role.entity");
const permission_entity_1 = require("./modules/roles/permission.entity");
const employee_entity_1 = require("./modules/employees/employee.entity");
const product_entity_1 = require("./modules/products/product.entity");
const category_entity_1 = require("./modules/products/category.entity");
const product_variant_entity_1 = require("./modules/products/product-variant.entity");
const tax_entity_1 = require("./modules/taxes/tax.entity");
const discount_entity_1 = require("./modules/discounts/discount.entity");
const payment_method_entity_1 = require("./modules/payments/payment-method.entity");
const qris_config_entity_1 = require("./modules/payments/qris-config.entity");
const transaction_entity_1 = require("./modules/transactions/transaction.entity");
const transaction_item_entity_1 = require("./modules/transactions/transaction-item.entity");
const feature_entity_1 = require("./modules/features/feature.entity");
const subscription_plan_entity_1 = require("./modules/subscriptions/subscription-plan.entity");
const subscription_entity_1 = require("./modules/subscriptions/subscription.entity");
const invoice_entity_1 = require("./modules/billing/invoice.entity");
const payment_transaction_entity_1 = require("./modules/billing/payment-transaction.entity");
const usage_tracking_entity_1 = require("./modules/usage/usage-tracking.entity");
const email_verification_token_entity_1 = require("./modules/auth/email-verification-token.entity");
const password_reset_token_entity_1 = require("./modules/auth/password-reset-token.entity");
const notification_entity_1 = require("./modules/notifications/notification.entity");
const audit_log_entity_1 = require("./modules/audit/audit-log.entity");
const customer_entity_1 = require("./modules/customers/customer.entity");
const shift_entity_1 = require("./modules/shifts/shift.entity");
const stock_movement_entity_1 = require("./modules/inventory/stock-movement.entity");
const entities = [
    company_entity_1.Company,
    user_entity_1.User,
    store_entity_1.Store,
    role_entity_1.Role,
    permission_entity_1.Permission,
    employee_entity_1.Employee,
    product_entity_1.Product,
    category_entity_1.Category,
    product_variant_entity_1.ProductVariant,
    tax_entity_1.Tax,
    discount_entity_1.Discount,
    payment_method_entity_1.PaymentMethod,
    qris_config_entity_1.QrisConfig,
    transaction_entity_1.Transaction,
    transaction_item_entity_1.TransactionItem,
    feature_entity_1.Feature,
    subscription_plan_entity_1.SubscriptionPlan,
    subscription_entity_1.Subscription,
    invoice_entity_1.Invoice,
    payment_transaction_entity_1.PaymentTransaction,
    usage_tracking_entity_1.UsageTracking,
    email_verification_token_entity_1.EmailVerificationToken,
    password_reset_token_entity_1.PasswordResetToken,
    notification_entity_1.Notification,
    audit_log_entity_1.AuditLog,
    customer_entity_1.Customer,
    shift_entity_1.Shift,
    stock_movement_entity_1.StockMovement,
];
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                cache: true,
                validate: env_validation_1.validate,
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'mysql',
                    host: configService.get('DB_HOST', 'localhost'),
                    port: configService.get('DB_PORT', 3306),
                    username: configService.get('DB_USERNAME', 'root'),
                    password: configService.get('DB_PASSWORD', ''),
                    database: configService.get('DB_DATABASE', 'monetrapos'),
                    entities,
                    synchronize: configService.get('NODE_ENV') === 'development',
                    logging: configService.get('NODE_ENV') === 'development',
                }),
            }),
            typeorm_1.TypeOrmModule.forFeature([permission_entity_1.Permission, company_entity_1.Company, user_entity_1.User]),
            auth_module_1.AuthModule,
            companies_module_1.CompaniesModule,
            users_module_1.UsersModule,
            features_module_1.FeaturesModule,
            subscriptions_module_1.SubscriptionsModule,
            billing_module_1.BillingModule,
            usage_module_1.UsageModule,
            payment_gateway_module_1.PaymentGatewayModule,
            stores_module_1.StoresModule,
            roles_module_1.RolesModule,
            employees_module_1.EmployeesModule,
            products_module_1.ProductsModule,
            taxes_module_1.TaxesModule,
            discounts_module_1.DiscountsModule,
            payments_module_1.PaymentsModule,
            transactions_module_1.TransactionsModule,
            audit_module_1.AuditModule,
            customers_module_1.CustomersModule,
            shifts_module_1.ShiftsModule,
            inventory_module_1.InventoryModule,
            receipts_module_1.ReceiptsModule,
            notifications_module_1.NotificationsModule,
            health_module_1.HealthModule,
        ],
        providers: [permission_seeder_1.PermissionSeeder, admin_seeder_1.AdminSeeder],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
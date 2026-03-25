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
const auth_module_1 = require("./modules/auth/auth.module");
const companies_module_1 = require("./modules/companies/companies.module");
const members_module_1 = require("./modules/members/members.module");
const features_module_1 = require("./modules/features/features.module");
const subscriptions_module_1 = require("./modules/subscriptions/subscriptions.module");
const permission_seeder_1 = require("./common/seeders/permission.seeder");
const company_entity_1 = require("./modules/companies/company.entity");
const member_entity_1 = require("./modules/members/member.entity");
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
const audit_log_entity_1 = require("./modules/audit/audit-log.entity");
const entities = [
    company_entity_1.Company,
    member_entity_1.Member,
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
    audit_log_entity_1.AuditLog,
];
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
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
            typeorm_1.TypeOrmModule.forFeature([permission_entity_1.Permission]),
            auth_module_1.AuthModule,
            companies_module_1.CompaniesModule,
            members_module_1.MembersModule,
            features_module_1.FeaturesModule,
            subscriptions_module_1.SubscriptionsModule,
        ],
        providers: [permission_seeder_1.PermissionSeeder],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
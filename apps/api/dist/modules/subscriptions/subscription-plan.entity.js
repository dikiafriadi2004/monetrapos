"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionPlan = void 0;
const typeorm_1 = require("typeorm");
const entities_1 = require("../../common/entities");
const subscription_entity_1 = require("./subscription.entity");
let SubscriptionPlan = class SubscriptionPlan extends entities_1.BaseEntity {
    name;
    slug;
    description;
    priceMonthly;
    priceYearly;
    setupFee;
    trialDays;
    features;
    maxStores;
    maxUsers;
    maxEmployees;
    maxProducts;
    maxTransactionsPerMonth;
    maxCustomers;
    maxStorageMb;
    isActive;
    isPopular;
    sortOrder;
    subscriptions;
    deletedAt;
};
exports.SubscriptionPlan = SubscriptionPlan;
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 50 }),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SubscriptionPlan.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'price_monthly' }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "priceMonthly", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'price_yearly' }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "priceYearly", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'setup_fee' }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "setupFee", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 14, name: 'trial_days' }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "trialDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', default: '{}' }),
    __metadata("design:type", Object)
], SubscriptionPlan.prototype, "features", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 1, name: 'max_stores' }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxStores", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 5, name: 'max_users' }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxUsers", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 10, name: 'max_employees' }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxEmployees", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 100, name: 'max_products' }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxProducts", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 1000, name: 'max_transactions_per_month' }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxTransactionsPerMonth", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 500, name: 'max_customers' }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxCustomers", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 1000, name: 'max_storage_mb' }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "maxStorageMb", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'is_active' }),
    __metadata("design:type", Boolean)
], SubscriptionPlan.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'is_popular' }),
    __metadata("design:type", Boolean)
], SubscriptionPlan.prototype, "isPopular", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0, name: 'sort_order' }),
    __metadata("design:type", Number)
], SubscriptionPlan.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => subscription_entity_1.Subscription, (subscription) => subscription.plan),
    __metadata("design:type", Array)
], SubscriptionPlan.prototype, "subscriptions", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at' }),
    __metadata("design:type", Date)
], SubscriptionPlan.prototype, "deletedAt", void 0);
exports.SubscriptionPlan = SubscriptionPlan = __decorate([
    (0, typeorm_1.Entity)('subscription_plans')
], SubscriptionPlan);
//# sourceMappingURL=subscription-plan.entity.js.map
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
exports.Subscription = exports.BillingCycle = exports.SubscriptionStatus = void 0;
const typeorm_1 = require("typeorm");
const entities_1 = require("../../common/entities");
const company_entity_1 = require("../companies/company.entity");
const subscription_plan_entity_1 = require("./subscription-plan.entity");
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["TRIAL"] = "trial";
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["PAST_DUE"] = "past_due";
    SubscriptionStatus["CANCELLED"] = "cancelled";
    SubscriptionStatus["EXPIRED"] = "expired";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var BillingCycle;
(function (BillingCycle) {
    BillingCycle["MONTHLY"] = "monthly";
    BillingCycle["YEARLY"] = "yearly";
})(BillingCycle || (exports.BillingCycle = BillingCycle = {}));
let Subscription = class Subscription extends entities_1.BaseEntity {
    companyId;
    company;
    planId;
    plan;
    status;
    billingCycle;
    currentPeriodStart;
    currentPeriodEnd;
    trialStart;
    trialEnd;
    cancelAtPeriodEnd;
    cancelledAt;
    cancellationReason;
    price;
    currency;
    metadata;
};
exports.Subscription = Subscription;
__decorate([
    (0, typeorm_1.Column)({ name: 'company_id' }),
    __metadata("design:type", String)
], Subscription.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company),
    (0, typeorm_1.JoinColumn)({ name: 'company_id' }),
    __metadata("design:type", company_entity_1.Company)
], Subscription.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'plan_id' }),
    __metadata("design:type", String)
], Subscription.prototype, "planId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => subscription_plan_entity_1.SubscriptionPlan, (plan) => plan.subscriptions),
    (0, typeorm_1.JoinColumn)({ name: 'plan_id' }),
    __metadata("design:type", subscription_plan_entity_1.SubscriptionPlan)
], Subscription.prototype, "plan", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SubscriptionStatus }),
    __metadata("design:type", String)
], Subscription.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: BillingCycle, name: 'billing_cycle' }),
    __metadata("design:type", String)
], Subscription.prototype, "billingCycle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'current_period_start' }),
    __metadata("design:type", Date)
], Subscription.prototype, "currentPeriodStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'current_period_end' }),
    __metadata("design:type", Date)
], Subscription.prototype, "currentPeriodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'trial_start' }),
    __metadata("design:type", Date)
], Subscription.prototype, "trialStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'trial_end' }),
    __metadata("design:type", Date)
], Subscription.prototype, "trialEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'cancel_at_period_end' }),
    __metadata("design:type", Boolean)
], Subscription.prototype, "cancelAtPeriodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'cancelled_at' }),
    __metadata("design:type", Date)
], Subscription.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'cancellation_reason' }),
    __metadata("design:type", String)
], Subscription.prototype, "cancellationReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Subscription.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, default: 'IDR' }),
    __metadata("design:type", String)
], Subscription.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', default: '{}' }),
    __metadata("design:type", Object)
], Subscription.prototype, "metadata", void 0);
exports.Subscription = Subscription = __decorate([
    (0, typeorm_1.Entity)('subscriptions')
], Subscription);
//# sourceMappingURL=subscription.entity.js.map
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
exports.Company = void 0;
const typeorm_1 = require("typeorm");
const entities_1 = require("../../common/entities");
const subscription_plan_entity_1 = require("../subscriptions/subscription-plan.entity");
let Company = class Company extends entities_1.BaseEntity {
    name;
    slug;
    email;
    phone;
    businessType;
    businessRegistrationNumber;
    taxId;
    address;
    city;
    province;
    postalCode;
    country;
    logoUrl;
    primaryColor;
    timezone;
    currency;
    language;
    status;
    isEmailVerified;
    emailVerifiedAt;
    currentPlanId;
    currentPlan;
    subscriptionStatus;
    trialEndsAt;
    subscriptionEndsAt;
    metadata;
    deletedAt;
};
exports.Company = Company;
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], Company.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 100 }),
    __metadata("design:type", String)
], Company.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 100 }),
    __metadata("design:type", String)
], Company.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true, name: 'business_type' }),
    __metadata("design:type", String)
], Company.prototype, "businessType", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true, name: 'business_registration_number' }),
    __metadata("design:type", String)
], Company.prototype, "businessRegistrationNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true, name: 'tax_id' }),
    __metadata("design:type", String)
], Company.prototype, "taxId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "province", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 10, nullable: true, name: 'postal_code' }),
    __metadata("design:type", String)
], Company.prototype, "postalCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 2, default: 'ID' }),
    __metadata("design:type", String)
], Company.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, nullable: true, name: 'logo_url' }),
    __metadata("design:type", String)
], Company.prototype, "logoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 7, default: '#10b981', name: 'primary_color' }),
    __metadata("design:type", String)
], Company.prototype, "primaryColor", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, default: 'Asia/Jakarta' }),
    __metadata("design:type", String)
], Company.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, default: 'IDR' }),
    __metadata("design:type", String)
], Company.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 5, default: 'id' }),
    __metadata("design:type", String)
], Company.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, default: 'active' }),
    __metadata("design:type", String)
], Company.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'is_email_verified' }),
    __metadata("design:type", Boolean)
], Company.prototype, "isEmailVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'email_verified_at' }),
    __metadata("design:type", Date)
], Company.prototype, "emailVerifiedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'current_plan_id' }),
    __metadata("design:type", String)
], Company.prototype, "currentPlanId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => subscription_plan_entity_1.SubscriptionPlan, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'current_plan_id' }),
    __metadata("design:type", subscription_plan_entity_1.SubscriptionPlan)
], Company.prototype, "currentPlan", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true, name: 'subscription_status' }),
    __metadata("design:type", String)
], Company.prototype, "subscriptionStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'trial_ends_at' }),
    __metadata("design:type", Date)
], Company.prototype, "trialEndsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'subscription_ends_at' }),
    __metadata("design:type", Date)
], Company.prototype, "subscriptionEndsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', default: '{}' }),
    __metadata("design:type", Object)
], Company.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at' }),
    __metadata("design:type", Date)
], Company.prototype, "deletedAt", void 0);
exports.Company = Company = __decorate([
    (0, typeorm_1.Entity)('companies')
], Company);
//# sourceMappingURL=company.entity.js.map
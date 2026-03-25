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
const member_entity_1 = require("../members/member.entity");
const feature_entity_1 = require("../features/feature.entity");
const subscription_plan_entity_1 = require("../subscriptions/subscription-plan.entity");
let Company = class Company extends entities_1.BaseEntity {
    name;
    email;
    password;
    phone;
    address;
    logo;
    isActive;
    members;
    features;
    subscriptionPlans;
};
exports.Company = Company;
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], Company.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 100 }),
    __metadata("design:type", String)
], Company.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Company.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "logo", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Company.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => member_entity_1.Member, (member) => member.company),
    __metadata("design:type", Array)
], Company.prototype, "members", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => feature_entity_1.Feature, (feature) => feature.company),
    __metadata("design:type", Array)
], Company.prototype, "features", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => subscription_plan_entity_1.SubscriptionPlan, (plan) => plan.company),
    __metadata("design:type", Array)
], Company.prototype, "subscriptionPlans", void 0);
exports.Company = Company = __decorate([
    (0, typeorm_1.Entity)('companies')
], Company);
//# sourceMappingURL=company.entity.js.map
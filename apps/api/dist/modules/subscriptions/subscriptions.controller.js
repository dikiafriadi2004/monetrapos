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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const subscriptions_service_1 = require("./subscriptions.service");
const dto_1 = require("./dto");
let SubscriptionsController = class SubscriptionsController {
    subscriptionsService;
    constructor(subscriptionsService) {
        this.subscriptionsService = subscriptionsService;
    }
    async subscribe(req, dto) {
        const companyId = req.user.companyId;
        return this.subscriptionsService.createSubscription(companyId, dto.planId);
    }
    async getSubscriptions(req) {
        const companyId = req.user.companyId;
        return this.subscriptionsService.findActiveByCompany(companyId);
    }
    async changePlan(req, dto) {
        const companyId = req.user.companyId;
        return this.subscriptionsService.changePlan(companyId, dto.newPlanId);
    }
    async cancel(req, dto) {
        const companyId = req.user.companyId;
        const subscription = await this.subscriptionsService.findActiveByCompany(companyId);
        if (!subscription) {
            throw new Error('No active subscription found');
        }
        return this.subscriptionsService.cancelSubscription(subscription.id, dto.reason);
    }
    async reactivate(req) {
        const companyId = req.user.companyId;
        const subscription = await this.subscriptionsService.findActiveByCompany(companyId);
        if (!subscription) {
            throw new Error('No subscription found');
        }
        return this.subscriptionsService.reactivateSubscription(subscription.id);
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Post)('subscribe'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "subscribe", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getSubscriptions", null);
__decorate([
    (0, common_1.Put)('change-plan'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.ChangePlanDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "changePlan", null);
__decorate([
    (0, common_1.Post)('cancel'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CancelSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('reactivate'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "reactivate", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, common_1.Controller)('subscriptions'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map
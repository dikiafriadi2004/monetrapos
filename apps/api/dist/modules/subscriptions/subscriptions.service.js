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
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const subscription_entity_1 = require("./subscription.entity");
const subscription_plan_entity_1 = require("./subscription-plan.entity");
const company_entity_1 = require("../companies/company.entity");
let SubscriptionsService = class SubscriptionsService {
    subscriptionRepository;
    planRepository;
    companyRepository;
    constructor(subscriptionRepository, planRepository, companyRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.planRepository = planRepository;
        this.companyRepository = companyRepository;
    }
    async create(data) {
        const existing = await this.subscriptionRepository.findOne({
            where: {
                companyId: data.companyId,
                status: subscription_entity_1.SubscriptionStatus.ACTIVE,
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('Company already has an active subscription');
        }
        const plan = await this.planRepository.findOne({
            where: { id: data.planId },
        });
        if (!plan) {
            throw new common_1.NotFoundException('Subscription plan not found');
        }
        const now = new Date();
        const price = data.billingCycle === subscription_entity_1.BillingCycle.MONTHLY
            ? plan.priceMonthly
            : plan.priceYearly;
        let subscription;
        if (data.startTrial) {
            const trialEnd = new Date(now);
            trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
            subscription = this.subscriptionRepository.create({
                companyId: data.companyId,
                planId: data.planId,
                billingCycle: data.billingCycle,
                status: subscription_entity_1.SubscriptionStatus.TRIAL,
                currentPeriodStart: now,
                currentPeriodEnd: trialEnd,
                trialStart: now,
                trialEnd: trialEnd,
                price,
            });
        }
        else {
            const periodEnd = new Date(now);
            if (data.billingCycle === subscription_entity_1.BillingCycle.MONTHLY) {
                periodEnd.setMonth(periodEnd.getMonth() + 1);
            }
            else {
                periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            }
            subscription = this.subscriptionRepository.create({
                companyId: data.companyId,
                planId: data.planId,
                billingCycle: data.billingCycle,
                status: subscription_entity_1.SubscriptionStatus.ACTIVE,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                price,
            });
        }
        subscription = await this.subscriptionRepository.save(subscription);
        await this.companyRepository.update(data.companyId, {
            currentPlanId: data.planId,
            subscriptionStatus: subscription.status,
            trialEndsAt: subscription.trialEnd,
            subscriptionEndsAt: subscription.currentPeriodEnd,
        });
        return subscription;
    }
    async createSubscription(companyId, planId) {
        return this.create({
            companyId,
            planId,
            billingCycle: subscription_entity_1.BillingCycle.MONTHLY,
            startTrial: true,
        });
    }
    async findActiveByCompany(companyId) {
        return this.subscriptionRepository.findOne({
            where: { companyId, status: subscription_entity_1.SubscriptionStatus.ACTIVE },
            relations: ['plan'],
        });
    }
    async findByCompany(companyId) {
        return this.subscriptionRepository.find({
            where: { companyId },
            relations: ['plan'],
            order: { createdAt: 'DESC' },
        });
    }
    async changePlan(companyId, newPlanId) {
        const currentSubscription = await this.findActiveByCompany(companyId);
        if (!currentSubscription) {
            throw new common_1.NotFoundException('No active subscription found');
        }
        const newPlan = await this.planRepository.findOne({
            where: { id: newPlanId },
        });
        if (!newPlan) {
            throw new common_1.NotFoundException('New plan not found');
        }
        const newPrice = currentSubscription.billingCycle === subscription_entity_1.BillingCycle.MONTHLY
            ? newPlan.priceMonthly
            : newPlan.priceYearly;
        currentSubscription.planId = newPlanId;
        currentSubscription.price = newPrice;
        await this.subscriptionRepository.save(currentSubscription);
        await this.companyRepository.update(companyId, {
            currentPlanId: newPlanId,
        });
        return currentSubscription;
    }
    async cancel(companyId, reason) {
        const subscription = await this.findActiveByCompany(companyId);
        if (!subscription) {
            throw new common_1.NotFoundException('No active subscription found');
        }
        subscription.cancelAtPeriodEnd = true;
        subscription.cancelledAt = new Date();
        subscription.cancellationReason = reason || '';
        return this.subscriptionRepository.save(subscription);
    }
    async cancelSubscription(subscriptionId, reason) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        subscription.status = subscription_entity_1.SubscriptionStatus.CANCELLED;
        subscription.cancelledAt = new Date();
        subscription.cancellationReason = reason || '';
        await this.subscriptionRepository.save(subscription);
        await this.companyRepository.update(subscription.companyId, {
            subscriptionStatus: subscription_entity_1.SubscriptionStatus.CANCELLED,
        });
        return subscription;
    }
    async reactivate(companyId) {
        const subscription = await this.findActiveByCompany(companyId);
        if (!subscription) {
            throw new common_1.NotFoundException('No active subscription found');
        }
        if (!subscription.cancelAtPeriodEnd) {
            throw new common_1.BadRequestException('Subscription is not cancelled');
        }
        subscription.cancelAtPeriodEnd = false;
        subscription.cancelledAt = null;
        subscription.cancellationReason = '';
        return this.subscriptionRepository.save(subscription);
    }
    async reactivateSubscription(subscriptionId) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        subscription.status = subscription_entity_1.SubscriptionStatus.ACTIVE;
        subscription.cancelAtPeriodEnd = false;
        subscription.cancelledAt = null;
        subscription.cancellationReason = '';
        await this.subscriptionRepository.save(subscription);
        await this.companyRepository.update(subscription.companyId, {
            subscriptionStatus: subscription_entity_1.SubscriptionStatus.ACTIVE,
        });
        return subscription;
    }
    async renew(subscriptionId) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId },
            relations: ['plan'],
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        const newPeriodStart = subscription.currentPeriodEnd;
        const newPeriodEnd = new Date(newPeriodStart);
        if (subscription.billingCycle === subscription_entity_1.BillingCycle.MONTHLY) {
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
        }
        else {
            newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
        }
        subscription.currentPeriodStart = newPeriodStart;
        subscription.currentPeriodEnd = newPeriodEnd;
        subscription.status = subscription_entity_1.SubscriptionStatus.ACTIVE;
        await this.subscriptionRepository.save(subscription);
        await this.companyRepository.update(subscription.companyId, {
            subscriptionStatus: subscription_entity_1.SubscriptionStatus.ACTIVE,
            subscriptionEndsAt: newPeriodEnd,
        });
        return subscription;
    }
    async convertTrialToPaid(companyId) {
        const subscription = await this.findActiveByCompany(companyId);
        if (!subscription) {
            throw new common_1.NotFoundException('No active subscription found');
        }
        if (subscription.status !== subscription_entity_1.SubscriptionStatus.TRIAL) {
            throw new common_1.BadRequestException('Subscription is not in trial');
        }
        const now = new Date();
        const periodEnd = new Date(now);
        if (subscription.billingCycle === subscription_entity_1.BillingCycle.MONTHLY) {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }
        else {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }
        subscription.status = subscription_entity_1.SubscriptionStatus.ACTIVE;
        subscription.currentPeriodStart = now;
        subscription.currentPeriodEnd = periodEnd;
        await this.subscriptionRepository.save(subscription);
        await this.companyRepository.update(companyId, {
            subscriptionStatus: subscription_entity_1.SubscriptionStatus.ACTIVE,
            subscriptionEndsAt: periodEnd,
        });
        return subscription;
    }
    async expire(subscriptionId) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        subscription.status = subscription_entity_1.SubscriptionStatus.EXPIRED;
        await this.subscriptionRepository.save(subscription);
        await this.companyRepository.update(subscription.companyId, {
            subscriptionStatus: subscription_entity_1.SubscriptionStatus.EXPIRED,
        });
    }
    async checkExpiredSubscriptions() {
        const now = new Date();
        const expiredSubscriptions = await this.subscriptionRepository.find({
            where: {
                status: subscription_entity_1.SubscriptionStatus.ACTIVE,
            },
        });
        for (const subscription of expiredSubscriptions) {
            if (subscription.currentPeriodEnd < now) {
                if (subscription.cancelAtPeriodEnd) {
                    await this.expire(subscription.id);
                }
                else {
                    subscription.status = subscription_entity_1.SubscriptionStatus.PAST_DUE;
                    await this.subscriptionRepository.save(subscription);
                }
            }
        }
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __param(1, (0, typeorm_1.InjectRepository)(subscription_plan_entity_1.SubscriptionPlan)),
    __param(2, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map
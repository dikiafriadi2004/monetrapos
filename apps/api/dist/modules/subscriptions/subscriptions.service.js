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
const subscription_plan_entity_1 = require("./subscription-plan.entity");
const feature_entity_1 = require("../features/feature.entity");
let SubscriptionsService = class SubscriptionsService {
    planRepo;
    featureRepo;
    constructor(planRepo, featureRepo) {
        this.planRepo = planRepo;
        this.featureRepo = featureRepo;
    }
    async createPlan(companyId, dto) {
        const { featureIds, ...rest } = dto;
        const plan = this.planRepo.create({ ...rest, companyId });
        if (featureIds && featureIds.length > 0) {
            plan.features = await this.featureRepo.findBy({ id: (0, typeorm_2.In)(featureIds), companyId });
        }
        return this.planRepo.save(plan);
    }
    async findAllPlans(companyId) {
        return this.planRepo.find({ where: { companyId }, relations: ['features'] });
    }
    async findOnePlan(companyId, id) {
        const plan = await this.planRepo.findOne({ where: { id, companyId }, relations: ['features'] });
        if (!plan)
            throw new common_1.NotFoundException('Subscription plan not found');
        return plan;
    }
    async updatePlan(companyId, id, dto) {
        const plan = await this.findOnePlan(companyId, id);
        const { featureIds, ...rest } = dto;
        Object.assign(plan, rest);
        if (featureIds) {
            plan.features = await this.featureRepo.findBy({ id: (0, typeorm_2.In)(featureIds), companyId });
        }
        return this.planRepo.save(plan);
    }
    async removePlan(companyId, id) {
        const plan = await this.findOnePlan(companyId, id);
        await this.planRepo.remove(plan);
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subscription_plan_entity_1.SubscriptionPlan)),
    __param(1, (0, typeorm_1.InjectRepository)(feature_entity_1.Feature)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map
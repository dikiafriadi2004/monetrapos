import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Feature } from '../features/feature.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(Feature)
    private featureRepo: Repository<Feature>,
  ) {}

  async createPlan(companyId: string, dto: CreatePlanDto): Promise<SubscriptionPlan> {
    const { featureIds, ...rest } = dto;
    const plan = this.planRepo.create({ ...rest, companyId });

    if (featureIds && featureIds.length > 0) {
      plan.features = await this.featureRepo.findBy({ id: In(featureIds), companyId });
    }

    return this.planRepo.save(plan);
  }

  async findAllPlans(companyId: string): Promise<SubscriptionPlan[]> {
    return this.planRepo.find({ where: { companyId }, relations: ['features'] });
  }

  async findOnePlan(companyId: string, id: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findOne({ where: { id, companyId }, relations: ['features'] });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return plan;
  }

  async updatePlan(companyId: string, id: string, dto: UpdatePlanDto): Promise<SubscriptionPlan> {
    const plan = await this.findOnePlan(companyId, id);
    const { featureIds, ...rest } = dto;

    Object.assign(plan, rest);

    if (featureIds) {
      plan.features = await this.featureRepo.findBy({ id: In(featureIds), companyId });
    }

    return this.planRepo.save(plan);
  }

  async removePlan(companyId: string, id: string): Promise<void> {
    const plan = await this.findOnePlan(companyId, id);
    await this.planRepo.remove(plan);
  }
}

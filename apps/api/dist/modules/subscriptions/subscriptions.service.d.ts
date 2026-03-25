import { Repository } from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Feature } from '../features/feature.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
export declare class SubscriptionsService {
    private planRepo;
    private featureRepo;
    constructor(planRepo: Repository<SubscriptionPlan>, featureRepo: Repository<Feature>);
    createPlan(companyId: string, dto: CreatePlanDto): Promise<SubscriptionPlan>;
    findAllPlans(companyId: string): Promise<SubscriptionPlan[]>;
    findOnePlan(companyId: string, id: string): Promise<SubscriptionPlan>;
    updatePlan(companyId: string, id: string, dto: UpdatePlanDto): Promise<SubscriptionPlan>;
    removePlan(companyId: string, id: string): Promise<void>;
}

import { SubscriptionsService } from './subscriptions.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    createPlan(req: any, dto: CreatePlanDto): Promise<import("./subscription-plan.entity").SubscriptionPlan>;
    findAllPlans(req: any): Promise<import("./subscription-plan.entity").SubscriptionPlan[]>;
    findOnePlan(req: any, id: string): Promise<import("./subscription-plan.entity").SubscriptionPlan>;
    updatePlan(req: any, id: string, dto: UpdatePlanDto): Promise<import("./subscription-plan.entity").SubscriptionPlan>;
    removePlan(req: any, id: string): Promise<void>;
}

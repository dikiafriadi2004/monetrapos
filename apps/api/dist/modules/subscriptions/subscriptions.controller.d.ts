import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, ChangePlanDto, CancelSubscriptionDto } from './dto';
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    subscribe(req: any, dto: CreateSubscriptionDto): Promise<import("./subscription.entity").Subscription>;
    getSubscriptions(req: any): Promise<import("./subscription.entity").Subscription | null>;
    changePlan(req: any, dto: ChangePlanDto): Promise<import("./subscription.entity").Subscription>;
    cancel(req: any, dto: CancelSubscriptionDto): Promise<import("./subscription.entity").Subscription>;
    reactivate(req: any): Promise<import("./subscription.entity").Subscription>;
}

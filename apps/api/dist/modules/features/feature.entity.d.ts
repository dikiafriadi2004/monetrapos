import { BaseEntity } from '../../common/entities';
import { SubscriptionPlan } from '../subscriptions/subscription-plan.entity';
export declare class Feature extends BaseEntity {
    name: string;
    code: string;
    description: string;
    icon: string;
    isActive: boolean;
    companyId: string;
    plans: SubscriptionPlan[];
}

import { BaseEntity } from '../../common/entities';
import { Member } from '../members/member.entity';
import { Feature } from '../features/feature.entity';
import { SubscriptionPlan } from '../subscriptions/subscription-plan.entity';
export declare class Company extends BaseEntity {
    name: string;
    email: string;
    password: string;
    phone: string;
    address: string;
    logo: string;
    isActive: boolean;
    members: Member[];
    features: Feature[];
    subscriptionPlans: SubscriptionPlan[];
}

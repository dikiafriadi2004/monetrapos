import { BaseEntity } from '../../common/entities';
import { SubscriptionStatus } from '../../common/enums';
import { Member } from '../members/member.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
export declare class Subscription extends BaseEntity {
    status: SubscriptionStatus;
    startDate: Date;
    endDate: Date;
    memberId: string;
    planId: string;
    member: Member;
    plan: SubscriptionPlan;
}

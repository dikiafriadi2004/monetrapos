import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
export declare enum SubscriptionStatus {
    TRIAL = "trial",
    ACTIVE = "active",
    PAST_DUE = "past_due",
    CANCELLED = "cancelled",
    EXPIRED = "expired"
}
export declare enum BillingCycle {
    MONTHLY = "monthly",
    YEARLY = "yearly"
}
export declare class Subscription extends BaseEntity {
    companyId: string;
    company: Company;
    planId: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    trialStart: Date;
    trialEnd: Date;
    cancelAtPeriodEnd: boolean;
    cancelledAt: Date;
    cancellationReason: string;
    price: number;
    currency: string;
    metadata: Record<string, any>;
}

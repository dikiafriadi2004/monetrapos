import { Repository } from 'typeorm';
import { Subscription, BillingCycle } from './subscription.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Company } from '../companies/company.entity';
export declare class SubscriptionsService {
    private readonly subscriptionRepository;
    private readonly planRepository;
    private readonly companyRepository;
    constructor(subscriptionRepository: Repository<Subscription>, planRepository: Repository<SubscriptionPlan>, companyRepository: Repository<Company>);
    create(data: {
        companyId: string;
        planId: string;
        billingCycle: BillingCycle;
        startTrial?: boolean;
    }): Promise<Subscription>;
    createSubscription(companyId: string, planId: string): Promise<Subscription>;
    findActiveByCompany(companyId: string): Promise<Subscription | null>;
    findByCompany(companyId: string): Promise<Subscription[]>;
    changePlan(companyId: string, newPlanId: string): Promise<Subscription>;
    cancel(companyId: string, reason?: string): Promise<Subscription>;
    cancelSubscription(subscriptionId: string, reason?: string): Promise<Subscription>;
    reactivate(companyId: string): Promise<Subscription>;
    reactivateSubscription(subscriptionId: string): Promise<Subscription>;
    renew(subscriptionId: string): Promise<Subscription>;
    convertTrialToPaid(companyId: string): Promise<Subscription>;
    expire(subscriptionId: string): Promise<void>;
    checkExpiredSubscriptions(): Promise<void>;
}

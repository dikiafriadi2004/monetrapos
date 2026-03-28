import { BaseEntity } from '../../common/entities';
import { Subscription } from './subscription.entity';
export declare class SubscriptionPlan extends BaseEntity {
    name: string;
    slug: string;
    description: string;
    priceMonthly: number;
    priceYearly: number;
    setupFee: number;
    trialDays: number;
    features: Record<string, boolean>;
    maxStores: number;
    maxUsers: number;
    maxEmployees: number;
    maxProducts: number;
    maxTransactionsPerMonth: number;
    maxCustomers: number;
    maxStorageMb: number;
    isActive: boolean;
    isPopular: boolean;
    sortOrder: number;
    subscriptions: Subscription[];
    deletedAt: Date;
}

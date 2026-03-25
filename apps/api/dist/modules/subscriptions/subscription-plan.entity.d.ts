import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Feature } from '../features/feature.entity';
import { Subscription } from './subscription.entity';
export declare class SubscriptionPlan extends BaseEntity {
    name: string;
    description: string;
    price: number;
    durationDays: number;
    maxOutlets: number;
    maxProducts: number;
    sortOrder: number;
    isActive: boolean;
    companyId: string;
    company: Company;
    features: Feature[];
    subscriptions: Subscription[];
}

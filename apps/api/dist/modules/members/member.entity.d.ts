import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Store } from '../stores/store.entity';
import { Subscription } from '../subscriptions/subscription.entity';
export declare class Member extends BaseEntity {
    name: string;
    email: string;
    password: string;
    phone: string;
    address: string;
    avatar: string;
    isActive: boolean;
    companyId: string;
    company: Company;
    stores: Store[];
    subscriptions: Subscription[];
}

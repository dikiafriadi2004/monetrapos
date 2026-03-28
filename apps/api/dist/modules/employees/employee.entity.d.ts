import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Store } from '../stores/store.entity';
export declare class Employee extends BaseEntity {
    companyId: string;
    company: Company;
    storeId: string;
    store: Store;
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
    pin: string;
    employeeCode: string;
    position: string;
    hireDate: Date;
    avatarUrl: string;
    isActive: boolean;
    deletedAt: Date;
}

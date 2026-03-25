import { BaseEntity } from '../../common/entities';
import { Store } from '../stores/store.entity';
import { Role } from '../roles/role.entity';
export declare class Employee extends BaseEntity {
    name: string;
    email: string;
    password: string;
    phone: string;
    avatar: string;
    pin: string;
    isActive: boolean;
    storeId: string;
    roleId: string;
    store: Store;
    role: Role;
}

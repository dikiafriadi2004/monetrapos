import { BaseEntity } from '../../common/entities';
import { Store } from '../stores/store.entity';
import { Permission } from './permission.entity';
import { Employee } from '../employees/employee.entity';
export declare class Role extends BaseEntity {
    name: string;
    description: string;
    isSystemRole: boolean;
    storeId: string;
    store: Store;
    permissions: Permission[];
    employees: Employee[];
}

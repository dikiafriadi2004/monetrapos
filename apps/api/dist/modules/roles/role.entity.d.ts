import { BaseEntity } from '../../common/entities';
import { Store } from '../stores/store.entity';
import { Permission } from './permission.entity';
export declare class Role extends BaseEntity {
    name: string;
    description: string;
    isSystemRole: boolean;
    storeId: string;
    store: Store;
    permissions: Permission[];
}

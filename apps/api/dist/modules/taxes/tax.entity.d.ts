import { BaseEntity } from '../../common/entities';
import { Store } from '../stores/store.entity';
export declare class Tax extends BaseEntity {
    name: string;
    rate: number;
    isActive: boolean;
    isInclusive: boolean;
    storeId: string;
    store: Store;
}

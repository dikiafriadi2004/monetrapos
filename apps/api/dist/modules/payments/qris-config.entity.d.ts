import { BaseEntity } from '../../common/entities';
import { Store } from '../stores/store.entity';
export declare class QrisConfig extends BaseEntity {
    originalImage: string;
    parsedData: string;
    merchantName: string;
    merchantId: string;
    isActive: boolean;
    storeId: string;
    store: Store;
}

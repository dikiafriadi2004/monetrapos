import { BaseEntity } from '../../common/entities';
import { PaymentMethodType } from '../../common/enums';
import { Store } from '../stores/store.entity';
export declare class PaymentMethod extends BaseEntity {
    type: PaymentMethodType;
    name: string;
    isActive: boolean;
    config: Record<string, any>;
    storeId: string;
    store: Store;
}

import { BaseEntity } from '../../common/entities';
import { DiscountType } from '../../common/enums';
import { Store } from '../stores/store.entity';
export declare class Discount extends BaseEntity {
    name: string;
    type: DiscountType;
    value: number;
    minTransaction: number;
    maxDiscount: number;
    voucherCode: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    storeId: string;
    store: Store;
}

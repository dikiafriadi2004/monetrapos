import { BaseEntity } from '../../common/entities';
import { Store } from '../stores/store.entity';
export declare class Category extends BaseEntity {
    name: string;
    description: string;
    image: string;
    sortOrder: number;
    isActive: boolean;
    storeId: string;
    store: Store;
    products: Product[];
}
import { Product } from './product.entity';

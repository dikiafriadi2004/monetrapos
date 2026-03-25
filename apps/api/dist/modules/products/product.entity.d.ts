import { BaseEntity } from '../../common/entities';
import { Store } from '../stores/store.entity';
import { Category } from './category.entity';
import { ProductVariant } from './product-variant.entity';
export declare class Product extends BaseEntity {
    name: string;
    description: string;
    sku: string;
    barcode: string;
    price: number;
    costPrice: number;
    image: string;
    trackStock: boolean;
    stock: number;
    lowStockAlert: number;
    isActive: boolean;
    sortOrder: number;
    storeId: string;
    categoryId: string;
    store: Store;
    category: Category;
    variants: ProductVariant[];
}

import { BaseEntity } from '../../common/entities';
import { Product } from './product.entity';
export declare class ProductVariant extends BaseEntity {
    name: string;
    priceAdjustment: number;
    sku: string;
    stock: number;
    isActive: boolean;
    productId: string;
    product: Product;
}

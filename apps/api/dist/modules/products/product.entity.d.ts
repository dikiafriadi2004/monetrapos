import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Store } from '../stores/store.entity';
import { Category } from './category.entity';
import { ProductVariant } from './product-variant.entity';
export declare enum ProductType {
    PHYSICAL = "physical",
    DIGITAL = "digital",
    SERVICE = "service"
}
export declare class Product extends BaseEntity {
    companyId: string;
    company: Company;
    storeId: string;
    store: Store;
    categoryId: string;
    category: Category;
    name: string;
    description: string;
    sku: string;
    barcode: string;
    cost: number;
    price: number;
    compareAtPrice: number;
    trackInventory: boolean;
    stock: number;
    lowStockThreshold: number;
    type: ProductType;
    imageUrl: string;
    images: string[];
    hasVariants: boolean;
    variants: ProductVariant[];
    isTaxable: boolean;
    taxRate: number;
    isActive: boolean;
    metadata: Record<string, any>;
    deletedAt: Date;
}

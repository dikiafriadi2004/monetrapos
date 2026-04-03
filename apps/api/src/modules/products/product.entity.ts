import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Store } from '../stores/store.entity';
import { Category } from './category.entity';
import { ProductVariant } from './product-variant.entity';

export enum ProductType {
  PHYSICAL = 'physical',
  DIGITAL = 'digital',
  SERVICE = 'service',
}

@Entity('products')
export class Product extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.products)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ nullable: true, name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.products, {
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  // Basic Info
  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 100, nullable: true })
  sku: string;

  @Column({ length: 100, nullable: true })
  barcode: string;

  // Pricing
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'compare_at_price',
  })
  compareAtPrice: number; // Original price for discount display

  // Inventory
  @Column({ default: true, name: 'track_inventory' })
  trackInventory: boolean;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 10, name: 'low_stock_threshold' })
  lowStockThreshold: number;

  // Product Type
  @Column({ type: 'enum', enum: ProductType, default: ProductType.PHYSICAL })
  type: ProductType;

  // Images
  @Column({ length: 500, nullable: true, name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'json', default: '[]' })
  images: string[]; // Array of image URLs

  // Variants
  @Column({ default: false, name: 'has_variants' })
  hasVariants: boolean;

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants: ProductVariant[];

  // Tax
  @Column({ default: true, name: 'is_taxable' })
  isTaxable: boolean;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'tax_rate',
  })
  taxRate: number;

  // Status
  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // Metadata
  @Column({ type: 'json', default: '{}' })
  metadata: Record<string, any>;

  // Soft Delete
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}

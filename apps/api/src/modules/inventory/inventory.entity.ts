import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Store } from '../stores/store.entity';
import { Product } from '../products/product.entity';
import { ProductVariant } from '../products/product-variant.entity';

@Entity('inventory')
@Unique('unique_store_product_variant', ['storeId', 'productId', 'variantId'])
@Index('idx_company_store', ['companyId', 'storeId'])
@Index('idx_low_stock', ['companyId', 'availableQuantity'])
export class Inventory extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'variant_id', nullable: true })
  variantId: string | null;

  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant | null;

  // Stock Quantities
  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'int', default: 0, name: 'reserved_quantity' })
  reservedQuantity: number;

  // Computed column: available_quantity = quantity - reserved_quantity
  // This will be a generated column in the database
  @Column({
    type: 'int',
    name: 'available_quantity',
    generatedType: 'STORED',
    asExpression: 'quantity - reserved_quantity',
  })
  availableQuantity: number;

  @Column({ type: 'date', nullable: true, name: 'last_restock_date' })
  lastRestockDate: Date;
}

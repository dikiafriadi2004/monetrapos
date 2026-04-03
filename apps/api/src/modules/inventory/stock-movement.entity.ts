import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Product } from '../products/product.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { Store } from '../stores/store.entity';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';

export enum MovementType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
  SALE = 'sale',
  TRANSFER = 'transfer',
}

@Entity('stock_movements')
export class StockMovement extends BaseEntity {
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

  // Movement Details
  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Stock level after this movement',
    name: 'stock_after',
  })
  stockAfter: number;

  @Column({ nullable: true, length: 255 })
  reason: string;

  @Column({
    nullable: true,
    length: 100,
    comment: 'e.g. invoice number or transaction ID',
  })
  reference: string;

  @Column({ name: 'performed_by', nullable: true })
  performedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performed_by' })
  performedByUser: User;
}

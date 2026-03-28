import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Product } from '../products/product.entity';
import { Store } from '../stores/store.entity';
import { Company } from '../companies/company.entity';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
  SALE = 'SALE',
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

  // Movement Details
  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int', default: 0, comment: 'Stock level after this movement', name: 'stock_after' })
  stockAfter: number;

  @Column({ nullable: true, length: 255 })
  reason: string;

  @Column({ nullable: true, length: 100, comment: 'e.g. invoice number or transaction ID' })
  reference: string;
}

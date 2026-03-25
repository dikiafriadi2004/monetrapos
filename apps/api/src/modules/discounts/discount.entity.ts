import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { DiscountType } from '../../common/enums';
import { Store } from '../stores/store.entity';

@Entity('discounts')
export class Discount extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ type: 'enum', enum: DiscountType })
  type: DiscountType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  value: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  minTransaction: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxDiscount: number;

  @Column({ length: 50, nullable: true })
  voucherCode: string;

  @Column({ type: 'datetime', nullable: true })
  startDate: Date;

  @Column({ type: 'datetime', nullable: true })
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.discounts)
  @JoinColumn({ name: 'store_id' })
  store: Store;
}

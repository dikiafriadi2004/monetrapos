import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Store } from '../stores/store.entity';

@Entity('taxes')
export class Tax extends BaseEntity {
  @Column({ length: 50 })
  name: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  rate: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isInclusive: boolean;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.taxes)
  @JoinColumn({ name: 'store_id' })
  store: Store;
}

import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Store } from '../stores/store.entity';

@Entity('qris_configs')
export class QrisConfig extends BaseEntity {
  @Column({ type: 'text' })
  originalImage: string;

  @Column({ type: 'text', nullable: true })
  parsedData: string;

  @Column({ length: 100, nullable: true })
  merchantName: string;

  @Column({ length: 100, nullable: true })
  merchantId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.qrisConfigs)
  @JoinColumn({ name: 'store_id' })
  store: Store;
}

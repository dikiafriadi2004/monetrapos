import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { PaymentMethodType } from '../../common/enums';
import { Store } from '../stores/store.entity';

@Entity('store_payment_methods')
export class PaymentMethod extends BaseEntity {
  @Column({ type: 'enum', enum: PaymentMethodType })
  type: PaymentMethodType;

  @Column({ length: 100 })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  config: Record<string, any>;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.paymentMethods)
  @JoinColumn({ name: 'store_id' })
  store: Store;
}

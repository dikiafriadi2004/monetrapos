import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../companies/company.entity';
import { Store } from '../stores/store.entity';
import { Customer } from '../customers/customer.entity';
import { LaundryServiceType } from './laundry-service-type.entity';

export enum LaundryOrderStatus {
  RECEIVED = 'received',
  WASHING = 'washing',
  DRYING = 'drying',
  IRONING = 'ironing',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('laundry_orders')
export class LaundryOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  order_number: string;

  @Column({
    type: 'enum',
    enum: LaundryOrderStatus,
    default: LaundryOrderStatus.RECEIVED,
  })
  status: LaundryOrderStatus;

  @Column({ type: 'uuid' })
  company_id: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'uuid' })
  store_id: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'uuid' })
  service_type_id: string;

  @ManyToOne(() => LaundryServiceType)
  @JoinColumn({ name: 'service_type_id' })
  service_type: LaundryServiceType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  weight_kg: number;

  @Column({ type: 'int', default: 0 })
  item_count: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_price: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  pickup_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivery_date: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pickup_address: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  delivery_address: string;

  @Column({ type: 'timestamp', nullable: true })
  washing_started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  drying_started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  ironing_started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  ready_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivered_at: Date;

  @OneToMany('LaundryItem', 'order')
  items: any[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

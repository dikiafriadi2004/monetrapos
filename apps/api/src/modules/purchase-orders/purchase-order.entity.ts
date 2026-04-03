import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from '../companies/company.entity';
import { Supplier } from '../suppliers/supplier.entity';
import { Store } from '../stores/store.entity';
import { User } from '../users/user.entity';

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

@Entity('purchase_orders')
@Index(['company_id'])
@Index(['supplier_id'])
@Index(['store_id'])
@Index(['status'])
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  company_id: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ unique: true, length: 50 })
  po_number: string;

  @Column('uuid')
  supplier_id: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column('uuid')
  store_id: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column('uuid', { nullable: true })
  created_by: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({
    type: 'enum',
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT,
  })
  status: PurchaseOrderStatus;

  @Column({ type: 'date' })
  order_date: Date;

  @Column({ type: 'date', nullable: true })
  expected_delivery_date: Date;

  @Column({ type: 'date', nullable: true })
  received_date: Date;

  @Column('uuid', { nullable: true })
  received_by: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'received_by' })
  receiver: User;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  subtotal: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  tax_rate: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  tax_amount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  discount_amount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  shipping_cost: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  total: number;

  @Column('text', { nullable: true })
  notes: string;

  @Column('text', { nullable: true })
  terms_and_conditions: string;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchase_order, {
    cascade: true,
  })
  items: PurchaseOrderItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@Entity('purchase_order_items')
@Index(['purchase_order_id'])
@Index(['product_id'])
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  purchase_order_id: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchase_order: PurchaseOrder;

  @Column('uuid')
  product_id: string;

  @Column({ length: 200 })
  product_name: string;

  @Column({ length: 100, nullable: true })
  product_sku: string;

  @Column('int')
  quantity_ordered: number;

  @Column('int', { default: 0 })
  quantity_received: number;

  @Column({ length: 50, nullable: true })
  unit: string;

  @Column('decimal', { precision: 15, scale: 2 })
  unit_price: number;

  @Column('decimal', { precision: 15, scale: 2 })
  total_price: number;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

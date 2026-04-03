import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LaundryOrder } from './laundry-order.entity';

export enum ItemType {
  SHIRT = 'shirt',
  PANTS = 'pants',
  DRESS = 'dress',
  JACKET = 'jacket',
  SKIRT = 'skirt',
  BEDSHEET = 'bedsheet',
  BLANKET = 'blanket',
  CURTAIN = 'curtain',
  TOWEL = 'towel',
  OTHER = 'other',
}

@Entity('laundry_items')
export class LaundryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @ManyToOne(() => LaundryOrder, (order) => order.items)
  @JoinColumn({ name: 'order_id' })
  order: LaundryOrder;

  @Column({
    type: 'enum',
    enum: ItemType,
  })
  item_type: ItemType;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  color: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  barcode: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

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
import { Store } from '../stores/store.entity';
import { User } from '../users/user.entity';

export enum StockOpnameStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('stock_opnames')
@Index(['company_id'])
@Index(['store_id'])
@Index(['status'])
export class StockOpname {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  company_id: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ unique: true, length: 50 })
  opname_number: string;

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
    enum: StockOpnameStatus,
    default: StockOpnameStatus.IN_PROGRESS,
  })
  status: StockOpnameStatus;

  @Column({ type: 'date' })
  opname_date: Date;

  @Column({ type: 'datetime', nullable: true })
  completed_at: Date;

  @Column('uuid', { nullable: true })
  completed_by: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'completed_by' })
  completer: User;

  @Column('text', { nullable: true })
  notes: string;

  @Column('int', { default: 0 })
  total_items: number;

  @Column('int', { default: 0 })
  total_discrepancies: number;

  @OneToMany(() => StockOpnameItem, (item) => item.stock_opname, {
    cascade: true,
  })
  items: StockOpnameItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@Entity('stock_opname_items')
@Index(['stock_opname_id'])
@Index(['product_id'])
export class StockOpnameItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  stock_opname_id: string;

  @ManyToOne(() => StockOpname, (opname) => opname.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'stock_opname_id' })
  stock_opname: StockOpname;

  @Column('uuid')
  product_id: string;

  @Column({ length: 200 })
  product_name: string;

  @Column({ length: 100, nullable: true })
  product_sku: string;

  @Column('int')
  system_quantity: number;

  @Column('int')
  physical_quantity: number;

  @Column('int')
  difference: number;

  @Column({ length: 50, nullable: true })
  unit: string;

  @Column('text', { nullable: true })
  notes: string;

  @Column({ default: false })
  is_adjusted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

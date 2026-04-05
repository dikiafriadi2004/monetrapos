import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../companies/company.entity';

export enum ModifierType {
  SINGLE = 'single',   // Pick one (e.g. size: S/M/L)
  MULTIPLE = 'multiple', // Pick many (e.g. toppings)
}

@Entity('fnb_modifier_groups')
export class FnbModifierGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  company_id: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ length: 100 })
  name: string; // e.g. "Size", "Toppings", "Spice Level"

  @Column({ type: 'enum', enum: ModifierType, default: ModifierType.SINGLE })
  type: ModifierType;

  @Column({ default: false })
  required: boolean;

  @Column({ default: 1 })
  min_selections: number;

  @Column({ nullable: true })
  max_selections: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'simple-json', nullable: true })
  product_ids: string[]; // Which products this modifier applies to (empty = all)

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@Entity('fnb_modifier_options')
export class FnbModifierOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  group_id: string;

  @ManyToOne(() => FnbModifierGroup)
  @JoinColumn({ name: 'group_id' })
  group: FnbModifierGroup;

  @Column({ length: 100 })
  name: string; // e.g. "Large", "Extra Cheese"

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  additional_price: number;

  @Column({ default: true })
  is_available: boolean;

  @Column({ default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

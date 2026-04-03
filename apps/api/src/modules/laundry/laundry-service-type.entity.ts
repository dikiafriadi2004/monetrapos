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

export enum PricingType {
  PER_KG = 'per_kg',
  PER_ITEM = 'per_item',
}

export enum ServiceType {
  WASH_DRY = 'wash_dry',
  WASH_IRON = 'wash_iron',
  DRY_CLEAN = 'dry_clean',
  IRON_ONLY = 'iron_only',
}

@Entity('laundry_service_types')
export class LaundryServiceType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: ServiceType,
  })
  service_type: ServiceType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PricingType,
  })
  pricing_type: PricingType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 24, comment: 'Estimated completion time in hours' })
  estimated_hours: number;

  @Column({ type: 'uuid' })
  company_id: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

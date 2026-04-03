import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AddOnCategory {
  INTEGRATION = 'integration', // Third-party integrations (accounting, delivery, etc.)
  FEATURE = 'feature', // Additional features (advanced reporting, etc.)
  SUPPORT = 'support', // Premium support packages
  CAPACITY = 'capacity', // Increase limits (users, products, etc.)
}

export enum AddOnPricingType {
  ONE_TIME = 'one_time', // One-time payment
  RECURRING = 'recurring', // Monthly recurring
}

export enum AddOnStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMING_SOON = 'coming_soon',
}

@Entity('add_ons')
@Index(['category'])
@Index(['status'])
export class AddOn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('text', { nullable: true })
  long_description: string;

  @Column({
    type: 'enum',
    enum: AddOnCategory,
  })
  category: AddOnCategory;

  @Column({
    type: 'enum',
    enum: AddOnPricingType,
    default: AddOnPricingType.RECURRING,
  })
  pricing_type: AddOnPricingType;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: AddOnStatus,
    default: AddOnStatus.ACTIVE,
  })
  status: AddOnStatus;

  // Icon/image for the add-on
  @Column({ nullable: true })
  icon_url: string;

  // Features included in this add-on (JSON array)
  @Column('simple-json', { nullable: true })
  features: string[];

  // Which subscription plans can access this add-on (JSON array of plan IDs)
  // Empty array = available to all plans
  @Column('simple-json', { default: '[]' })
  available_for_plans: string[];

  // Metadata for integration add-ons (API keys, config, etc.)
  @Column('simple-json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

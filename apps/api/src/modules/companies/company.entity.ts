import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { SubscriptionPlan } from '../subscriptions/subscription-plan.entity';

@Entity('companies')
export class Company extends BaseEntity {
  // Basic Info
  @Column({ length: 200 })
  name: string;

  @Column({ unique: true, length: 100 })
  slug: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  // Business Info
  @Column({ length: 50, nullable: true, name: 'business_type' })
  businessType: string; // retail, fnb, service, other

  @Column({ length: 100, nullable: true, name: 'business_registration_number' })
  businessRegistrationNumber: string;

  @Column({ length: 100, nullable: true, name: 'tax_id' })
  taxId: string; // NPWP

  // Address
  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  province: string;

  @Column({ length: 10, nullable: true, name: 'postal_code' })
  postalCode: string;

  @Column({ length: 2, default: 'ID' })
  country: string;

  // Branding
  @Column({ length: 500, nullable: true, name: 'logo_url' })
  logoUrl: string;

  @Column({ length: 7, default: '#10b981', name: 'primary_color' })
  primaryColor: string;

  // Settings
  @Column({ length: 50, default: 'Asia/Jakarta' })
  timezone: string;

  @Column({ length: 3, default: 'IDR' })
  currency: string;

  @Column({ length: 5, default: 'id' })
  language: string;

  // Status
  @Column({ length: 50, default: 'active' })
  status: string; // active, suspended, cancelled, deleted

  @Column({ default: false, name: 'is_email_verified' })
  isEmailVerified: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'email_verified_at' })
  emailVerifiedAt: Date;

  // Subscription Info (denormalized for quick access)
  @Column({ nullable: true, name: 'current_plan_id' })
  currentPlanId: string;

  @ManyToOne(() => SubscriptionPlan, { nullable: true })
  @JoinColumn({ name: 'current_plan_id' })
  currentPlan: SubscriptionPlan;

  @Column({ length: 50, nullable: true, name: 'subscription_status' })
  subscriptionStatus: string; // trial, active, past_due, cancelled, expired

  @Column({ type: 'timestamp', nullable: true, name: 'trial_ends_at' })
  trialEndsAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'subscription_ends_at' })
  subscriptionEndsAt: Date;

  // Payment Gateway Preference
  @Column({ 
    length: 20, 
    nullable: true, 
    name: 'payment_gateway_preference',
    default: 'midtrans'
  })
  paymentGatewayPreference: string; // midtrans, xendit

  // Metadata
  @Column({ type: 'json', default: '{}' })
  metadata: Record<string, any>;

  // Soft Delete
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}

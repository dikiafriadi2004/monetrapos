import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';

export enum NotificationType {
  INVOICE = 'invoice',
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
  SUBSCRIPTION_EXPIRING = 'subscription_expiring',
  SUBSCRIPTION_EXPIRED = 'subscription_expired',
  SUBSCRIPTION_SUSPENDED = 'subscription_suspended',
  SYSTEM = 'system',
  ALERT = 'alert',
}

export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
}

@Entity('notifications')
export class Notification extends BaseEntity {
  @Column({ nullable: true, name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ nullable: true, name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true, name: 'subscription_id' })
  subscriptionId: string;

  // Notification Info
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'json', default: '{}' })
  data: Record<string, any>;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    nullable: true,
  })
  channel: NotificationChannel;

  @Column({ type: 'date', nullable: true, name: 'scheduled_for' })
  scheduledFor: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'sent_at' })
  sentAt: Date;

  // Read Status
  @Column({ default: false, name: 'is_read' })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
  readAt: Date;
}

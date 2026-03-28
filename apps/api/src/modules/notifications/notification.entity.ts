import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';

export enum NotificationType {
  INVOICE = 'invoice',
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
  SYSTEM = 'system',
  ALERT = 'alert',
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

  // Notification Info
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'json', default: '{}' })
  data: Record<string, any>;

  // Read Status
  @Column({ default: false, name: 'is_read' })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
  readAt: Date;
}

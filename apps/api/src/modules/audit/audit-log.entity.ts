import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities';

@Entity('audit_logs')
@Index(['companyId', 'createdAt'])
@Index(['companyId', 'action'])
@Index(['companyId', 'entityType', 'entityId'])
@Index(['userId', 'createdAt'])
export class AuditLog extends BaseEntity {
  @Column({ nullable: true })
  @Index()
  companyId: string;

  @Column({ length: 100 })
  @Index()
  action: string;

  @Column({ length: 100 })
  @Index()
  entityType: string;

  @Column({ nullable: true })
  entityId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  oldValues: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  newValues: Record<string, any>;

  @Column({ nullable: true })
  @Index()
  userId: string;

  @Column({ length: 50, nullable: true })
  userType: string;

  @Column({ length: 100, nullable: true })
  ipAddress: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;
}

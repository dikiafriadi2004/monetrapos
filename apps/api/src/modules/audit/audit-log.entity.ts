import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities';

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Column({ length: 50 })
  action: string;

  @Column({ length: 100 })
  entityType: string;

  @Column({ nullable: true })
  entityId: string;

  @Column({ type: 'json', nullable: true })
  oldValues: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  newValues: Record<string, any>;

  @Column({ nullable: true })
  userId: string;

  @Column({ length: 50, nullable: true })
  userType: string;

  @Column({ nullable: true })
  ipAddress: string;
}

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('webhook_logs')
export class WebhookLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  event: string;

  @Column({ length: 50 })
  source: string;

  @Column({ type: 'enum', enum: ['success', 'failed', 'pending'], default: 'pending' })
  status: 'success' | 'failed' | 'pending';

  @Column({ type: 'json', nullable: true })
  payload: any;

  @Column({ type: 'json', nullable: true })
  response: any;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'processed_at' })
  processedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payment_gateway_configs')
export class PaymentGatewayConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  gateway: string; // 'xendit'

  @Column({ default: false })
  isEnabled: boolean;

  @Column({ type: 'text', nullable: true })
  secretKey: string;

  @Column({ type: 'text', nullable: true })
  webhookToken: string;

  @Column({ type: 'text', nullable: true })
  webhookUrl: string;

  @Column({ default: false })
  isProduction: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities';

export enum PaymentGatewayType {
  MIDTRANS = 'midtrans',
  XENDIT = 'xendit',
}

@Entity('payment_webhooks')
export class PaymentWebhook extends BaseEntity {
  @Column({ type: 'enum', enum: PaymentGatewayType, name: 'payment_gateway' })
  paymentGateway: PaymentGatewayType;

  @Column({ length: 100, name: 'event_type' })
  eventType: string;

  @Column({ type: 'json' })
  payload: Record<string, any>;

  @Column({ length: 500, nullable: true })
  signature: string;

  @Column({ default: false, name: 'is_verified' })
  isVerified: boolean;

  @Column({ default: false, name: 'is_processed' })
  isProcessed: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'processed_at' })
  processedAt: Date;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;
}

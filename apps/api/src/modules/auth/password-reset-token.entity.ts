import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { User } from '../users/user.entity';

@Entity('password_reset_tokens')
export class PasswordResetToken extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ unique: true, length: 255 })
  token: string;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'used_at' })
  usedAt: Date;
}

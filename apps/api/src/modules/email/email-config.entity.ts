import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum EmailProvider {
  MAILTRAP = 'mailtrap',
  GMAIL = 'gmail',
  SMTP = 'smtp',
}

@Entity('email_configs')
export class EmailConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: EmailProvider, default: EmailProvider.MAILTRAP })
  provider: EmailProvider;

  @Column({ default: false, name: 'is_enabled' })
  isEnabled: boolean;

  // SMTP / Mailtrap
  @Column({ length: 200, nullable: true })
  host: string;

  @Column({ nullable: true })
  port: number;

  @Column({ default: false })
  secure: boolean; // true = SSL/TLS (port 465), false = STARTTLS (port 587)

  @Column({ length: 200, nullable: true })
  username: string;

  @Column({ type: 'text', nullable: true })
  password: string;

  // Sender info
  @Column({ length: 200, nullable: true, name: 'from_name' })
  fromName: string;

  @Column({ length: 200, nullable: true, name: 'from_email' })
  fromEmail: string;

  // Gmail OAuth (optional)
  @Column({ type: 'text', nullable: true, name: 'oauth_client_id' })
  oauthClientId: string;

  @Column({ type: 'text', nullable: true, name: 'oauth_client_secret' })
  oauthClientSecret: string;

  @Column({ type: 'text', nullable: true, name: 'oauth_refresh_token' })
  oauthRefreshToken: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

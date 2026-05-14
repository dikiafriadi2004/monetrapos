import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  type: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 300 })
  subject: string;

  @Column({ type: 'longtext' })
  body: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'simple-array', nullable: true })
  variables: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

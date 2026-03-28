import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';

/**
 * @deprecated This entity is deprecated. Use User entity instead.
 * Member concept has been replaced with Company → User structure.
 * This file is kept for backward compatibility only.
 */
@Entity('members')
export class Member extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column()
  password: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  // Relations removed - use User entity instead
  // @OneToMany(() => Store, (store) => store.member)
  // stores: Store[];

  // @OneToMany(() => Subscription, (sub) => sub.member)
  // subscriptions: Subscription[];
}

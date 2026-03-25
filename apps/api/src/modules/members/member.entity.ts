import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Store } from '../stores/store.entity';
import { Subscription } from '../subscriptions/subscription.entity';

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

  @ManyToOne(() => Company, (company) => company.members)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => Store, (store) => store.member)
  stores: Store[];

  @OneToMany(() => Subscription, (sub) => sub.member)
  subscriptions: Subscription[];
}

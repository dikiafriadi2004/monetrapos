import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Store } from '../stores/store.entity';
import { Role } from '../roles/role.entity';

@Entity('employees')
export class Employee extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column()
  password: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ length: 6, nullable: true })
  pin: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'store_id' })
  storeId: string;

  @Column({ name: 'role_id' })
  roleId: string;

  @ManyToOne(() => Store, (store) => store.employees)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => Role, (role) => role.employees)
  @JoinColumn({ name: 'role_id' })
  role: Role;
}

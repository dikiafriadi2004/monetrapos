import {
  Entity,
  Column,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Store } from '../stores/store.entity';
import { Permission } from './permission.entity';
import { Employee } from '../employees/employee.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ length: 50 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  isSystemRole: boolean;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.roles)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToMany(() => Permission, (permission) => permission.roles, {
    eager: true,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  // Employee relation commented out until Employee entity is updated with roleId
  // @OneToMany(() => Employee, (employee) => employee.role)
  // employees: Employee[];
}

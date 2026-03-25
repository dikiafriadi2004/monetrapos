import { Entity, Column, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ unique: true, length: 100 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50 })
  category: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}

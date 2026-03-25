import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { StoreType } from '../../common/enums';
import { Member } from '../members/member.entity';
import { Product } from '../products/product.entity';
import { Category } from '../products/category.entity';
import { Employee } from '../employees/employee.entity';
import { Role } from '../roles/role.entity';
import { Tax } from '../taxes/tax.entity';
import { Discount } from '../discounts/discount.entity';
import { Transaction } from '../transactions/transaction.entity';
import { PaymentMethod } from '../payments/payment-method.entity';
import { QrisConfig } from '../payments/qris-config.entity';

@Entity('stores')
export class Store extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ type: 'enum', enum: StoreType, default: StoreType.OTHER })
  type: StoreType;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ type: 'json', nullable: true })
  operationalHours: Record<string, { open: string; close: string }>;

  @Column({ type: 'text', nullable: true })
  receiptHeader: string;

  @Column({ type: 'text', nullable: true })
  receiptFooter: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'member_id' })
  memberId: string;

  @ManyToOne(() => Member, (member) => member.stores)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @OneToMany(() => Product, (product) => product.store)
  products: Product[];

  @OneToMany(() => Category, (category) => category.store)
  categories: Category[];

  @OneToMany(() => Employee, (employee) => employee.store)
  employees: Employee[];

  @OneToMany(() => Role, (role) => role.store)
  roles: Role[];

  @OneToMany(() => Tax, (tax) => tax.store)
  taxes: Tax[];

  @OneToMany(() => Discount, (discount) => discount.store)
  discounts: Discount[];

  @OneToMany(() => Transaction, (tx) => tx.store)
  transactions: Transaction[];

  @OneToMany(() => PaymentMethod, (pm) => pm.store)
  paymentMethods: PaymentMethod[];

  @OneToMany(() => QrisConfig, (qris) => qris.store)
  qrisConfigs: QrisConfig[];
}

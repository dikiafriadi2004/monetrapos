import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Store } from '../stores/store.entity';
import { Company } from '../companies/company.entity';

@Entity('qris_configs')
export class QrisConfig extends BaseEntity {
  @Column({ type: 'text' })
  originalImage: string;

  @Column({ type: 'text', nullable: true })
  parsedData: string;

  @Column({ length: 100, nullable: true })
  merchantName: string;

  @Column({ length: 100, nullable: true })
  merchantId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @ManyToOne(() => Store, { nullable: true })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'company_id', nullable: true })
  companyId: string;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company;
}

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Store } from '../stores/store.entity';
import { Employee } from './employee.entity';

@Entity('employee_attendance')
export class EmployeeAttendance extends BaseEntity {
  @Column({ name: 'employee_id' })
  employeeId: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ type: 'timestamp', name: 'clock_in_at' })
  clockInAt: Date;

  @Column({ type: 'timestamp', name: 'clock_out_at', nullable: true })
  clockOutAt: Date | null;

  @Column({ type: 'int', name: 'work_duration_minutes', nullable: true })
  workDurationMinutes: number | null;

  @Column({ type: 'int', name: 'break_duration_minutes', nullable: true, default: 0 })
  breakDurationMinutes: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}

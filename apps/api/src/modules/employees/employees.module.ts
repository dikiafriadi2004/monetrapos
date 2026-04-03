import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { Employee } from './employee.entity';
import { EmployeeAttendance } from './employee-attendance.entity';
import { User } from '../users/user.entity';
import { Store } from '../stores/store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, EmployeeAttendance, User, Store])],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}

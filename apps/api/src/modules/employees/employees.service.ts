import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Employee } from './employee.entity';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const exists = await this.employeeRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const employee = this.employeeRepo.create({
      ...dto,
      passwordHash: hashedPassword,
    });
    const saved = await this.employeeRepo.save(employee);
    delete (saved as any).passwordHash;
    return saved;
  }

  async findAllByStore(storeId: string): Promise<Employee[]> {
    return this.employeeRepo.find({
      where: { storeId },
      select: ['id', 'name', 'email', 'phone', 'avatarUrl', 'isActive', 'storeId', 'createdAt', 'updatedAt'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'phone', 'avatarUrl', 'pin', 'isActive', 'storeId', 'createdAt', 'updatedAt'],
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');

    Object.assign(employee, dto);
    const saved = await this.employeeRepo.save(employee);
    delete (saved as any).passwordHash;
    return saved;
  }

  async remove(id: string): Promise<void> {
    const employee = await this.employeeRepo.findOne({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');
    await this.employeeRepo.remove(employee);
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Employee } from './employee.entity';
import { EmployeeAttendance } from './employee-attendance.entity';
import { User } from '../users/user.entity';
import { Store } from '../stores/store.entity';
import { CreateEmployeeDto, UpdateEmployeeDto, CreateUserAccountDto, ClockInDto, ClockOutDto } from './dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
    @InjectRepository(EmployeeAttendance)
    private attendanceRepo: Repository<EmployeeAttendance>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Store)
    private storeRepo: Repository<Store>,
  ) {}

  /**
   * Create a new employee
   * Can either link to existing user or create standalone employee with password
   */
  async create(companyId: string, dto: CreateEmployeeDto): Promise<Employee> {
    // Validate store assignment
    await this.validateStoreAssignment(dto.storeId, companyId);

    // Check if linking to existing user
    if (dto.userId) {
      await this.validateUserForLinking(dto.userId, companyId);
      
      // Check if user is already linked to another employee
      const existingEmployee = await this.employeeRepo.findOne({
        where: { userId: dto.userId, companyId },
      });
      if (existingEmployee) {
        throw new ConflictException('User is already linked to an employee');
      }
    }

    // Check email uniqueness if provided
    if (dto.email) {
      const existingByEmail = await this.employeeRepo.findOne({
        where: { email: dto.email, companyId },
      });
      if (existingByEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    // Generate unique employee number
    const employeeNumber = await this.generateEmployeeNumber(companyId);

    // Hash password if provided (for standalone employees)
    let passwordHash: string | null = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    } else if (!dto.userId) {
      throw new BadRequestException('Password is required when not linking to existing user');
    }

    const employeeData: any = {
      companyId: companyId,
      userId: dto.userId || undefined,
      storeId: dto.storeId,
      name: dto.name,
      email: dto.email || undefined,
      phone: dto.phone || undefined,
      passwordHash: passwordHash || undefined,
      pin: dto.pin || undefined,
      employeeNumber: employeeNumber,
      position: dto.position || undefined,
      hireDate: new Date(dto.hireDate),
      salary: dto.salary || 0,
      avatarUrl: dto.avatarUrl || undefined,
      isActive: true,
    };

    const employee = this.employeeRepo.create(employeeData);
    const saved = (await this.employeeRepo.save(employee)) as unknown as Employee;
    delete (saved as any).passwordHash;
    return saved;
  }

  /**
   * Generate unique employee number (company-scoped)
   * Format: EMP-YYYYMMDD-XXXX
   */
  private async generateEmployeeNumber(companyId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Find the last employee number for this company and date
    const lastEmployee = await this.employeeRepo
      .createQueryBuilder('employee')
      .where('employee.companyId = :companyId', { companyId })
      .andWhere('employee.employeeNumber LIKE :pattern', { pattern: `EMP-${dateStr}-%` })
      .orderBy('employee.employeeNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastEmployee) {
      const parts = lastEmployee.employeeNumber.split('-');
      if (parts.length === 3) {
        const lastSequence = parseInt(parts[2], 10);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
    }

    return `EMP-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Validate that store exists and belongs to the company
   */
  private async validateStoreAssignment(storeId: string, companyId: string): Promise<void> {
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.companyId !== companyId) {
      throw new BadRequestException('Store does not belong to your company');
    }
  }

  /**
   * Validate that user exists and belongs to the company
   */
  private async validateUserForLinking(userId: string, companyId: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.companyId !== companyId) {
      throw new BadRequestException('User does not belong to your company');
    }
  }

  /**
   * Link employee to existing user account
   */
  async linkToUser(employeeId: string, userId: string, companyId: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.userId) {
      throw new ConflictException('Employee is already linked to a user account');
    }

    // Validate user
    await this.validateUserForLinking(userId, companyId);

    // Check if user is already linked to another employee
    const existingEmployee = await this.employeeRepo.findOne({
      where: { userId, companyId },
    });

    if (existingEmployee) {
      throw new ConflictException('User is already linked to another employee');
    }

    employee.userId = userId;
    const saved = await this.employeeRepo.save(employee);
    delete (saved as any).passwordHash;
    return saved;
  }

  /**
   * Create user account for employee
   */
  async createUserAccount(
    employeeId: string,
    dto: CreateUserAccountDto,
    companyId: string,
  ): Promise<{ employee: Employee; user: User }> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.userId) {
      throw new ConflictException('Employee already has a user account');
    }

    // Check if email is already used
    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Create user
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      companyId,
      name: employee.name,
      email: dto.email,
      phone: employee.phone || undefined,
      passwordHash,
      role: (dto.role as any) || 'manager',
      permissions: [],
      isActive: true,
      emailVerified: false,
    });

    const savedUser = await this.userRepo.save(user);

    // Link employee to user
    employee.userId = savedUser.id;
    const savedEmployee = await this.employeeRepo.save(employee);
    delete (savedEmployee as any).passwordHash;
    delete (savedUser as any).passwordHash;

    return { employee: savedEmployee, user: savedUser };
  }

  /**
   * Find all employees by company (with optional store filter)
   */
  async findAllByCompany(
    companyId: string,
    options?: {
      storeId?: string;
      page?: number;
      limit?: number;
      search?: string;
      isActive?: boolean;
    },
  ): Promise<{ data: Employee[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.employeeRepo
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('employee.store', 'store')
      .where('employee.companyId = :companyId', { companyId })
      .select([
        'employee.id',
        'employee.name',
        'employee.email',
        'employee.phone',
        'employee.employeeNumber',
        'employee.position',
        'employee.hireDate',
        'employee.salary',
        'employee.avatarUrl',
        'employee.isActive',
        'employee.storeId',
        'employee.userId',
        'employee.createdAt',
        'employee.updatedAt',
        'user.id',
        'user.name',
        'user.email',
        'user.role',
        'store.id',
        'store.name',
        'store.code',
      ]);

    if (options?.storeId) {
      queryBuilder.andWhere('employee.storeId = :storeId', { storeId: options.storeId });
    }

    if (options?.search) {
      queryBuilder.andWhere(
        '(employee.name ILIKE :search OR employee.email ILIKE :search OR employee.employeeNumber ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('employee.isActive = :isActive', { isActive: options.isActive });
    }

    const [data, total] = await queryBuilder
      .orderBy('employee.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Find one employee by ID
   */
  async findOne(id: string, companyId: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id, companyId },
      relations: ['user', 'store'],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        pin: true,
        employeeNumber: true,
        position: true,
        hireDate: true,
        salary: true,
        isActive: true,
        storeId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        store: {
          id: true,
          name: true,
          code: true,
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  /**
   * Update employee
   */
  async update(id: string, dto: UpdateEmployeeDto, companyId: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Validate store assignment if changing
    if (dto.storeId && dto.storeId !== employee.storeId) {
      await this.validateStoreAssignment(dto.storeId, companyId);
    }

    // Validate user linking if changing
    if (dto.userId && dto.userId !== employee.userId) {
      await this.validateUserForLinking(dto.userId, companyId);
      
      // Check if user is already linked to another employee
      const existingEmployee = await this.employeeRepo.findOne({
        where: { userId: dto.userId, companyId },
      });
      if (existingEmployee && existingEmployee.id !== id) {
        throw new ConflictException('User is already linked to another employee');
      }
    }

    // Check email uniqueness if changing
    if (dto.email && dto.email !== employee.email) {
      const existingByEmail = await this.employeeRepo.findOne({
        where: { email: dto.email, companyId },
      });
      if (existingByEmail && existingByEmail.id !== id) {
        throw new ConflictException('Email already registered');
      }
    }

    Object.assign(employee, dto);
    const saved = await this.employeeRepo.save(employee);
    delete (saved as any).passwordHash;
    return saved;
  }

  /**
   * Soft delete employee
   */
  async remove(id: string, companyId: string): Promise<void> {
    const employee = await this.employeeRepo.findOne({
      where: { id, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    await this.employeeRepo.softRemove(employee);
  }

  /**
   * Clock in employee
   * Creates a new attendance record with clock in timestamp
   */
  async clockIn(employeeId: string, dto: ClockInDto, companyId: string): Promise<EmployeeAttendance> {
    // Verify employee exists and belongs to company
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!employee.isActive) {
      throw new BadRequestException('Employee is not active');
    }

    // Validate store
    await this.validateStoreAssignment(dto.storeId, companyId);

    // Check if employee already has an active clock-in (no clock-out yet)
    const activeAttendance = await this.attendanceRepo.findOne({
      where: {
        employeeId,
        companyId,
        clockOutAt: IsNull(),
      },
      order: { clockInAt: 'DESC' },
    });

    if (activeAttendance) {
      throw new ConflictException('Employee is already clocked in. Please clock out first.');
    }

    // Create new attendance record
    const attendance = this.attendanceRepo.create({
      employeeId,
      companyId,
      storeId: dto.storeId,
      clockInAt: new Date(),
      notes: dto.notes || null,
    });

    return await this.attendanceRepo.save(attendance);
  }

  /**
   * Clock out employee
   * Updates the most recent attendance record with clock out timestamp and calculates duration
   */
  async clockOut(employeeId: string, dto: ClockOutDto, companyId: string): Promise<EmployeeAttendance> {
    // Verify employee exists and belongs to company
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Find the active attendance record (no clock-out yet)
    const activeAttendance = await this.attendanceRepo.findOne({
      where: {
        employeeId,
        companyId,
        clockOutAt: IsNull(),
      },
      order: { clockInAt: 'DESC' },
    });

    if (!activeAttendance) {
      throw new ConflictException('No active clock-in found. Please clock in first.');
    }

    // Set clock out time
    const clockOutTime = new Date();
    activeAttendance.clockOutAt = clockOutTime;

    // Calculate work duration in minutes
    const durationMs = clockOutTime.getTime() - activeAttendance.clockInAt.getTime();
    const totalMinutes = Math.floor(durationMs / (1000 * 60));

    // Subtract break time if provided
    const breakMinutes = dto.breakDurationMinutes || 0;
    activeAttendance.breakDurationMinutes = breakMinutes;
    activeAttendance.workDurationMinutes = Math.max(0, totalMinutes - breakMinutes);

    // Update notes if provided
    if (dto.notes) {
      activeAttendance.notes = activeAttendance.notes 
        ? `${activeAttendance.notes}\nClock Out: ${dto.notes}`
        : dto.notes;
    }

    return await this.attendanceRepo.save(activeAttendance);
  }

  /**
   * Get attendance history for an employee
   */
  async getAttendanceHistory(
    employeeId: string,
    companyId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: EmployeeAttendance[]; total: number; page: number; limit: number }> {
    // Verify employee exists and belongs to company
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.attendanceRepo
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.store', 'store')
      .where('attendance.employeeId = :employeeId', { employeeId })
      .andWhere('attendance.companyId = :companyId', { companyId });

    if (options?.startDate) {
      queryBuilder.andWhere('attendance.clockInAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('attendance.clockInAt <= :endDate', { endDate: options.endDate });
    }

    const [data, total] = await queryBuilder
      .orderBy('attendance.clockInAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Get current active clock-in status for an employee
   */
  async getCurrentClockInStatus(employeeId: string, companyId: string): Promise<EmployeeAttendance | null> {
    // Verify employee exists and belongs to company
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const activeAttendance = await this.attendanceRepo.findOne({
      where: {
        employeeId,
        companyId,
        clockOutAt: IsNull(),
      },
      relations: ['store'],
      order: { clockInAt: 'DESC' },
    });

    return activeAttendance || null;
  }
}

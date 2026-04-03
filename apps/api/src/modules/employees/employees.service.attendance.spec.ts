import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { Employee } from './employee.entity';
import { EmployeeAttendance } from './employee-attendance.entity';
import { User } from '../users/user.entity';
import { Store } from '../stores/store.entity';
import { ClockInDto, ClockOutDto } from './dto';

describe('EmployeesService - Attendance', () => {
  let service: EmployeesService;
  let employeeRepo: Repository<Employee>;
  let attendanceRepo: Repository<EmployeeAttendance>;
  let storeRepo: Repository<Store>;

  const mockEmployee = {
    id: 'employee-1',
    companyId: 'company-1',
    name: 'John Doe',
    employeeNumber: 'EMP-20240101-0001',
    isActive: true,
    storeId: 'store-1',
  };

  const mockStore = {
    id: 'store-1',
    companyId: 'company-1',
    name: 'Main Store',
    code: 'MAIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softRemove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EmployeeAttendance),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Store),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    employeeRepo = module.get<Repository<Employee>>(getRepositoryToken(Employee));
    attendanceRepo = module.get<Repository<EmployeeAttendance>>(getRepositoryToken(EmployeeAttendance));
    storeRepo = module.get<Repository<Store>>(getRepositoryToken(Store));
  });

  describe('clockIn', () => {
    const clockInDto: ClockInDto = {
      storeId: 'store-1',
      notes: 'Starting shift',
    };

    it('should successfully clock in an employee', async () => {
      jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(mockEmployee as Employee);
      jest.spyOn(storeRepo, 'findOne').mockResolvedValue(mockStore as Store);
      jest.spyOn(attendanceRepo, 'findOne').mockResolvedValue(null); // No active clock-in

      const mockAttendance = {
        id: 'attendance-1',
        employeeId: mockEmployee.id,
        companyId: mockEmployee.companyId,
        storeId: clockInDto.storeId,
        clockInAt: new Date(),
        notes: clockInDto.notes,
      };

      jest.spyOn(attendanceRepo, 'create').mockReturnValue(mockAttendance as EmployeeAttendance);
      jest.spyOn(attendanceRepo, 'save').mockResolvedValue(mockAttendance as EmployeeAttendance);

      const result = await service.clockIn(mockEmployee.id, clockInDto, mockEmployee.companyId);

      expect(result).toEqual(mockAttendance);
      expect(employeeRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockEmployee.id, companyId: mockEmployee.companyId },
      });
      expect(attendanceRepo.create).toHaveBeenCalled();
      expect(attendanceRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if employee does not exist', async () => {
      jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.clockIn(mockEmployee.id, clockInDto, mockEmployee.companyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if employee is not active', async () => {
      const inactiveEmployee = { ...mockEmployee, isActive: false };
      jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(inactiveEmployee as Employee);

      await expect(
        service.clockIn(mockEmployee.id, clockInDto, mockEmployee.companyId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if employee is already clocked in', async () => {
      jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(mockEmployee as Employee);
      jest.spyOn(storeRepo, 'findOne').mockResolvedValue(mockStore as Store);

      const activeAttendance = {
        id: 'attendance-1',
        employeeId: mockEmployee.id,
        companyId: mockEmployee.companyId,
        clockInAt: new Date(),
        clockOutAt: null,
      };
      jest.spyOn(attendanceRepo, 'findOne').mockResolvedValue(activeAttendance as EmployeeAttendance);

      await expect(
        service.clockIn(mockEmployee.id, clockInDto, mockEmployee.companyId),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if store does not exist', async () => {
      jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(mockEmployee as Employee);
      jest.spyOn(storeRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.clockIn(mockEmployee.id, clockInDto, mockEmployee.companyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('clockOut', () => {
    const clockOutDto: ClockOutDto = {
      breakDurationMinutes: 30,
      notes: 'End of shift',
    };

    it('should successfully clock out an employee', async () => {
      const clockInTime = new Date('2024-01-01T09:00:00Z');
      const clockOutTime = new Date('2024-01-01T17:00:00Z');

      jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(mockEmployee as Employee);

      const activeAttendance = {
        id: 'attendance-1',
        employeeId: mockEmployee.id,
        companyId: mockEmployee.companyId,
        storeId: 'store-1',
        clockInAt: clockInTime,
        clockOutAt: null,
        notes: 'Starting shift',
      };

      jest.spyOn(attendanceRepo, 'findOne').mockResolvedValue(activeAttendance as EmployeeAttendance);

      // Mock Date.now() to return a specific time
      jest.spyOn(global, 'Date').mockImplementation(() => clockOutTime as any);

      const expectedWorkDuration = 480 - 30; // 8 hours - 30 min break = 450 minutes

      const updatedAttendance = {
        ...activeAttendance,
        clockOutAt: clockOutTime,
        breakDurationMinutes: 30,
        workDurationMinutes: expectedWorkDuration,
        notes: 'Starting shift\nClock Out: End of shift',
      };

      jest.spyOn(attendanceRepo, 'save').mockResolvedValue(updatedAttendance as EmployeeAttendance);

      const result = await service.clockOut(mockEmployee.id, clockOutDto, mockEmployee.companyId);

      expect(result.clockOutAt).toBeDefined();
      expect(result.breakDurationMinutes).toBe(30);
      expect(attendanceRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if employee does not exist', async () => {
      jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.clockOut(mockEmployee.id, clockOutDto, mockEmployee.companyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if no active clock-in found', async () => {
      jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(mockEmployee as Employee);
      jest.spyOn(attendanceRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.clockOut(mockEmployee.id, clockOutDto, mockEmployee.companyId),
      ).rejects.toThrow(ConflictException);
    });

    it('should calculate work duration correctly without break time', async () => {
      const clockInTime = new Date('2024-01-01T09:00:00Z');
      const clockOutTime = new Date('2024-01-01T17:00:00Z');

      jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(mockEmployee as Employee);

      const activeAttendance = {
        id: 'attendance-1',
        employeeId: mockEmployee.id,
        companyId: mockEmployee.companyId,
        storeId: 'store-1',
        clockInAt: clockInTime,
        clockOutAt: null,
      };

      jest.spyOn(attendanceRepo, 'findOne').mockResolvedValue(activeAttendance as EmployeeAttendance);
      jest.spyOn(global, 'Date').mockImplementation(() => clockOutTime as any);

      const updatedAttendance = {
        ...activeAttendance,
        clockOutAt: clockOutTime,
        breakDurationMinutes: 0,
        workDurationMinutes: 480, // 8 hours
      };

      jest.spyOn(attendanceRepo, 'save').mockResolvedValue(updatedAttendance as EmployeeAttendance);

      const result = await service.clockOut(mockEmployee.id, {}, mockEmployee.companyId);

      expect(result.breakDurationMinutes).toBe(0);
      expect(attendanceRepo.save).toHaveBeenCalled();
    });
  });

  describe('getAttendanceHistory', () => {
    it('should return attendance history for an employee', async () => {
      jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(mockEmployee as Employee);

      const mockAttendanceRecords = [
        {
          id: 'attendance-1',
          employeeId: mockEmployee.id,
          clockInAt: new Date('2024-01-01T09:00:00Z'),
          clockOutAt: new Date('2024-01-01T17:00:00Z'),
          workDurationMinutes: 480,
        },
        {
          id: 'attendance-2',
          employeeId: mockEmployee.id,
          clockInAt: new Date('2024-01-02T09:00:00Z'),
          clockOutAt: new Date('2024-01-02T17:00:00Z'),
          workDurationMinutes: 480,
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockAttendanceRecords, 2]),
      };

      jest.spyOn(attendanceRepo, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getAttendanceHistory(mockEmployee.id, mockEmployee.companyId, {
        page: 1,
        limit: 50,
      });

      expect(result.data).toEqual(mockAttendanceRecords);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should throw NotFoundException if employee does not exist', async () => {
      jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.getAttendanceHistory(mockEmployee.id, mockEmployee.companyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCurrentClockInStatus', () => {
    it('should return active clock-in status', async () => {
      jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(mockEmployee as Employee);

      const activeAttendance = {
        id: 'attendance-1',
        employeeId: mockEmployee.id,
        companyId: mockEmployee.companyId,
        clockInAt: new Date(),
        clockOutAt: null,
      };

      jest.spyOn(attendanceRepo, 'findOne').mockResolvedValue(activeAttendance as EmployeeAttendance);

      const result = await service.getCurrentClockInStatus(mockEmployee.id, mockEmployee.companyId);

      expect(result).toEqual(activeAttendance);
    });

    it('should return null if no active clock-in', async () => {
      jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(mockEmployee as Employee);
      jest.spyOn(attendanceRepo, 'findOne').mockResolvedValue(null);

      const result = await service.getCurrentClockInStatus(mockEmployee.id, mockEmployee.companyId);

      expect(result).toBeNull();
    });

    it('should throw NotFoundException if employee does not exist', async () => {
      jest.spyOn(employeeRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.getCurrentClockInStatus(mockEmployee.id, mockEmployee.companyId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

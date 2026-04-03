import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto, LinkUserDto, CreateUserAccountDto, ClockInDto, ClockOutDto } from './dto';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let service: EmployeesService;

  const mockEmployeesService = {
    create: jest.fn(),
    findAllByCompany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    linkToUser: jest.fn(),
    createUserAccount: jest.fn(),
    clockIn: jest.fn(),
    clockOut: jest.fn(),
    getAttendanceHistory: jest.fn(),
    getCurrentClockInStatus: jest.fn(),
  };

  const mockRequest = {
    user: {
      companyId: 'company-123',
      userId: 'user-123',
      role: 'admin',
    },
  };

  const mockEmployee = {
    id: 'employee-123',
    companyId: 'company-123',
    storeId: 'store-123',
    userId: null,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '08123456789',
    employeeNumber: 'EMP-20240101-0001',
    position: 'Cashier',
    hireDate: new Date('2024-01-01'),
    salary: 5000000,
    avatarUrl: null,
    pin: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAttendance = {
    id: 'attendance-123',
    employeeId: 'employee-123',
    companyId: 'company-123',
    storeId: 'store-123',
    clockInAt: new Date(),
    clockOutAt: null,
    workDurationMinutes: null,
    breakDurationMinutes: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        {
          provide: EmployeesService,
          useValue: mockEmployeesService,
        },
      ],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
    service = module.get<EmployeesService>(EmployeesService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new employee', async () => {
      const dto: CreateEmployeeDto = {
        storeId: 'store-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '08123456789',
        position: 'Cashier',
        hireDate: '2024-01-01',
        salary: 5000000,
      };

      mockEmployeesService.create.mockResolvedValue(mockEmployee);

      const result = await controller.create(dto, mockRequest);

      expect(result).toEqual(mockEmployee);
      expect(service.create).toHaveBeenCalledWith('company-123', dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated employees', async () => {
      const mockResponse = {
        data: [mockEmployee],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockEmployeesService.findAllByCompany.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.findAllByCompany).toHaveBeenCalledWith('company-123', {
        storeId: undefined,
        page: undefined,
        limit: undefined,
        search: undefined,
        isActive: undefined,
      });
    });

    it('should filter employees by store', async () => {
      const mockResponse = {
        data: [mockEmployee],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockEmployeesService.findAllByCompany.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockRequest, 'store-123');

      expect(result).toEqual(mockResponse);
      expect(service.findAllByCompany).toHaveBeenCalledWith('company-123', {
        storeId: 'store-123',
        page: undefined,
        limit: undefined,
        search: undefined,
        isActive: undefined,
      });
    });

    it('should support pagination', async () => {
      const mockResponse = {
        data: [mockEmployee],
        total: 1,
        page: 2,
        limit: 10,
      };

      mockEmployeesService.findAllByCompany.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockRequest, undefined, 2, 10);

      expect(result).toEqual(mockResponse);
      expect(service.findAllByCompany).toHaveBeenCalledWith('company-123', {
        storeId: undefined,
        page: 2,
        limit: 10,
        search: undefined,
        isActive: undefined,
      });
    });

    it('should support search', async () => {
      const mockResponse = {
        data: [mockEmployee],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockEmployeesService.findAllByCompany.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockRequest, undefined, undefined, undefined, 'John');

      expect(result).toEqual(mockResponse);
      expect(service.findAllByCompany).toHaveBeenCalledWith('company-123', {
        storeId: undefined,
        page: undefined,
        limit: undefined,
        search: 'John',
        isActive: undefined,
      });
    });

    it('should filter by active status', async () => {
      const mockResponse = {
        data: [mockEmployee],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockEmployeesService.findAllByCompany.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockRequest, undefined, undefined, undefined, undefined, true);

      expect(result).toEqual(mockResponse);
      expect(service.findAllByCompany).toHaveBeenCalledWith('company-123', {
        storeId: undefined,
        page: undefined,
        limit: undefined,
        search: undefined,
        isActive: true,
      });
    });
  });

  describe('findOne', () => {
    it('should return a single employee', async () => {
      mockEmployeesService.findOne.mockResolvedValue(mockEmployee);

      const result = await controller.findOne('employee-123', mockRequest);

      expect(result).toEqual(mockEmployee);
      expect(service.findOne).toHaveBeenCalledWith('employee-123', 'company-123');
    });
  });

  describe('update', () => {
    it('should update an employee', async () => {
      const dto: UpdateEmployeeDto = {
        name: 'John Updated',
        position: 'Senior Cashier',
      };

      const updatedEmployee = { ...mockEmployee, ...dto };
      mockEmployeesService.update.mockResolvedValue(updatedEmployee);

      const result = await controller.update('employee-123', dto, mockRequest);

      expect(result).toEqual(updatedEmployee);
      expect(service.update).toHaveBeenCalledWith('employee-123', dto, 'company-123');
    });
  });

  describe('remove', () => {
    it('should delete an employee', async () => {
      mockEmployeesService.remove.mockResolvedValue(undefined);

      await controller.remove('employee-123', mockRequest);

      expect(service.remove).toHaveBeenCalledWith('employee-123', 'company-123');
    });
  });

  describe('linkToUser', () => {
    it('should link employee to user', async () => {
      const dto: LinkUserDto = {
        userId: 'user-456',
      };

      const linkedEmployee = { ...mockEmployee, userId: 'user-456' };
      mockEmployeesService.linkToUser.mockResolvedValue(linkedEmployee);

      const result = await controller.linkToUser('employee-123', dto, mockRequest);

      expect(result).toEqual(linkedEmployee);
      expect(service.linkToUser).toHaveBeenCalledWith('employee-123', 'user-456', 'company-123');
    });
  });

  describe('createUserAccount', () => {
    it('should create user account for employee', async () => {
      const dto: CreateUserAccountDto = {
        email: 'john@example.com',
        password: 'password123',
        role: 'manager',
      };

      const mockUser = {
        id: 'user-456',
        companyId: 'company-123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'manager',
      };

      const response = {
        employee: { ...mockEmployee, userId: 'user-456' },
        user: mockUser,
      };

      mockEmployeesService.createUserAccount.mockResolvedValue(response);

      const result = await controller.createUserAccount('employee-123', dto, mockRequest);

      expect(result).toEqual(response);
      expect(service.createUserAccount).toHaveBeenCalledWith('employee-123', dto, 'company-123');
    });
  });

  describe('clockIn', () => {
    it('should clock in employee', async () => {
      const dto: ClockInDto = {
        storeId: 'store-123',
        notes: 'Morning shift',
      };

      mockEmployeesService.clockIn.mockResolvedValue(mockAttendance);

      const result = await controller.clockIn('employee-123', dto, mockRequest);

      expect(result).toEqual(mockAttendance);
      expect(service.clockIn).toHaveBeenCalledWith('employee-123', dto, 'company-123');
    });
  });

  describe('clockOut', () => {
    it('should clock out employee', async () => {
      const dto: ClockOutDto = {
        breakDurationMinutes: 60,
        notes: 'End of shift',
      };

      const clockedOutAttendance = {
        ...mockAttendance,
        clockOutAt: new Date(),
        workDurationMinutes: 480,
        breakDurationMinutes: 60,
      };

      mockEmployeesService.clockOut.mockResolvedValue(clockedOutAttendance);

      const result = await controller.clockOut('employee-123', dto, mockRequest);

      expect(result).toEqual(clockedOutAttendance);
      expect(service.clockOut).toHaveBeenCalledWith('employee-123', dto, 'company-123');
    });
  });

  describe('getAttendanceHistory', () => {
    it('should return attendance history', async () => {
      const mockHistory = {
        data: [mockAttendance],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockEmployeesService.getAttendanceHistory.mockResolvedValue(mockHistory);

      const result = await controller.getAttendanceHistory('employee-123', mockRequest);

      expect(result).toEqual(mockHistory);
      expect(service.getAttendanceHistory).toHaveBeenCalledWith('employee-123', 'company-123', {
        startDate: undefined,
        endDate: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should filter by date range', async () => {
      const mockHistory = {
        data: [mockAttendance],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockEmployeesService.getAttendanceHistory.mockResolvedValue(mockHistory);

      const result = await controller.getAttendanceHistory(
        'employee-123',
        mockRequest,
        '2024-01-01',
        '2024-01-31',
      );

      expect(result).toEqual(mockHistory);
      expect(service.getAttendanceHistory).toHaveBeenCalledWith('employee-123', 'company-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        page: undefined,
        limit: undefined,
      });
    });

    it('should support pagination', async () => {
      const mockHistory = {
        data: [mockAttendance],
        total: 1,
        page: 2,
        limit: 10,
      };

      mockEmployeesService.getAttendanceHistory.mockResolvedValue(mockHistory);

      const result = await controller.getAttendanceHistory(
        'employee-123',
        mockRequest,
        undefined,
        undefined,
        2,
        10,
      );

      expect(result).toEqual(mockHistory);
      expect(service.getAttendanceHistory).toHaveBeenCalledWith('employee-123', 'company-123', {
        startDate: undefined,
        endDate: undefined,
        page: 2,
        limit: 10,
      });
    });
  });

  describe('getCurrentClockInStatus', () => {
    it('should return current clock-in status', async () => {
      mockEmployeesService.getCurrentClockInStatus.mockResolvedValue(mockAttendance);

      const result = await controller.getCurrentClockInStatus('employee-123', mockRequest);

      expect(result).toEqual(mockAttendance);
      expect(service.getCurrentClockInStatus).toHaveBeenCalledWith('employee-123', 'company-123');
    });

    it('should return null if no active clock-in', async () => {
      mockEmployeesService.getCurrentClockInStatus.mockResolvedValue(null);

      const result = await controller.getCurrentClockInStatus('employee-123', mockRequest);

      expect(result).toBeNull();
      expect(service.getCurrentClockInStatus).toHaveBeenCalledWith('employee-123', 'company-123');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { AuditService, AuditLogData } from './audit.service';
import { AuditLog } from './audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;
  let repository: Repository<AuditLog>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    repository = module.get<Repository<AuditLog>>(
      getRepositoryToken(AuditLog),
    );

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create and save an audit log', async () => {
      const logData: AuditLogData = {
        companyId: 'company-123',
        action: 'user.login',
        entityType: 'user',
        entityId: 'user-123',
        description: 'User logged in',
        userId: 'user-123',
        userType: 'user',
        ipAddress: '192.168.1.1',
        metadata: { browser: 'Chrome' },
      };

      const mockLog = { id: 'log-123', ...logData };

      mockRepository.create.mockReturnValue(mockLog);
      mockRepository.save.mockResolvedValue(mockLog);

      const result = await service.log(logData);

      expect(mockRepository.create).toHaveBeenCalledWith(logData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockLog);
      expect(result).toEqual(mockLog);
    });

    it('should create audit log with minimal data', async () => {
      const logData: AuditLogData = {
        action: 'system.startup',
        entityType: 'system',
      };

      const mockLog = { id: 'log-124', ...logData };

      mockRepository.create.mockReturnValue(mockLog);
      mockRepository.save.mockResolvedValue(mockLog);

      const result = await service.log(logData);

      expect(result).toEqual(mockLog);
    });

    it('should capture old and new values', async () => {
      const logData: AuditLogData = {
        companyId: 'company-123',
        action: 'product.updated',
        entityType: 'product',
        entityId: 'product-123',
        oldValues: { price: 100, name: 'Old Product' },
        newValues: { price: 150, name: 'New Product' },
        userId: 'user-123',
      };

      const mockLog = { id: 'log-125', ...logData };

      mockRepository.create.mockReturnValue(mockLog);
      mockRepository.save.mockResolvedValue(mockLog);

      const result = await service.log(logData);

      expect(result.oldValues).toEqual({ price: 100, name: 'Old Product' });
      expect(result.newValues).toEqual({ price: 150, name: 'New Product' });
    });
  });

  describe('findByEntity', () => {
    it('should find logs by entity type and ID', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          entityType: 'product',
          entityId: 'product-123',
          action: 'product.created',
        },
        {
          id: 'log-2',
          entityType: 'product',
          entityId: 'product-123',
          action: 'product.updated',
        },
      ];

      mockRepository.find.mockResolvedValue(mockLogs);

      const result = await service.findByEntity('product', 'product-123');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { entityType: 'product', entityId: 'product-123' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findByUser', () => {
    it('should find logs by user ID with default limit', async () => {
      const mockLogs = [
        { id: 'log-1', userId: 'user-123', action: 'user.login' },
        { id: 'log-2', userId: 'user-123', action: 'product.created' },
      ];

      mockRepository.find.mockResolvedValue(mockLogs);

      const result = await service.findByUser('user-123');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
        take: 50,
      });
      expect(result).toEqual(mockLogs);
    });

    it('should find logs by user ID with custom limit', async () => {
      const mockLogs = [{ id: 'log-1', userId: 'user-123' }];

      mockRepository.find.mockResolvedValue(mockLogs);

      await service.findByUser('user-123', 10);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
        take: 10,
      });
    });
  });

  describe('findRecent', () => {
    it('should find recent logs with default limit', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'user.login' },
        { id: 'log-2', action: 'product.created' },
      ];

      mockRepository.find.mockResolvedValue(mockLogs);

      const result = await service.findRecent();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 100,
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findByCompany', () => {
    it('should find logs by company with pagination', async () => {
      const mockLogs = [
        { id: 'log-1', companyId: 'company-123' },
        { id: 'log-2', companyId: 'company-123' },
      ];

      mockRepository.findAndCount.mockResolvedValue([mockLogs, 2]);

      const result = await service.findByCompany('company-123', {
        page: 1,
        limit: 50,
      });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { companyId: 'company-123' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 50,
      });
      expect(result).toEqual({
        data: mockLogs,
        total: 2,
        page: 1,
        limit: 50,
      });
    });

    it('should filter by action', async () => {
      const mockLogs = [{ id: 'log-1', action: 'user.login' }];

      mockRepository.findAndCount.mockResolvedValue([mockLogs, 1]);

      await service.findByCompany('company-123', {
        action: 'user.login',
      });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { companyId: 'company-123', action: 'user.login' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 50,
      });
    });

    it('should filter by entity type', async () => {
      const mockLogs = [{ id: 'log-1', entityType: 'product' }];

      mockRepository.findAndCount.mockResolvedValue([mockLogs, 1]);

      await service.findByCompany('company-123', {
        entityType: 'product',
      });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { companyId: 'company-123', entityType: 'product' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 50,
      });
    });

    it('should filter by user ID', async () => {
      const mockLogs = [{ id: 'log-1', userId: 'user-123' }];

      mockRepository.findAndCount.mockResolvedValue([mockLogs, 1]);

      await service.findByCompany('company-123', {
        userId: 'user-123',
      });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { companyId: 'company-123', userId: 'user-123' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 50,
      });
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-12-31');
      const mockLogs = [{ id: 'log-1' }];

      mockRepository.findAndCount.mockResolvedValue([mockLogs, 1]);

      await service.findByCompany('company-123', {
        dateFrom,
        dateTo,
      });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          companyId: 'company-123',
          createdAt: Between(dateFrom, dateTo),
        },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 50,
      });
    });

    it('should handle pagination correctly', async () => {
      const mockLogs = [{ id: 'log-1' }];

      mockRepository.findAndCount.mockResolvedValue([mockLogs, 100]);

      const result = await service.findByCompany('company-123', {
        page: 3,
        limit: 20,
      });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { companyId: 'company-123' },
        order: { createdAt: 'DESC' },
        skip: 40, // (3-1) * 20
        take: 20,
      });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
    });
  });

  describe('findByDateRange', () => {
    it('should find logs within date range', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-12-31');
      const mockLogs = [{ id: 'log-1' }, { id: 'log-2' }];

      mockRepository.find.mockResolvedValue(mockLogs);

      const result = await service.findByDateRange(
        'company-123',
        dateFrom,
        dateTo,
      );

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          companyId: 'company-123',
          createdAt: Between(dateFrom, dateTo),
        },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findByAction', () => {
    it('should find logs by action', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'user.login' },
        { id: 'log-2', action: 'user.login' },
      ];

      mockRepository.find.mockResolvedValue(mockLogs);

      const result = await service.findByAction('company-123', 'user.login');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { companyId: 'company-123', action: 'user.login' },
        order: { createdAt: 'DESC' },
        take: 100,
      });
      expect(result).toEqual(mockLogs);
    });

    it('should respect custom limit', async () => {
      const mockLogs = [{ id: 'log-1' }];

      mockRepository.find.mockResolvedValue(mockLogs);

      await service.findByAction('company-123', 'user.login', 25);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { companyId: 'company-123', action: 'user.login' },
        order: { createdAt: 'DESC' },
        take: 25,
      });
    });
  });

  describe('findByEntityType', () => {
    it('should find logs by entity type', async () => {
      const mockLogs = [
        { id: 'log-1', entityType: 'product' },
        { id: 'log-2', entityType: 'product' },
      ];

      mockRepository.find.mockResolvedValue(mockLogs);

      const result = await service.findByEntityType('company-123', 'product');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { companyId: 'company-123', entityType: 'product' },
        order: { createdAt: 'DESC' },
        take: 100,
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findByActions', () => {
    it('should find logs by multiple actions', async () => {
      const actions = ['user.login', 'user.logout'];
      const mockLogs = [
        { id: 'log-1', action: 'user.login' },
        { id: 'log-2', action: 'user.logout' },
      ];

      mockRepository.find.mockResolvedValue(mockLogs);

      const result = await service.findByActions('company-123', actions);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          companyId: 'company-123',
          action: In(actions),
        },
        order: { createdAt: 'DESC' },
        take: 100,
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should only return logs for specified company', async () => {
      const mockLogs = [
        { id: 'log-1', companyId: 'company-123' },
        { id: 'log-2', companyId: 'company-123' },
      ];

      mockRepository.findAndCount.mockResolvedValue([mockLogs, 2]);

      await service.findByCompany('company-123');

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 'company-123' }),
        }),
      );
    });

    it('should not return logs from other companies', async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findByCompany('company-456');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});

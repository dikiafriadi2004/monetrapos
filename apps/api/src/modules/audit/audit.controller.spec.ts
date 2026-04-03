import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLog } from './audit-log.entity';

describe('AuditController', () => {
  let controller: AuditController;
  let service: AuditService;

  const mockAuditService = {
    findByCompany: jest.fn(),
    findByEntity: jest.fn(),
    findByUser: jest.fn(),
    findByAction: jest.fn(),
    findByEntityType: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: 'user-123',
      companyId: 'company-123',
      email: 'test@example.com',
    },
  };

  const mockAuditLog: Partial<AuditLog> = {
    id: 'log-123',
    companyId: 'company-123',
    action: 'user.login',
    entityType: 'user',
    entityId: 'user-123',
    description: 'User logged in',
    userId: 'user-123',
    ipAddress: '127.0.0.1',
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getLogs', () => {
    it('should return paginated audit logs with default pagination', async () => {
      const mockResult = {
        data: [mockAuditLog as AuditLog],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockAuditService.findByCompany.mockResolvedValue(mockResult);

      const result = await controller.getLogs(mockRequest);

      expect(result).toEqual(mockResult);
      expect(service.findByCompany).toHaveBeenCalledWith('company-123', {
        page: 1,
        limit: 50,
      });
    });

    it('should return paginated audit logs with custom pagination', async () => {
      const mockResult = {
        data: [mockAuditLog as AuditLog],
        total: 100,
        page: 2,
        limit: 25,
      };

      mockAuditService.findByCompany.mockResolvedValue(mockResult);

      const result = await controller.getLogs(mockRequest, '2', '25');

      expect(result).toEqual(mockResult);
      expect(service.findByCompany).toHaveBeenCalledWith('company-123', {
        page: 2,
        limit: 25,
      });
    });

    it('should filter by action', async () => {
      const mockResult = {
        data: [mockAuditLog as AuditLog],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockAuditService.findByCompany.mockResolvedValue(mockResult);

      const result = await controller.getLogs(
        mockRequest,
        undefined,
        undefined,
        'user.login',
      );

      expect(result).toEqual(mockResult);
      expect(service.findByCompany).toHaveBeenCalledWith('company-123', {
        page: 1,
        limit: 50,
        action: 'user.login',
      });
    });

    it('should filter by entityType', async () => {
      const mockResult = {
        data: [mockAuditLog as AuditLog],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockAuditService.findByCompany.mockResolvedValue(mockResult);

      const result = await controller.getLogs(
        mockRequest,
        undefined,
        undefined,
        undefined,
        'product',
      );

      expect(result).toEqual(mockResult);
      expect(service.findByCompany).toHaveBeenCalledWith('company-123', {
        page: 1,
        limit: 50,
        entityType: 'product',
      });
    });

    it('should filter by userId', async () => {
      const mockResult = {
        data: [mockAuditLog as AuditLog],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockAuditService.findByCompany.mockResolvedValue(mockResult);

      const result = await controller.getLogs(
        mockRequest,
        undefined,
        undefined,
        undefined,
        undefined,
        'user-456',
      );

      expect(result).toEqual(mockResult);
      expect(service.findByCompany).toHaveBeenCalledWith('company-123', {
        page: 1,
        limit: 50,
        userId: 'user-456',
      });
    });

    it('should filter by date range', async () => {
      const mockResult = {
        data: [mockAuditLog as AuditLog],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockAuditService.findByCompany.mockResolvedValue(mockResult);

      const result = await controller.getLogs(
        mockRequest,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '2024-01-01',
        '2024-12-31',
      );

      expect(result).toEqual(mockResult);
      expect(service.findByCompany).toHaveBeenCalledWith('company-123', {
        page: 1,
        limit: 50,
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-12-31'),
      });
    });

    it('should apply multiple filters', async () => {
      const mockResult = {
        data: [mockAuditLog as AuditLog],
        total: 1,
        page: 2,
        limit: 25,
      };

      mockAuditService.findByCompany.mockResolvedValue(mockResult);

      const result = await controller.getLogs(
        mockRequest,
        '2',
        '25',
        'product.update',
        'product',
        'user-456',
        '2024-01-01',
        '2024-12-31',
      );

      expect(result).toEqual(mockResult);
      expect(service.findByCompany).toHaveBeenCalledWith('company-123', {
        page: 2,
        limit: 25,
        action: 'product.update',
        entityType: 'product',
        userId: 'user-456',
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-12-31'),
      });
    });
  });

  describe('getEntityLogs', () => {
    it('should return audit logs for specific entity', async () => {
      const mockLogs = [mockAuditLog as AuditLog];
      mockAuditService.findByEntity.mockResolvedValue(mockLogs);

      const result = await controller.getEntityLogs(
        mockRequest,
        'product',
        'product-123',
      );

      expect(result).toEqual(mockLogs);
      expect(service.findByEntity).toHaveBeenCalledWith(
        'product',
        'product-123',
      );
    });
  });

  describe('getUserLogs', () => {
    it('should return audit logs for specific user with default limit', async () => {
      const mockLogs = [mockAuditLog as AuditLog];
      mockAuditService.findByUser.mockResolvedValue(mockLogs);

      const result = await controller.getUserLogs(mockRequest, 'user-456');

      expect(result).toEqual(mockLogs);
      expect(service.findByUser).toHaveBeenCalledWith('user-456', 50);
    });

    it('should return audit logs for specific user with custom limit', async () => {
      const mockLogs = [mockAuditLog as AuditLog];
      mockAuditService.findByUser.mockResolvedValue(mockLogs);

      const result = await controller.getUserLogs(
        mockRequest,
        'user-456',
        '100',
      );

      expect(result).toEqual(mockLogs);
      expect(service.findByUser).toHaveBeenCalledWith('user-456', 100);
    });
  });

  describe('getRecentLogs', () => {
    it('should return recent logs with default limit', async () => {
      const mockResult = {
        data: [mockAuditLog as AuditLog],
        total: 1,
        page: 1,
        limit: 100,
      };

      mockAuditService.findByCompany.mockResolvedValue(mockResult);

      const result = await controller.getRecentLogs(mockRequest);

      expect(result).toEqual([mockAuditLog]);
      expect(service.findByCompany).toHaveBeenCalledWith('company-123', {
        limit: 100,
      });
    });

    it('should return recent logs with custom limit', async () => {
      const mockResult = {
        data: [mockAuditLog as AuditLog],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockAuditService.findByCompany.mockResolvedValue(mockResult);

      const result = await controller.getRecentLogs(mockRequest, '50');

      expect(result).toEqual([mockAuditLog]);
      expect(service.findByCompany).toHaveBeenCalledWith('company-123', {
        limit: 50,
      });
    });
  });

  describe('getLogsByAction', () => {
    it('should return logs filtered by action with default limit', async () => {
      const mockLogs = [mockAuditLog as AuditLog];
      mockAuditService.findByAction.mockResolvedValue(mockLogs);

      const result = await controller.getLogsByAction(
        mockRequest,
        'user.login',
      );

      expect(result).toEqual(mockLogs);
      expect(service.findByAction).toHaveBeenCalledWith(
        'company-123',
        'user.login',
        100,
      );
    });

    it('should return logs filtered by action with custom limit', async () => {
      const mockLogs = [mockAuditLog as AuditLog];
      mockAuditService.findByAction.mockResolvedValue(mockLogs);

      const result = await controller.getLogsByAction(
        mockRequest,
        'user.login',
        '50',
      );

      expect(result).toEqual(mockLogs);
      expect(service.findByAction).toHaveBeenCalledWith(
        'company-123',
        'user.login',
        50,
      );
    });
  });

  describe('getLogsByEntityType', () => {
    it('should return logs filtered by entity type with default limit', async () => {
      const mockLogs = [mockAuditLog as AuditLog];
      mockAuditService.findByEntityType.mockResolvedValue(mockLogs);

      const result = await controller.getLogsByEntityType(
        mockRequest,
        'product',
      );

      expect(result).toEqual(mockLogs);
      expect(service.findByEntityType).toHaveBeenCalledWith(
        'company-123',
        'product',
        100,
      );
    });

    it('should return logs filtered by entity type with custom limit', async () => {
      const mockLogs = [mockAuditLog as AuditLog];
      mockAuditService.findByEntityType.mockResolvedValue(mockLogs);

      const result = await controller.getLogsByEntityType(
        mockRequest,
        'product',
        '50',
      );

      expect(result).toEqual(mockLogs);
      expect(service.findByEntityType).toHaveBeenCalledWith(
        'company-123',
        'product',
        50,
      );
    });
  });
});

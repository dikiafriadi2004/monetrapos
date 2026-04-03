import { Test, TestingModule } from '@nestjs/testing';
import { TenantMiddleware } from './tenant.middleware';
import { Request, Response, NextFunction } from 'express';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantMiddleware],
    }).compile();

    middleware = module.get<TenantMiddleware>(TenantMiddleware);

    mockRequest = {} as Partial<Request>;
    mockResponse = {} as Partial<Response>;
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should extract companyId from JWT user and attach to request', () => {
    (mockRequest as any).user = {
      id: 'user-123',
      email: 'test@example.com',
      companyId: 'company-456',
      role: 'owner',
    };

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect((mockRequest as any).companyId).toBe('company-456');
    expect((mockRequest as any).tenantId).toBe('company-456');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should not attach companyId when user is not present', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect((mockRequest as any).companyId).toBeUndefined();
    expect((mockRequest as any).tenantId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should not attach companyId when user has no companyId', () => {
    (mockRequest as any).user = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'admin',
    };

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect((mockRequest as any).companyId).toBeUndefined();
    expect((mockRequest as any).tenantId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle employee user with companyId', () => {
    (mockRequest as any).user = {
      id: 'employee-123',
      email: 'employee@example.com',
      companyId: 'company-789',
      storeId: 'store-001',
      type: 'employee',
    };

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect((mockRequest as any).companyId).toBe('company-789');
    expect((mockRequest as any).tenantId).toBe('company-789');
    expect(mockNext).toHaveBeenCalled();
  });
});

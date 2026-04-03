import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  AddPointsDto,
  RedeemPointsDto,
} from './dto';

describe('CustomersController', () => {
  let controller: CustomersController;
  let service: CustomersService;

  const mockCustomersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addPoints: jest.fn(),
    redeemPoints: jest.fn(),
    getPurchaseHistory: jest.fn(),
    getLoyaltyPointHistory: jest.fn(),
  };

  const mockRequest = {
    user: {
      userId: 'user-123',
      companyId: 'company-123',
      email: 'test@example.com',
    },
  };

  const mockCustomer = {
    id: 'customer-123',
    companyId: 'company-123',
    customerNumber: 'CUST-20260328-0001',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '081234567890',
    address: 'Jl. Sudirman No. 123',
    city: 'Jakarta',
    postalCode: '12345',
    storeId: 'store-123',
    loyaltyPoints: 100,
    loyaltyTier: 'silver',
    totalSpent: 5000000,
    totalOrders: 10,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-03-28'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    service = module.get<CustomersService>(CustomersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /customers', () => {
    it('should create a new customer', async () => {
      const dto: CreateCustomerDto = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '081234567890',
        address: 'Jl. Sudirman No. 123',
        city: 'Jakarta',
        postalCode: '12345',
        storeId: 'store-123',
      };

      mockCustomersService.create.mockResolvedValue(mockCustomer);

      const result = await controller.create(mockRequest, dto);

      expect(result).toEqual(mockCustomer);
      expect(service.create).toHaveBeenCalledWith(dto, 'company-123');
    });

    it('should create customer with minimal required fields', async () => {
      const dto: CreateCustomerDto = {
        name: 'Jane Doe',
        storeId: 'store-123',
      };

      const minimalCustomer = {
        ...mockCustomer,
        name: 'Jane Doe',
        email: null,
        phone: null,
      };

      mockCustomersService.create.mockResolvedValue(minimalCustomer);

      const result = await controller.create(mockRequest, dto);

      expect(result).toEqual(minimalCustomer);
      expect(service.create).toHaveBeenCalledWith(dto, 'company-123');
    });
  });

  describe('GET /customers', () => {
    it('should get all customers with pagination', async () => {
      const mockResponse = {
        data: [mockCustomer],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockCustomersService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockRequest, undefined, 1, 50);

      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith('company-123', {
        storeId: undefined,
        page: 1,
        limit: 50,
        search: undefined,
      });
    });

    it('should filter customers by store', async () => {
      const mockResponse = {
        data: [mockCustomer],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockCustomersService.findAll.mockResolvedValue(mockResponse);

      await controller.findAll(mockRequest, 'store-123', 1, 50);

      expect(service.findAll).toHaveBeenCalledWith('company-123', {
        storeId: 'store-123',
        page: 1,
        limit: 50,
        search: undefined,
      });
    });

    it('should search customers by name, phone, email, or customer number', async () => {
      const mockResponse = {
        data: [mockCustomer],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockCustomersService.findAll.mockResolvedValue(mockResponse);

      await controller.findAll(mockRequest, undefined, 1, 50, 'John');

      expect(service.findAll).toHaveBeenCalledWith('company-123', {
        storeId: undefined,
        page: 1,
        limit: 50,
        search: 'John',
      });
    });

    it('should use default pagination values', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
      };

      mockCustomersService.findAll.mockResolvedValue(mockResponse);

      await controller.findAll(mockRequest);

      expect(service.findAll).toHaveBeenCalledWith('company-123', {
        storeId: undefined,
        page: undefined,
        limit: undefined,
        search: undefined,
      });
    });
  });

  describe('GET /customers/:id', () => {
    it('should get customer by ID', async () => {
      mockCustomersService.findOne.mockResolvedValue(mockCustomer);

      const result = await controller.findOne('customer-123', mockRequest);

      expect(result).toEqual(mockCustomer);
      expect(service.findOne).toHaveBeenCalledWith(
        'customer-123',
        'company-123',
      );
    });

    it('should throw NotFoundException for non-existent customer', async () => {
      mockCustomersService.findOne.mockRejectedValue(
        new Error('Customer not found'),
      );

      await expect(
        controller.findOne('non-existent', mockRequest),
      ).rejects.toThrow('Customer not found');
    });
  });

  describe('PATCH /customers/:id', () => {
    it('should update customer', async () => {
      const dto: UpdateCustomerDto = {
        name: 'John Updated',
        phone: '081234567899',
      };

      const updatedCustomer = {
        ...mockCustomer,
        name: 'John Updated',
        phone: '081234567899',
      };

      mockCustomersService.update.mockResolvedValue(updatedCustomer);

      const result = await controller.update('customer-123', mockRequest, dto);

      expect(result).toEqual(updatedCustomer);
      expect(service.update).toHaveBeenCalledWith(
        'customer-123',
        'company-123',
        dto,
      );
    });

    it('should update customer status', async () => {
      const dto: UpdateCustomerDto = {
        isActive: false,
      };

      mockCustomersService.update.mockResolvedValue({
        ...mockCustomer,
        isActive: false,
      });

      await controller.update('customer-123', mockRequest, dto);

      expect(service.update).toHaveBeenCalledWith(
        'customer-123',
        'company-123',
        dto,
      );
    });
  });

  describe('DELETE /customers/:id', () => {
    it('should soft delete customer', async () => {
      mockCustomersService.remove.mockResolvedValue(undefined);

      await controller.remove('customer-123', mockRequest);

      expect(service.remove).toHaveBeenCalledWith(
        'customer-123',
        'company-123',
      );
    });
  });

  describe('POST /customers/loyalty/add-points', () => {
    it('should add loyalty points to customer', async () => {
      const dto: AddPointsDto = {
        customerId: 'customer-123',
        points: 50,
        amount: 500000,
        description: 'Purchase reward',
        referenceType: 'transaction',
        referenceId: 'tx-123',
      };

      const updatedCustomer = {
        ...mockCustomer,
        loyaltyPoints: 150,
        totalSpent: 5500000,
        totalOrders: 11,
      };

      mockCustomersService.addPoints.mockResolvedValue(updatedCustomer);

      const result = await controller.addPoints(mockRequest, dto);

      expect(result).toEqual(updatedCustomer);
      expect(service.addPoints).toHaveBeenCalledWith(
        'customer-123',
        'company-123',
        dto,
        'user-123',
      );
    });

    it('should add points without transaction reference', async () => {
      const dto: AddPointsDto = {
        customerId: 'customer-123',
        points: 25,
        description: 'Manual adjustment',
      };

      mockCustomersService.addPoints.mockResolvedValue({
        ...mockCustomer,
        loyaltyPoints: 125,
      });

      await controller.addPoints(mockRequest, dto);

      expect(service.addPoints).toHaveBeenCalledWith(
        'customer-123',
        'company-123',
        dto,
        'user-123',
      );
    });

    it('should track performed by user from JWT', async () => {
      const dto: AddPointsDto = {
        customerId: 'customer-123',
        points: 10,
      };

      mockCustomersService.addPoints.mockResolvedValue(mockCustomer);

      await controller.addPoints(mockRequest, dto);

      expect(service.addPoints).toHaveBeenCalledWith(
        'customer-123',
        'company-123',
        dto,
        'user-123', // performedBy from JWT
      );
    });
  });

  describe('POST /customers/loyalty/redeem-points', () => {
    it('should redeem loyalty points from customer', async () => {
      const dto: RedeemPointsDto = {
        customerId: 'customer-123',
        points: 50,
        description: 'Discount redemption',
        referenceType: 'transaction',
        referenceId: 'tx-456',
      };

      const updatedCustomer = {
        ...mockCustomer,
        loyaltyPoints: 50,
      };

      mockCustomersService.redeemPoints.mockResolvedValue(updatedCustomer);

      const result = await controller.redeemPoints(mockRequest, dto);

      expect(result).toEqual(updatedCustomer);
      expect(service.redeemPoints).toHaveBeenCalledWith(
        'customer-123',
        'company-123',
        dto,
        'user-123',
      );
    });

    it('should throw error if insufficient points', async () => {
      const dto: RedeemPointsDto = {
        customerId: 'customer-123',
        points: 200,
      };

      mockCustomersService.redeemPoints.mockRejectedValue(
        new Error('Insufficient points'),
      );

      await expect(controller.redeemPoints(mockRequest, dto)).rejects.toThrow(
        'Insufficient points',
      );
    });

    it('should track performed by user from JWT', async () => {
      const dto: RedeemPointsDto = {
        customerId: 'customer-123',
        points: 30,
      };

      mockCustomersService.redeemPoints.mockResolvedValue(mockCustomer);

      await controller.redeemPoints(mockRequest, dto);

      expect(service.redeemPoints).toHaveBeenCalledWith(
        'customer-123',
        'company-123',
        dto,
        'user-123', // performedBy from JWT
      );
    });
  });

  describe('GET /customers/:id/purchase-history', () => {
    it('should get customer purchase history with pagination', async () => {
      const mockHistory = {
        data: [
          {
            id: 'tx-1',
            transactionNumber: 'TRX-20260328-0001',
            totalAmount: 500000,
            createdAt: new Date('2026-03-28'),
            items: [],
            store: { id: 'store-123', name: 'Store 1' },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockCustomersService.getPurchaseHistory.mockResolvedValue(mockHistory);

      const result = await controller.getPurchaseHistory(
        'customer-123',
        mockRequest,
        1,
        20,
      );

      expect(result).toEqual(mockHistory);
      expect(service.getPurchaseHistory).toHaveBeenCalledWith(
        'customer-123',
        'company-123',
        {
          page: 1,
          limit: 20,
        },
      );
    });

    it('should use default pagination for purchase history', async () => {
      mockCustomersService.getPurchaseHistory.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.getPurchaseHistory('customer-123', mockRequest);

      expect(service.getPurchaseHistory).toHaveBeenCalledWith(
        'customer-123',
        'company-123',
        {
          page: undefined,
          limit: undefined,
        },
      );
    });
  });

  describe('GET /customers/:id/loyalty-history', () => {
    it('should get customer loyalty point transaction history', async () => {
      const mockHistory = {
        data: [
          {
            id: 'lpt-1',
            type: 'earn',
            points: 50,
            balanceAfter: 150,
            description: 'Purchase reward',
            referenceType: 'transaction',
            referenceId: 'tx-123',
            createdAt: new Date('2026-03-28'),
          },
          {
            id: 'lpt-2',
            type: 'redeem',
            points: 30,
            balanceAfter: 120,
            description: 'Discount redemption',
            createdAt: new Date('2026-03-27'),
          },
        ],
        total: 2,
        page: 1,
        limit: 50,
      };

      mockCustomersService.getLoyaltyPointHistory.mockResolvedValue(
        mockHistory,
      );

      const result = await controller.getLoyaltyHistory(
        'customer-123',
        mockRequest,
        1,
        50,
      );

      expect(result).toEqual(mockHistory);
      expect(service.getLoyaltyPointHistory).toHaveBeenCalledWith(
        'customer-123',
        'company-123',
        {
          page: 1,
          limit: 50,
        },
      );
    });

    it('should use default pagination for loyalty history', async () => {
      mockCustomersService.getLoyaltyPointHistory.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 50,
      });

      await controller.getLoyaltyHistory('customer-123', mockRequest);

      expect(service.getLoyaltyPointHistory).toHaveBeenCalledWith(
        'customer-123',
        'company-123',
        {
          page: undefined,
          limit: undefined,
        },
      );
    });
  });

  describe('GET /customers/loyalty/points-value/:points', () => {
    it('should calculate monetary value of loyalty points', () => {
      const result = controller.getPointsValue(100);

      expect(result).toEqual({
        points: 100,
        value: 10000, // 100 points * Rp 100
      });
    });

    it('should calculate value for different point amounts', () => {
      expect(controller.getPointsValue(50)).toEqual({
        points: 50,
        value: 5000,
      });

      expect(controller.getPointsValue(1000)).toEqual({
        points: 1000,
        value: 100000,
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', () => {
      const metadata = Reflect.getMetadata('__guards__', CustomersController);
      expect(metadata).toBeDefined();
    });

    it('should extract companyId from JWT for tenant isolation', async () => {
      mockCustomersService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 50,
      });

      await controller.findAll(mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(
        'company-123', // companyId from JWT
        expect.any(Object),
      );
    });

    it('should extract userId from JWT for audit tracking', async () => {
      const dto: AddPointsDto = {
        customerId: 'customer-123',
        points: 10,
      };

      mockCustomersService.addPoints.mockResolvedValue(mockCustomer);

      await controller.addPoints(mockRequest, dto);

      expect(service.addPoints).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        'user-123', // userId from JWT
      );
    });
  });

  describe('API Documentation', () => {
    it('should have Swagger tags', () => {
      const tags = Reflect.getMetadata(
        'swagger/apiUseTags',
        CustomersController,
      );
      expect(tags).toContain('Customers');
    });

    it('should have bearer auth', () => {
      const security = Reflect.getMetadata(
        'swagger/apiSecurity',
        CustomersController,
      );
      expect(security).toBeDefined();
    });
  });
});

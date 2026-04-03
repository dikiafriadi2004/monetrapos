import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer } from './customer.entity';
import { LoyaltyPointTransaction, LoyaltyPointTransactionType } from './loyalty-point-transaction.entity';
import { Transaction } from '../transactions/transaction.entity';

describe('CustomersService', () => {
  let service: CustomersService;
  let customerRepo: Repository<Customer>;
  let loyaltyPointTransactionRepo: Repository<LoyaltyPointTransaction>;
  let transactionRepo: Repository<Transaction>;

  const mockCustomerRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
    softRemove: jest.fn(),
  };

  const mockLoyaltyPointTransactionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockTransactionRepo = {
    findAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepo,
        },
        {
          provide: getRepositoryToken(LoyaltyPointTransaction),
          useValue: mockLoyaltyPointTransactionRepo,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepo,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    customerRepo = module.get<Repository<Customer>>(getRepositoryToken(Customer));
    loyaltyPointTransactionRepo = module.get<Repository<LoyaltyPointTransaction>>(
      getRepositoryToken(LoyaltyPointTransaction),
    );
    transactionRepo = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a customer with unique customer number', async () => {
      const companyId = 'company-123';
      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '08123456789',
        storeId: 'store-123',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockCustomerRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockCustomerRepo.create.mockReturnValue({ ...dto, companyId });
      
      const savedCustomer = {
        id: 'customer-123',
        ...dto,
        companyId,
        customerNumber: 'CUST-20260328-0001',
      };
      
      mockCustomerRepo.save.mockResolvedValue(savedCustomer);

      const result = await service.create(dto as any, companyId);

      expect(result).toBeDefined();
      expect(result.customerNumber).toMatch(/^CUST-\d{8}-\d{4}$/);
      expect(mockCustomerRepo.create).toHaveBeenCalled();
      expect(mockCustomerRepo.save).toHaveBeenCalled();
    });

    it('should generate sequential customer numbers', async () => {
      const companyId = 'company-123';
      const dto = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '08123456790',
        storeId: 'store-123',
      };

      const lastCustomer = {
        customerNumber: 'CUST-20260328-0005',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(lastCustomer),
      };

      mockCustomerRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockCustomerRepo.create.mockReturnValue({ ...dto, companyId });
      mockCustomerRepo.save.mockResolvedValue({
        id: 'customer-124',
        ...dto,
        companyId,
        customerNumber: 'CUST-20260328-0006',
      });

      const result = await service.create(dto as any, companyId);

      expect(result.customerNumber).toContain('-0006');
    });
  });

  describe('findOne', () => {
    it('should return a customer by id', async () => {
      const customerId = 'customer-123';
      const companyId = 'company-123';
      const mockCustomer = {
        id: customerId,
        companyId,
        name: 'John Doe',
      };

      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);

      const result = await service.findOne(customerId, companyId);

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerRepo.findOne).toHaveBeenCalledWith({
        where: { id: customerId, companyId },
      });
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockCustomerRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id', 'company-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addPoints', () => {
    it('should add loyalty points and log transaction', async () => {
      const customerId = 'customer-123';
      const companyId = 'company-123';
      const dto = {
        customerId,
        points: 50,
        amount: 500000,
        description: 'Purchase reward',
      };

      const mockCustomer = {
        id: customerId,
        companyId,
        loyaltyPoints: 100,
        totalSpent: 1000000,
        totalOrders: 5,
        firstPurchaseAt: new Date('2026-01-01'),
      };

      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);
      mockCustomerRepo.save.mockResolvedValue({
        ...mockCustomer,
        loyaltyPoints: 150,
        totalSpent: 1500000,
        totalOrders: 6,
        loyaltyTier: 'regular',
      });

      mockLoyaltyPointTransactionRepo.create.mockReturnValue({});
      mockLoyaltyPointTransactionRepo.save.mockResolvedValue({});

      const result = await service.addPoints(customerId, companyId, dto as any);

      expect(result.loyaltyPoints).toBe(150);
      expect(result.totalSpent).toBe(1500000);
      expect(result.totalOrders).toBe(6);
      expect(mockLoyaltyPointTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId,
          companyId,
          type: LoyaltyPointTransactionType.EARN,
          points: 50,
          balanceAfter: 150,
        }),
      );
    });

    it('should set firstPurchaseAt if not set', async () => {
      const customerId = 'customer-123';
      const companyId = 'company-123';
      const dto = {
        customerId,
        points: 50,
        amount: 500000,
      };

      const mockCustomer = {
        id: customerId,
        companyId,
        loyaltyPoints: 0,
        totalSpent: 0,
        totalOrders: 0,
        firstPurchaseAt: null,
      };

      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);
      mockCustomerRepo.save.mockResolvedValue({
        ...mockCustomer,
        loyaltyPoints: 50,
        totalSpent: 500000,
        totalOrders: 1,
        firstPurchaseAt: expect.any(Date),
        lastPurchaseAt: expect.any(Date),
        loyaltyTier: 'regular',
      });

      mockLoyaltyPointTransactionRepo.create.mockReturnValue({});
      mockLoyaltyPointTransactionRepo.save.mockResolvedValue({});

      const result = await service.addPoints(customerId, companyId, dto as any);

      expect(result.firstPurchaseAt).toBeDefined();
      expect(result.lastPurchaseAt).toBeDefined();
    });

    it('should upgrade tier based on total spent', async () => {
      const customerId = 'customer-123';
      const companyId = 'company-123';
      const dto = {
        customerId,
        points: 500,
        amount: 5000000, // 5M
      };

      const mockCustomer = {
        id: customerId,
        companyId,
        loyaltyPoints: 100,
        totalSpent: 3000000, // 3M
        totalOrders: 10,
        loyaltyTier: 'regular',
      };

      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);
      mockCustomerRepo.save.mockResolvedValue({
        ...mockCustomer,
        loyaltyPoints: 600,
        totalSpent: 8000000, // 8M - should be silver
        totalOrders: 11,
        loyaltyTier: 'silver',
      });

      mockLoyaltyPointTransactionRepo.create.mockReturnValue({});
      mockLoyaltyPointTransactionRepo.save.mockResolvedValue({});

      const result = await service.addPoints(customerId, companyId, dto as any);

      expect(result.loyaltyTier).toBe('silver');
    });
  });

  describe('redeemPoints', () => {
    it('should redeem loyalty points and log transaction', async () => {
      const customerId = 'customer-123';
      const companyId = 'company-123';
      const dto = {
        customerId,
        points: 50,
        description: 'Discount redemption',
      };

      const mockCustomer = {
        id: customerId,
        companyId,
        loyaltyPoints: 100,
      };

      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);
      mockCustomerRepo.save.mockResolvedValue({
        ...mockCustomer,
        loyaltyPoints: 50,
      });

      mockLoyaltyPointTransactionRepo.create.mockReturnValue({});
      mockLoyaltyPointTransactionRepo.save.mockResolvedValue({});

      const result = await service.redeemPoints(customerId, companyId, dto as any);

      expect(result.loyaltyPoints).toBe(50);
      expect(mockLoyaltyPointTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId,
          companyId,
          type: LoyaltyPointTransactionType.REDEEM,
          points: 50,
          balanceAfter: 50,
        }),
      );
    });

    it('should throw error if insufficient points', async () => {
      const customerId = 'customer-123';
      const companyId = 'company-123';
      const dto = {
        customerId,
        points: 150,
      };

      const mockCustomer = {
        id: customerId,
        companyId,
        loyaltyPoints: 100,
      };

      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);

      await expect(
        service.redeemPoints(customerId, companyId, dto as any),
      ).rejects.toThrow('Insufficient points');
    });
  });

  describe('getPurchaseHistory', () => {
    it('should return paginated purchase history', async () => {
      const customerId = 'customer-123';
      const companyId = 'company-123';

      const mockTransactions = [
        { id: 'tx-1', total: 100000 },
        { id: 'tx-2', total: 200000 },
      ];

      mockTransactionRepo.findAndCount.mockResolvedValue([mockTransactions, 2]);

      const result = await service.getPurchaseHistory(customerId, companyId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toEqual(mockTransactions);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('getLoyaltyPointHistory', () => {
    it('should return paginated loyalty point history', async () => {
      const customerId = 'customer-123';
      const companyId = 'company-123';

      const mockHistory = [
        { id: 'lpt-1', points: 50, type: 'earn' },
        { id: 'lpt-2', points: 20, type: 'redeem' },
      ];

      mockLoyaltyPointTransactionRepo.findAndCount.mockResolvedValue([mockHistory, 2]);

      const result = await service.getLoyaltyPointHistory(customerId, companyId, {
        page: 1,
        limit: 50,
      });

      expect(result.data).toEqual(mockHistory);
      expect(result.total).toBe(2);
    });
  });

  describe('isCustomerNumberUnique', () => {
    it('should return true if customer number is unique', async () => {
      mockCustomerRepo.count.mockResolvedValue(0);

      const result = await service.isCustomerNumberUnique('CUST-20260328-0001');

      expect(result).toBe(true);
    });

    it('should return false if customer number exists', async () => {
      mockCustomerRepo.count.mockResolvedValue(1);

      const result = await service.isCustomerNumberUnique('CUST-20260328-0001');

      expect(result).toBe(false);
    });
  });

  describe('update', () => {
    it('should update customer details', async () => {
      const customerId = 'customer-123';
      const companyId = 'company-123';
      const dto = {
        name: 'John Updated',
        email: 'john.updated@example.com',
      };

      const mockCustomer = {
        id: customerId,
        companyId,
        name: 'John Doe',
        email: 'john@example.com',
      };

      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);
      mockCustomerRepo.save.mockResolvedValue({
        ...mockCustomer,
        ...dto,
      });

      const result = await service.update(customerId, companyId, dto as any);

      expect(result.name).toBe('John Updated');
      expect(result.email).toBe('john.updated@example.com');
    });
  });

  describe('remove', () => {
    it('should soft delete a customer', async () => {
      const customerId = 'customer-123';
      const companyId = 'company-123';

      const mockCustomer = {
        id: customerId,
        companyId,
        name: 'John Doe',
      };

      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);
      mockCustomerRepo.softRemove.mockResolvedValue(mockCustomer);

      await service.remove(customerId, companyId);

      expect(mockCustomerRepo.softRemove).toHaveBeenCalledWith(mockCustomer);
    });
  });
});

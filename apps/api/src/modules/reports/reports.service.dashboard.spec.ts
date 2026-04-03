import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportsService } from './reports.service';
import { Transaction, TransactionStatus } from '../transactions/transaction.entity';
import { TransactionItem } from '../transactions/transaction-item.entity';
import { Product } from '../products/product.entity';
import { Customer } from '../customers/customer.entity';

describe('ReportsService - Dashboard', () => {
  let service: ReportsService;
  let transactionRepo: Repository<Transaction>;
  let transactionItemRepo: Repository<TransactionItem>;
  let productRepo: Repository<Product>;
  let customerRepo: Repository<Customer>;

  const mockCompanyId = 'company-123';
  const mockStoreId = 'store-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TransactionItem),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    transactionRepo = module.get<Repository<Transaction>>(
      getRepositoryToken(Transaction),
    );
    transactionItemRepo = module.get<Repository<TransactionItem>>(
      getRepositoryToken(TransactionItem),
    );
    productRepo = module.get<Repository<Product>>(getRepositoryToken(Product));
    customerRepo = module.get<Repository<Customer>>(
      getRepositoryToken(Customer),
    );
  });

  describe('getDashboard', () => {
    it('should return dashboard metrics with default date range (last 7 days)', async () => {
      // Mock transaction metrics
      const mockTransactionQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalRevenue: '150000',
          totalTransactions: '25',
          averageTransaction: '6000',
        }),
      };

      // Mock product metrics
      const mockProductQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(50),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'prod-1',
            name: 'Product 1',
            sku: 'SKU001',
            stock: 5,
            lowStockThreshold: 10,
          },
          {
            id: 'prod-2',
            name: 'Product 2',
            sku: 'SKU002',
            stock: 3,
            lowStockThreshold: 10,
          },
        ]),
      };

      // Mock customer metrics
      const mockCustomerQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValueOnce(100).mockResolvedValueOnce(5),
      };

      // Mock top products
      const mockTopProductsQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            productId: 'prod-1',
            productName: 'Product 1',
            quantitySold: '50',
            revenue: '50000',
          },
          {
            productId: 'prod-2',
            productName: 'Product 2',
            quantitySold: '30',
            revenue: '30000',
          },
        ]),
      };

      // Mock revenue chart
      const mockRevenueChartQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { date: '2024-01-01', revenue: '20000', transactions: '5' },
          { date: '2024-01-02', revenue: '25000', transactions: '6' },
        ]),
      };

      // Mock inventory value
      const mockInventoryValueQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totalValue: '500000' }),
      };

      jest
        .spyOn(transactionRepo, 'createQueryBuilder')
        .mockReturnValueOnce(mockTransactionQueryBuilder as any)
        .mockReturnValueOnce(mockRevenueChartQueryBuilder as any);

      jest
        .spyOn(productRepo, 'createQueryBuilder')
        .mockReturnValueOnce(mockProductQueryBuilder as any)
        .mockReturnValueOnce(mockProductQueryBuilder as any)
        .mockReturnValueOnce(mockInventoryValueQueryBuilder as any);

      jest
        .spyOn(customerRepo, 'createQueryBuilder')
        .mockReturnValueOnce(mockCustomerQueryBuilder as any)
        .mockReturnValueOnce(mockCustomerQueryBuilder as any);

      jest
        .spyOn(transactionItemRepo, 'createQueryBuilder')
        .mockReturnValue(mockTopProductsQueryBuilder as any);

      const result = await service.getDashboard(mockCompanyId, {});

      expect(result).toBeDefined();
      expect(result.metrics.totalRevenue).toBe(150000);
      expect(result.metrics.totalTransactions).toBe(25);
      expect(result.metrics.averageTransaction).toBe(6000);
      expect(result.metrics.totalProducts).toBe(50);
      expect(result.metrics.totalCustomers).toBe(100);
      expect(result.metrics.newCustomers).toBe(5);
      expect(result.metrics.lowStockProducts).toBe(50);
      expect(result.metrics.totalInventoryValue).toBe(500000);
      expect(result.topProducts).toHaveLength(2);
      expect(result.lowStockAlerts).toHaveLength(2);
      expect(result.revenueChart).toHaveLength(2);
    });

    it('should filter by storeId when provided', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalRevenue: '50000',
          totalTransactions: '10',
          averageTransaction: '5000',
        }),
        getCount: jest.fn().mockResolvedValue(20),
        getMany: jest.fn().mockResolvedValue([]),
        getRawMany: jest.fn().mockResolvedValue([]),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };

      jest
        .spyOn(transactionRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(productRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(customerRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(transactionItemRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await service.getDashboard(mockCompanyId, { storeId: mockStoreId });

      // Verify storeId filter was applied
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('storeId'),
        expect.objectContaining({ storeId: mockStoreId }),
      );
    });

    it('should use custom date range when provided', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalRevenue: '100000',
          totalTransactions: '20',
          averageTransaction: '5000',
        }),
        getCount: jest.fn().mockResolvedValue(30),
        getMany: jest.fn().mockResolvedValue([]),
        getRawMany: jest.fn().mockResolvedValue([]),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };

      jest
        .spyOn(transactionRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(productRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(customerRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(transactionItemRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getDashboard(mockCompanyId, {
        startDate,
        endDate,
      });

      expect(result.period.startDate).toBe(startDate);
      expect(result.period.endDate).toBe(endDate);
    });

    it('should handle zero metrics gracefully', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalRevenue: null,
          totalTransactions: null,
          averageTransaction: null,
        }),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
        getRawMany: jest.fn().mockResolvedValue([]),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };

      jest
        .spyOn(transactionRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(productRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(customerRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(transactionItemRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getDashboard(mockCompanyId, {});

      expect(result.metrics.totalRevenue).toBe(0);
      expect(result.metrics.totalTransactions).toBe(0);
      expect(result.metrics.averageTransaction).toBe(0);
      expect(result.metrics.totalProducts).toBe(0);
      expect(result.topProducts).toHaveLength(0);
      expect(result.lowStockAlerts).toHaveLength(0);
      expect(result.revenueChart).toHaveLength(0);
    });

    it('should limit low stock alerts to 10 items', async () => {
      const mockLowStockProducts = Array.from({ length: 15 }, (_, i) => ({
        id: `prod-${i}`,
        name: `Product ${i}`,
        sku: `SKU${i}`,
        stock: i,
        lowStockThreshold: 10,
      }));

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalRevenue: '100000',
          totalTransactions: '20',
          averageTransaction: '5000',
        }),
        getCount: jest.fn().mockResolvedValue(15),
        getMany: jest.fn().mockResolvedValue(mockLowStockProducts.slice(0, 10)),
        getRawMany: jest.fn().mockResolvedValue([]),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };

      jest
        .spyOn(transactionRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(productRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(customerRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(transactionItemRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getDashboard(mockCompanyId, {});

      expect(result.lowStockAlerts).toHaveLength(10);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should limit top products to 5 items', async () => {
      const mockTopProducts = Array.from({ length: 10 }, (_, i) => ({
        productId: `prod-${i}`,
        productName: `Product ${i}`,
        quantitySold: `${100 - i}`,
        revenue: `${(100 - i) * 1000}`,
      }));

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalRevenue: '100000',
          totalTransactions: '20',
          averageTransaction: '5000',
        }),
        getCount: jest.fn().mockResolvedValue(50),
        getMany: jest.fn().mockResolvedValue([]),
        getRawMany: jest.fn().mockResolvedValue(mockTopProducts.slice(0, 5)),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };

      jest
        .spyOn(transactionRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(productRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(customerRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(transactionItemRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getDashboard(mockCompanyId, {});

      expect(result.topProducts).toHaveLength(5);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
    });
  });
});

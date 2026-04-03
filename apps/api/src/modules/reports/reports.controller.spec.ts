import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import {
  DashboardQueryDto,
  DashboardResponseDto,
  SalesReportQueryDto,
  ProductPerformanceQueryDto,
  InventoryReportQueryDto,
} from './dto';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReportsService;

  const mockReportsService = {
    getDashboard: jest.fn(),
    getSalesReport: jest.fn(),
    getProductPerformance: jest.fn(),
    getInventoryReport: jest.fn(),
  };

  const mockRequest = {
    user: {
      companyId: 'test-company-id',
      userId: 'test-user-id',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should return dashboard data with all metrics', async () => {
      const query: DashboardQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-07',
      };

      const expectedResponse: DashboardResponseDto = {
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
        },
        metrics: {
          totalRevenue: 15000000,
          totalTransactions: 150,
          averageTransaction: 100000,
          totalProducts: 50,
          activeProducts: 45,
          totalCustomers: 200,
          newCustomers: 10,
          lowStockProducts: 5,
          totalInventoryValue: 25000000,
        },
        topProducts: [
          {
            productId: 'product-1',
            productName: 'Product A',
            quantitySold: 100,
            revenue: 5000000,
          },
          {
            productId: 'product-2',
            productName: 'Product B',
            quantitySold: 80,
            revenue: 4000000,
          },
        ],
        lowStockAlerts: [
          {
            productId: 'product-3',
            productName: 'Product C',
            sku: 'SKU-003',
            currentStock: 5,
            lowStockThreshold: 10,
          },
        ],
        revenueChart: [
          {
            date: '2024-01-01',
            revenue: 2000000,
            transactions: 20,
          },
          {
            date: '2024-01-02',
            revenue: 2500000,
            transactions: 25,
          },
        ],
      };

      mockReportsService.getDashboard.mockResolvedValue(expectedResponse);

      const result = await controller.getDashboard(mockRequest, query);

      expect(service.getDashboard).toHaveBeenCalledWith(
        mockRequest.user.companyId,
        query,
      );
      expect(result).toEqual(expectedResponse);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalRevenue).toBe(15000000);
      expect(result.metrics.totalTransactions).toBe(150);
      expect(result.topProducts).toHaveLength(2);
      expect(result.lowStockAlerts).toHaveLength(1);
      expect(result.revenueChart).toHaveLength(2);
    });

    it('should handle dashboard request without date range (defaults to last 7 days)', async () => {
      const query: DashboardQueryDto = {};

      const expectedResponse: DashboardResponseDto = {
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
        },
        metrics: {
          totalRevenue: 0,
          totalTransactions: 0,
          averageTransaction: 0,
          totalProducts: 0,
          activeProducts: 0,
          totalCustomers: 0,
          newCustomers: 0,
          lowStockProducts: 0,
          totalInventoryValue: 0,
        },
        topProducts: [],
        lowStockAlerts: [],
        revenueChart: [],
      };

      mockReportsService.getDashboard.mockResolvedValue(expectedResponse);

      const result = await controller.getDashboard(mockRequest, query);

      expect(service.getDashboard).toHaveBeenCalledWith(
        mockRequest.user.companyId,
        query,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should filter dashboard by storeId when provided', async () => {
      const query: DashboardQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        storeId: 'store-123',
      };

      const expectedResponse: DashboardResponseDto = {
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
        },
        metrics: {
          totalRevenue: 5000000,
          totalTransactions: 50,
          averageTransaction: 100000,
          totalProducts: 20,
          activeProducts: 18,
          totalCustomers: 80,
          newCustomers: 5,
          lowStockProducts: 2,
          totalInventoryValue: 10000000,
        },
        topProducts: [],
        lowStockAlerts: [],
        revenueChart: [],
      };

      mockReportsService.getDashboard.mockResolvedValue(expectedResponse);

      const result = await controller.getDashboard(mockRequest, query);

      expect(service.getDashboard).toHaveBeenCalledWith(
        mockRequest.user.companyId,
        query,
      );
      expect(result.metrics.totalRevenue).toBe(5000000);
    });

    it('should return empty arrays when no data available', async () => {
      const query: DashboardQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-07',
      };

      const expectedResponse: DashboardResponseDto = {
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
        },
        metrics: {
          totalRevenue: 0,
          totalTransactions: 0,
          averageTransaction: 0,
          totalProducts: 0,
          activeProducts: 0,
          totalCustomers: 0,
          newCustomers: 0,
          lowStockProducts: 0,
          totalInventoryValue: 0,
        },
        topProducts: [],
        lowStockAlerts: [],
        revenueChart: [],
      };

      mockReportsService.getDashboard.mockResolvedValue(expectedResponse);

      const result = await controller.getDashboard(mockRequest, query);

      expect(result.topProducts).toEqual([]);
      expect(result.lowStockAlerts).toEqual([]);
      expect(result.revenueChart).toEqual([]);
    });
  });

  describe('getSalesReport', () => {
    it('should return sales report with summary and daily data', async () => {
      const query: SalesReportQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        groupBy: 'day' as any,
      };

      const expectedResponse = {
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
        },
        summary: {
          totalRevenue: 15000000,
          totalTransactions: 150,
          averageTransaction: 100000,
          totalTax: 1500000,
          totalDiscount: 500000,
        },
        daily: [
          { date: '2024-01-01', revenue: 2000000, transactions: 20 },
          { date: '2024-01-02', revenue: 2500000, transactions: 25 },
        ],
      };

      mockReportsService.getSalesReport.mockResolvedValue(expectedResponse);

      const result = await controller.getSalesReport(mockRequest, query);

      expect(service.getSalesReport).toHaveBeenCalledWith(
        mockRequest.user.companyId,
        query,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getProductPerformance', () => {
    it('should return top selling products', async () => {
      const query: ProductPerformanceQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        limit: 10,
      };

      const expectedResponse = {
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
        },
        topProducts: [
          {
            productId: 'product-1',
            productName: 'Product A',
            sku: 'SKU-001',
            quantitySold: 100,
            revenue: 5000000,
            profit: 2000000,
            averagePrice: 50000,
          },
        ],
        summary: {
          totalProducts: 1,
          totalRevenue: 5000000,
          totalProfit: 2000000,
        },
      };

      mockReportsService.getProductPerformance.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.getProductPerformance(mockRequest, query);

      expect(service.getProductPerformance).toHaveBeenCalledWith(
        mockRequest.user.companyId,
        query,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getInventoryReport', () => {
    it('should return inventory report with stock levels', async () => {
      const query: InventoryReportQueryDto = {
        lowStockOnly: false,
      };

      const expectedResponse = {
        products: [
          {
            productId: 'product-1',
            productName: 'Product A',
            sku: 'SKU-001',
            categoryName: 'Category A',
            stock: 50,
            lowStockThreshold: 10,
            isLowStock: false,
            cost: 30000,
            inventoryValue: 1500000,
          },
        ],
        summary: {
          totalProducts: 1,
          lowStockProducts: 0,
          totalInventoryValue: 1500000,
        },
      };

      mockReportsService.getInventoryReport.mockResolvedValue(expectedResponse);

      const result = await controller.getInventoryReport(mockRequest, query);

      expect(service.getInventoryReport).toHaveBeenCalledWith(
        mockRequest.user.companyId,
        query,
      );
      expect(result).toEqual(expectedResponse);
    });
  });
});

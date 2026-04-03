import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from '../transactions/transaction.entity';
import { TransactionItem } from '../transactions/transaction-item.entity';
import { Product } from '../products/product.entity';
import { Customer } from '../customers/customer.entity';
import {
  SalesReportQueryDto,
  SalesReportResponseDto,
  ReportGroupBy,
  ProductPerformanceQueryDto,
  ProductPerformanceResponseDto,
  InventoryReportQueryDto,
  InventoryReportResponseDto,
  DashboardQueryDto,
  DashboardResponseDto,
} from './dto';

@Injectable()
export class ReportsService {

  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionItem)
    private transactionItemRepo: Repository<TransactionItem>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
  ) {}

  async getSalesReport(
    companyId: string,
    query: SalesReportQueryDto,
  ): Promise<SalesReportResponseDto> {
    const { startDate, endDate, groupBy, storeId } = query;

    // Build base query
    const queryBuilder = this.transactionRepo
      .createQueryBuilder('transaction')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate + 'T23:59:59.999Z'),
      });

    if (storeId) {
      queryBuilder.andWhere('transaction.storeId = :storeId', { storeId });
    }

    // Get summary data
    const summaryResult = await queryBuilder
      .select('SUM(transaction.total)', 'totalRevenue')
      .addSelect('COUNT(transaction.id)', 'totalTransactions')
      .addSelect('AVG(transaction.total)', 'averageTransaction')
      .addSelect('SUM(transaction.taxAmount)', 'totalTax')
      .addSelect('SUM(transaction.discountAmount)', 'totalDiscount')
      .getRawOne();

    const summary = {
      totalRevenue: parseFloat(summaryResult.totalRevenue || 0),
      totalTransactions: parseInt(summaryResult.totalTransactions || 0),
      averageTransaction: parseFloat(summaryResult.averageTransaction || 0),
      totalTax: parseFloat(summaryResult.totalTax || 0),
      totalDiscount: parseFloat(summaryResult.totalDiscount || 0),
    };

    // Get grouped data
    let groupedData: any[] = [];
    if (groupBy === ReportGroupBy.DAY) {
      groupedData = await this.getDailyData(companyId, query);
    } else if (groupBy === ReportGroupBy.WEEK) {
      groupedData = await this.getWeeklyData(companyId, query);
    } else if (groupBy === ReportGroupBy.MONTH) {
      groupedData = await this.getMonthlyData(companyId, query);
    }

    const response: SalesReportResponseDto = {
      period: {
        startDate,
        endDate,
      },
      summary,
    };

    if (groupBy === ReportGroupBy.DAY) {
      response.daily = groupedData;
    } else if (groupBy === ReportGroupBy.WEEK) {
      response.weekly = groupedData;
    } else if (groupBy === ReportGroupBy.MONTH) {
      response.monthly = groupedData;
    }

    return response;
  }

  private async getDailyData(
    companyId: string,
    query: SalesReportQueryDto,
  ): Promise<Array<{ date: string; revenue: number; transactions: number }>> {
    const { startDate, endDate, storeId } = query;

    const queryBuilder = this.transactionRepo
      .createQueryBuilder('transaction')
      .select('DATE(transaction.createdAt)', 'date')
      .addSelect('SUM(transaction.total)', 'revenue')
      .addSelect('COUNT(transaction.id)', 'transactions')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate + 'T23:59:59.999Z'),
      })
      .groupBy('DATE(transaction.createdAt)')
      .orderBy('date', 'ASC');

    if (storeId) {
      queryBuilder.andWhere('transaction.storeId = :storeId', { storeId });
    }

    const results = await queryBuilder.getRawMany();

    return results.map((row) => ({
      date: row.date,
      revenue: parseFloat(row.revenue || 0),
      transactions: parseInt(row.transactions || 0),
    }));
  }

  private async getWeeklyData(
    companyId: string,
    query: SalesReportQueryDto,
  ): Promise<Array<{ week: string; revenue: number; transactions: number }>> {
    const { startDate, endDate, storeId } = query;

    const queryBuilder = this.transactionRepo
      .createQueryBuilder('transaction')
      .select('YEARWEEK(transaction.createdAt)', 'week')
      .addSelect('SUM(transaction.total)', 'revenue')
      .addSelect('COUNT(transaction.id)', 'transactions')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate + 'T23:59:59.999Z'),
      })
      .groupBy('YEARWEEK(transaction.createdAt)')
      .orderBy('week', 'ASC');

    if (storeId) {
      queryBuilder.andWhere('transaction.storeId = :storeId', { storeId });
    }

    const results = await queryBuilder.getRawMany();

    return results.map((row) => ({
      week: row.week,
      revenue: parseFloat(row.revenue || 0),
      transactions: parseInt(row.transactions || 0),
    }));
  }

  private async getMonthlyData(
    companyId: string,
    query: SalesReportQueryDto,
  ): Promise<Array<{ month: string; revenue: number; transactions: number }>> {
    const { startDate, endDate, storeId } = query;

    const queryBuilder = this.transactionRepo
      .createQueryBuilder('transaction')
      .select('DATE_FORMAT(transaction.createdAt, "%Y-%m")', 'month')
      .addSelect('SUM(transaction.total)', 'revenue')
      .addSelect('COUNT(transaction.id)', 'transactions')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate + 'T23:59:59.999Z'),
      })
      .groupBy('DATE_FORMAT(transaction.createdAt, "%Y-%m")')
      .orderBy('month', 'ASC');

    if (storeId) {
      queryBuilder.andWhere('transaction.storeId = :storeId', { storeId });
    }

    const results = await queryBuilder.getRawMany();

    return results.map((row) => ({
      month: row.month,
      revenue: parseFloat(row.revenue || 0),
      transactions: parseInt(row.transactions || 0),
    }));
  }

  async getProductPerformance(
    companyId: string,
    query: ProductPerformanceQueryDto,
  ): Promise<ProductPerformanceResponseDto> {
    const { startDate, endDate, storeId, categoryId, limit } = query;

    // Build query for transaction items with product info
    const queryBuilder = this.transactionItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.transaction', 'transaction')
      .leftJoin('products', 'product', 'product.id = item.productId')
      .select('item.productId', 'productId')
      .addSelect('item.productName', 'productName')
      .addSelect('product.sku', 'sku')
      .addSelect('product.cost', 'cost')
      .addSelect('SUM(item.quantity)', 'quantitySold')
      .addSelect('SUM(item.subtotal)', 'revenue')
      .addSelect('AVG(item.unitPrice)', 'averagePrice')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate + 'T23:59:59.999Z'),
      })
      .groupBy('item.productId')
      .addGroupBy('item.productName')
      .addGroupBy('product.sku')
      .addGroupBy('product.cost')
      .orderBy('revenue', 'DESC')
      .limit(limit);

    if (storeId) {
      queryBuilder.andWhere('transaction.storeId = :storeId', { storeId });
    }

    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    const results = await queryBuilder.getRawMany();

    const topProducts = results.map((row) => {
      const revenue = parseFloat(row.revenue || 0);
      const quantitySold = parseInt(row.quantitySold || 0);
      const cost = parseFloat(row.cost || 0);
      const profit = revenue - cost * quantitySold;

      return {
        productId: row.productId || 'unknown',
        productName: row.productName,
        sku: row.sku || 'N/A',
        quantitySold,
        revenue,
        profit,
        averagePrice: parseFloat(row.averagePrice || 0),
      };
    });

    const summary = {
      totalProducts: topProducts.length,
      totalRevenue: topProducts.reduce((sum, p) => sum + p.revenue, 0),
      totalProfit: topProducts.reduce((sum, p) => sum + p.profit, 0),
    };

    return {
      period: {
        startDate,
        endDate,
      },
      topProducts,
      summary,
    };
  }

  async getInventoryReport(
    companyId: string,
    query: InventoryReportQueryDto,
  ): Promise<InventoryReportResponseDto> {
    const { storeId, categoryId, lowStockOnly } = query;

    const queryBuilder = this.productRepo
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .select([
        'product.id',
        'product.name',
        'product.sku',
        'product.stock',
        'product.lowStockThreshold',
        'product.cost',
        'category.name',
      ])
      .where('product.companyId = :companyId', { companyId })
      .andWhere('product.trackInventory = :trackInventory', {
        trackInventory: true,
      })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .orderBy('product.name', 'ASC');

    if (storeId) {
      queryBuilder.andWhere('product.storeId = :storeId', { storeId });
    }

    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (lowStockOnly) {
      queryBuilder.andWhere('product.stock <= product.lowStockThreshold');
    }

    const products = await queryBuilder.getMany();

    const productsData = products.map((product) => {
      const stock = product.stock || 0;
      const cost = parseFloat(product.cost?.toString() || '0');
      const inventoryValue = stock * cost;
      const isLowStock = stock <= product.lowStockThreshold;

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku || 'N/A',
        categoryName: product.category?.name || 'Uncategorized',
        stock,
        lowStockThreshold: product.lowStockThreshold,
        isLowStock,
        cost,
        inventoryValue,
      };
    });

    const summary = {
      totalProducts: productsData.length,
      lowStockProducts: productsData.filter((p) => p.isLowStock).length,
      totalInventoryValue: productsData.reduce(
        (sum, p) => sum + p.inventoryValue,
        0,
      ),
    };

    return {
      products: productsData,
      summary,
    };
  }

  /**
   * Get dashboard overview with key business metrics
   */
  async getDashboard(
    companyId: string,
    query: DashboardQueryDto,
  ): Promise<DashboardResponseDto> {
    // Default to today if no dates provided
    const endDate = query.endDate || new Date().toISOString().split('T')[0];
    const startDate =
      query.startDate ||
      new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]; // Last 7 days

    const { storeId } = query;

    // Build base query for transactions
    const transactionQuery = this.transactionRepo
      .createQueryBuilder('transaction')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      });

    if (storeId) {
      transactionQuery.andWhere('transaction.storeId = :storeId', { storeId });
    }

    // Get sales metrics for the period
    const salesMetrics = await transactionQuery
      .clone()
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate + 'T23:59:59.999Z'),
      })
      .select('SUM(transaction.total)', 'totalRevenue')
      .addSelect('COUNT(transaction.id)', 'totalTransactions')
      .addSelect('AVG(transaction.total)', 'averageTransaction')
      .getRawOne();

    // Get product metrics
    const productQuery = this.productRepo
      .createQueryBuilder('product')
      .where('product.companyId = :companyId', { companyId })
      .andWhere('product.isActive = :isActive', { isActive: true });

    if (storeId) {
      productQuery.andWhere('product.storeId = :storeId', { storeId });
    }

    const [totalProducts, activeProducts] = await Promise.all([
      productQuery.clone().getCount(),
      productQuery.clone().getCount(),
    ]);

    // Get customer metrics
    const customerQuery = this.customerRepo
      .createQueryBuilder('customer')
      .where('customer.companyId = :companyId', { companyId })
      .andWhere('customer.isActive = :isActive', { isActive: true });

    if (storeId) {
      customerQuery.andWhere('customer.storeId = :storeId', { storeId });
    }

    const [totalCustomers, newCustomers] = await Promise.all([
      customerQuery.clone().getCount(),
      customerQuery
        .clone()
        .andWhere('customer.createdAt BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate),
          endDate: new Date(endDate + 'T23:59:59.999Z'),
        })
        .getCount(),
    ]);

    // Get low stock products
    const lowStockQuery = this.productRepo
      .createQueryBuilder('product')
      .where('product.companyId = :companyId', { companyId })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .andWhere('product.trackInventory = :trackInventory', {
        trackInventory: true,
      })
      .andWhere('product.stock <= product.lowStockThreshold');

    if (storeId) {
      lowStockQuery.andWhere('product.storeId = :storeId', { storeId });
    }

    const [lowStockProducts, lowStockProductsList] = await Promise.all([
      lowStockQuery.clone().getCount(),
      lowStockQuery
        .clone()
        .select([
          'product.id',
          'product.name',
          'product.sku',
          'product.stock',
          'product.lowStockThreshold',
        ])
        .orderBy('product.stock', 'ASC')
        .limit(10)
        .getMany(),
    ]);

    // Calculate total inventory value
    const inventoryValueResult = await this.productRepo
      .createQueryBuilder('product')
      .select('SUM(product.stock * product.cost)', 'totalValue')
      .where('product.companyId = :companyId', { companyId })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .andWhere('product.trackInventory = :trackInventory', {
        trackInventory: true,
      })
      .getRawOne();

    // Get top selling products (last 7 days)
    const topProductsQuery = this.transactionItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.transaction', 'transaction')
      .select('item.productId', 'productId')
      .addSelect('item.productName', 'productName')
      .addSelect('SUM(item.quantity)', 'quantitySold')
      .addSelect('SUM(item.subtotal)', 'revenue')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate + 'T23:59:59.999Z'),
      })
      .groupBy('item.productId')
      .addGroupBy('item.productName')
      .orderBy('quantitySold', 'DESC')
      .limit(5);

    if (storeId) {
      topProductsQuery.andWhere('transaction.storeId = :storeId', { storeId });
    }

    const topProductsResults = await topProductsQuery.getRawMany();

    // Get revenue chart data (daily for the period)
    const revenueChartQuery = this.transactionRepo
      .createQueryBuilder('transaction')
      .select('DATE(transaction.createdAt)', 'date')
      .addSelect('SUM(transaction.total)', 'revenue')
      .addSelect('COUNT(transaction.id)', 'transactions')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate + 'T23:59:59.999Z'),
      })
      .groupBy('DATE(transaction.createdAt)')
      .orderBy('date', 'ASC');

    if (storeId) {
      revenueChartQuery.andWhere('transaction.storeId = :storeId', { storeId });
    }

    const revenueChartResults = await revenueChartQuery.getRawMany();

    // Build response
    return {
      period: {
        startDate,
        endDate,
      },
      metrics: {
        totalRevenue: parseFloat(salesMetrics.totalRevenue || 0),
        totalTransactions: parseInt(salesMetrics.totalTransactions || 0),
        averageTransaction: parseFloat(salesMetrics.averageTransaction || 0),
        totalProducts,
        activeProducts,
        totalCustomers,
        newCustomers,
        lowStockProducts,
        totalInventoryValue: parseFloat(
          inventoryValueResult.totalValue || 0,
        ),
      },
      topProducts: topProductsResults.map((row) => ({
        productId: row.productId || 'unknown',
        productName: row.productName,
        quantitySold: parseInt(row.quantitySold || 0),
        revenue: parseFloat(row.revenue || 0),
      })),
      lowStockAlerts: lowStockProductsList.map((product) => ({
        productId: product.id,
        productName: product.name,
        sku: product.sku || 'N/A',
        currentStock: product.stock || 0,
        lowStockThreshold: product.lowStockThreshold,
      })),
      revenueChart: revenueChartResults.map((row) => ({
        date: row.date,
        revenue: parseFloat(row.revenue || 0),
        transactions: parseInt(row.transactions || 0),
      })),
    };
  }
}

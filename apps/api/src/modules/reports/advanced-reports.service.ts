import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Employee } from '../employees/employee.entity';
import { Customer } from '../customers/customer.entity';
import { Shift } from '../shifts/shift.entity';

export interface EmployeePerformanceReport {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  totalSales: number;
  totalTransactions: number;
  averageTransactionValue: number;
  totalWorkHours: number;
  totalShifts: number;
  salesPerHour: number;
  topSellingProducts: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface CustomerReport {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageLifetimeValue: number;
  topCustomers: Array<{
    customerId: string;
    customerNumber: string;
    customerName: string;
    totalSpent: number;
    totalOrders: number;
    loyaltyTier: string;
    lastPurchaseAt: Date;
  }>;
  customersByTier: Record<string, number>;
  retentionRate: number;
}

export interface ProfitLossReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenue: {
    totalSales: number;
    totalTransactions: number;
    averageTransactionValue: number;
  };
  costs: {
    totalCost: number;
    costOfGoodsSold: number;
    operatingExpenses: number;
  };
  profit: {
    grossProfit: number;
    grossProfitMargin: number;
    netProfit: number;
    netProfitMargin: number;
  };
  breakdown: {
    salesByCategory: Array<{
      category: string;
      revenue: number;
      cost: number;
      profit: number;
      margin: number;
    }>;
    salesByStore: Array<{
      storeId: string;
      storeName: string;
      revenue: number;
      transactions: number;
    }>;
  };
}

@Injectable()
export class AdvancedReportsService {
  private readonly logger = new Logger(AdvancedReportsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
  ) {}

  /**
   * Get employee performance report
   */
  async getEmployeePerformance(
    companyId: string,
    startDate: Date,
    endDate: Date,
    employeeId?: string,
  ): Promise<EmployeePerformanceReport[]> {
    this.logger.log(
      `Generating employee performance report for company ${companyId}`,
    );

    // Build query for transactions
    const transactionQuery = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.items', 'items')
      .leftJoinAndSelect('transaction.employee', 'employee')
      .where('transaction.company_id = :companyId', { companyId })
      .andWhere('transaction.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('transaction.status = :status', { status: 'completed' });

    if (employeeId) {
      transactionQuery.andWhere('transaction.employee_id = :employeeId', {
        employeeId,
      });
    }

    const transactions = await transactionQuery.getMany();

    // Get shifts for work hours calculation
    const shiftQuery = this.shiftRepository
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.employee', 'employee')
      .where('shift.companyId = :companyId', { companyId })
      .andWhere('shift.openedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (employeeId) {
      shiftQuery.andWhere('shift.employeeId = :employeeId', { employeeId });
    }

    const shifts = await shiftQuery.getMany();

    // Group by employee
    const employeeMap = new Map<string, EmployeePerformanceReport>();

    for (const transaction of transactions) {
      if (!transaction.employee) continue;

      const empId = transaction.employee.id;

      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          employeeId: empId,
          employeeNumber: transaction.employee.employeeNumber,
          employeeName: transaction.employee.name,
          totalSales: 0,
          totalTransactions: 0,
          averageTransactionValue: 0,
          totalWorkHours: 0,
          totalShifts: 0,
          salesPerHour: 0,
          topSellingProducts: [],
        });
      }

      const report = employeeMap.get(empId)!;
      report.totalSales += Number(transaction.total);
      report.totalTransactions += 1;
    }

    // Calculate work hours from shifts
    for (const shift of shifts) {
      if (!shift.employee) continue;

      const empId = shift.employee.id;
      const report = employeeMap.get(empId);

      if (report) {
        report.totalShifts += 1;

        if (shift.openedAt && shift.closedAt) {
          const hours =
            (new Date(shift.closedAt).getTime() -
              new Date(shift.openedAt).getTime()) /
            (1000 * 60 * 60);
          report.totalWorkHours += hours;
        }
      }
    }

    // Calculate averages and sales per hour
    const reports = Array.from(employeeMap.values());

    for (const report of reports) {
      report.averageTransactionValue =
        report.totalTransactions > 0
          ? report.totalSales / report.totalTransactions
          : 0;

      report.salesPerHour =
        report.totalWorkHours > 0 ? report.totalSales / report.totalWorkHours : 0;
    }

    // Sort by total sales descending
    reports.sort((a, b) => b.totalSales - a.totalSales);

    return reports;
  }

  /**
   * Get customer report
   */
  async getCustomerReport(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CustomerReport> {
    this.logger.log(`Generating customer report for company ${companyId}`);

    // Get all active customers
    const allCustomers = await this.customerRepository.find({
      where: { companyId, isActive: true },
    });

    // Get new customers in period
    const newCustomers = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.company_id = :companyId', { companyId })
      .andWhere('customer.is_active = :isActive', { isActive: true })
      .andWhere('customer.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getCount();

    // Get customers who made purchases in period
    const customersWithPurchases = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('DISTINCT transaction.customer_id', 'customer_id')
      .where('transaction.company_id = :companyId', { companyId })
      .andWhere('transaction.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('transaction.status = :status', { status: 'completed' })
      .getRawMany();

    const returningCustomers = customersWithPurchases.filter((c) => {
      const customer = allCustomers.find((ac) => ac.id === c.customer_id);
      return customer && new Date(customer.createdAt) < startDate;
    }).length;

    // Calculate average lifetime value
    const totalLifetimeValue = allCustomers.reduce(
      (sum, c) => sum + Number(c.totalSpent),
      0,
    );
    const averageLifetimeValue =
      allCustomers.length > 0 ? totalLifetimeValue / allCustomers.length : 0;

    // Get top customers
    const topCustomers = allCustomers
      .sort((a, b) => Number(b.totalSpent) - Number(a.totalSpent))
      .slice(0, 10)
      .map((c) => ({
        customerId: c.id,
        customerNumber: c.customerNumber,
        customerName: c.name,
        totalSpent: Number(c.totalSpent),
        totalOrders: c.totalOrders,
        loyaltyTier: c.loyaltyTier,
        lastPurchaseAt: c.lastPurchaseAt,
      }));

    // Count customers by tier
    const customersByTier = allCustomers.reduce((acc, c) => {
      acc[c.loyaltyTier] = (acc[c.loyaltyTier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate retention rate (customers who purchased in period / total customers)
    const retentionRate =
      allCustomers.length > 0
        ? (customersWithPurchases.length / allCustomers.length) * 100
        : 0;

    return {
      totalCustomers: allCustomers.length,
      newCustomers,
      returningCustomers,
      averageLifetimeValue,
      topCustomers,
      customersByTier,
      retentionRate,
    };
  }

  /**
   * Get profit/loss report
   */
  async getProfitLossReport(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProfitLossReport> {
    this.logger.log(`Generating P&L report for company ${companyId}`);

    // Get all completed transactions in period
    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('transaction.store', 'store')
      .where('transaction.company_id = :companyId', { companyId })
      .andWhere('transaction.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('transaction.status = :status', { status: 'completed' })
      .getMany();

    // Calculate revenue
    const totalSales = transactions.reduce(
      (sum, t) => sum + Number(t.total),
      0,
    );
    const totalTransactions = transactions.length;
    const averageTransactionValue =
      totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Calculate cost of goods sold (COGS)
    let costOfGoodsSold = 0;
    const categoryMap = new Map<
      string,
      { revenue: number; cost: number; profit: number }
    >();
    const storeMap = new Map<
      string,
      { storeName: string; revenue: number; transactions: number }
    >();

    for (const transaction of transactions) {
      // Store breakdown
      const storeId = transaction.storeId;
      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, {
          storeName: transaction.store?.name || 'Unknown',
          revenue: 0,
          transactions: 0,
        });
      }
      const storeData = storeMap.get(storeId)!;
      storeData.revenue += Number(transaction.total);
      storeData.transactions += 1;

      // Category breakdown and COGS
      for (const item of transaction.items) {
        // Note: costPrice not available in TransactionItem, would need to join with Product
        // For now, estimate cost as 60% of unit price
        const cost = Number(item.unitPrice || 0) * item.quantity * 0.6;
        costOfGoodsSold += cost;

        const categoryName = item.productName || 'Uncategorized';
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, { revenue: 0, cost: 0, profit: 0 });
        }

        const categoryData = categoryMap.get(categoryName)!;
        categoryData.revenue += Number(item.subtotal);
        categoryData.cost += cost;
        categoryData.profit = categoryData.revenue - categoryData.cost;
      }
    }

    // Operating expenses (simplified - in real app, would come from expenses table)
    const operatingExpenses = 0; // TODO: Implement expenses tracking

    const totalCost = costOfGoodsSold + operatingExpenses;

    // Calculate profit
    const grossProfit = totalSales - costOfGoodsSold;
    const grossProfitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
    const netProfit = totalSales - totalCost;
    const netProfitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    // Build category breakdown
    const salesByCategory = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.profit,
        margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
      }),
    );

    // Build store breakdown
    const salesByStore = Array.from(storeMap.entries()).map(
      ([storeId, data]) => ({
        storeId,
        storeName: data.storeName,
        revenue: data.revenue,
        transactions: data.transactions,
      }),
    );

    return {
      period: {
        startDate,
        endDate,
      },
      revenue: {
        totalSales,
        totalTransactions,
        averageTransactionValue,
      },
      costs: {
        totalCost,
        costOfGoodsSold,
        operatingExpenses,
      },
      profit: {
        grossProfit,
        grossProfitMargin,
        netProfit,
        netProfitMargin,
      },
      breakdown: {
        salesByCategory: salesByCategory.sort((a, b) => b.revenue - a.revenue),
        salesByStore: salesByStore.sort((a, b) => b.revenue - a.revenue),
      },
    };
  }
}

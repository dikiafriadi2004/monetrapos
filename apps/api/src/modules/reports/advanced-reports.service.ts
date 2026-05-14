import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Employee } from '../employees/employee.entity';
import { Customer } from '../customers/customer.entity';

export interface EmployeePerformanceReport {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  totalSales: number;
  totalTransactions: number;
  averageTransactionValue: number;
  totalWorkHours: number;
  totalDaysWorked: number;
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

export interface MonthlyFinanceData {
  bulan: number;
  namaBulan: string;
  tahun: number;
  periode: string;
  totalTransaksi: number;
  pendapatanKotor: number;
  totalDiskon: number;
  totalPajak: number;
  pendapatanBersih: number;
  hpp: number;
  labaKotor: number;
  biayaOperasional: number;
  labaBersih: number;
  marginLabaKotor: number;
  marginLabaBersih: number;
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

    // endDate harus include seluruh hari terakhir
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Build query for transactions — include semua transaksi, employee bisa dari relasi atau metadata
    const transactionQuery = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.items', 'items')
      .leftJoinAndSelect('transaction.employee', 'employee')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate: endOfDay,
      })
      .andWhere('transaction.status = :status', { status: 'completed' });

    if (employeeId) {
      transactionQuery.andWhere('transaction.employeeId = :employeeId', {
        employeeId,
      });
    }

    const transactions = await transactionQuery.getMany();

    // Kumpulkan semua employee IDs yang valid (ada di tabel employees)
    const allEmployeeIds = new Set(
      (await this.employeeRepository.find({
        where: { companyId },
        select: ['id', 'userId'],
      })).flatMap(e => [e.id, e.userId].filter(Boolean))
    );

    // Group by employee — gunakan relasi employee atau fallback ke metadata
    const employeeMap = new Map<string, EmployeePerformanceReport>();

    for (const transaction of transactions) {
      const emp = transaction.employee;
      const metaEmpId = (transaction as any).metadata?.employeeId;
      const metaEmpName = (transaction as any).metadata?.employeeName;

      if (!emp && !metaEmpId) continue;

      const empId = emp?.id || metaEmpId;

      if (!emp && metaEmpId && !allEmployeeIds.has(metaEmpId)) continue;

      const empName = emp?.name || metaEmpName || 'Unknown';
      const empNumber = emp?.employeeNumber || '';

      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          employeeId: empId,
          employeeNumber: empNumber,
          employeeName: empName,
          totalSales: 0,
          totalTransactions: 0,
          averageTransactionValue: 0,
          totalWorkHours: 0,
          totalDaysWorked: 0,
          salesPerHour: 0,
          topSellingProducts: [],
        });
      }

      const report = employeeMap.get(empId)!;
      report.totalSales += Number(transaction.total);
      report.totalTransactions += 1;
    }

    // Estimate work hours: count unique days with transactions (assume 8h/day)
    for (const [empId, report] of employeeMap.entries()) {
      const empTransactions = transactions.filter(t => {
        const tEmpId = t.employee?.id || (t as any).metadata?.employeeId;
        return tEmpId === empId;
      });
      const uniqueDays = new Set(
        empTransactions.map(t => new Date(t.createdAt).toDateString())
      );
      report.totalDaysWorked = uniqueDays.size;
      report.totalWorkHours = uniqueDays.size * 8; // estimate 8h/day
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

    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all active customers
    const allCustomers = await this.customerRepository.find({
      where: { companyId, isActive: true },
    });

    // Get new customers in period
    const newCustomers = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.companyId = :companyId', { companyId })
      .andWhere('customer.isActive = :isActive', { isActive: true })
      .andWhere('customer.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate: endOfDay,
      })
      .getCount();

    // Get customers who made purchases in period
    const customersWithPurchases = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('DISTINCT transaction.customerId', 'customer_id')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate: endOfDay,
      })
      .andWhere('transaction.status = :status', { status: 'completed' })
      .andWhere('transaction.customerId IS NOT NULL')
      .getRawMany();

    const returningCustomers = customersWithPurchases.filter((c) => {
      const customer = allCustomers.find((ac) => ac.id === c.customer_id);
      return customer && new Date(customer.createdAt) < startDate;
    }).length;

    // Calculate average lifetime value dari actual transactions (bukan cached total_spent)
    const lifetimeResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.customerId', 'customerId')
      .addSelect('SUM(transaction.total)', 'lifetimeTotal')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.status = :status', { status: 'completed' })
      .andWhere('transaction.customerId IS NOT NULL')
      .groupBy('transaction.customerId')
      .getRawMany();

    const totalLifetimeValue = lifetimeResult.reduce((sum, r) => sum + Number(r.lifetimeTotal), 0);
    const averageLifetimeValue =
      lifetimeResult.length > 0 ? totalLifetimeValue / lifetimeResult.length : 0;

    // Top customers by spending in the selected period
    const topCustomersByPeriod = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.customerId', 'customerId')
      .addSelect('SUM(transaction.total)', 'periodSpent')
      .addSelect('COUNT(transaction.id)', 'periodOrders')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate: endOfDay,
      })
      .andWhere('transaction.status = :status', { status: 'completed' })
      .andWhere('transaction.customerId IS NOT NULL')
      .groupBy('transaction.customerId')
      .orderBy('periodSpent', 'DESC')
      .limit(10)
      .getRawMany();

    const topCustomers = topCustomersByPeriod.map((row) => {
      const customer = allCustomers.find((c) => c.id === row.customerId);
      return {
        customerId: row.customerId,
        customerNumber: customer?.customerNumber || '',
        customerName: customer?.name || 'Unknown',
        totalSpent: Number(row.periodSpent),
        totalOrders: Number(row.periodOrders),
        loyaltyTier: customer?.loyaltyTier || 'regular',
        lastPurchaseAt: customer?.lastPurchaseAt || new Date(),
      };
    });

    // Count customers by tier
    const customersByTier = allCustomers.reduce((acc, c) => {
      acc[c.loyaltyTier] = (acc[c.loyaltyTier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate retention rate
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

    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all completed transactions in period
    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.items', 'items')
      .leftJoinAndSelect('transaction.store', 'store')
      .where('transaction.companyId = :companyId', { companyId })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate: endOfDay,
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
        // Use actual cost from product if available (stored in item metadata or product join)
        // TransactionItem stores unitPrice at time of sale; cost is estimated as 60% if not available
        const itemCost = Number((item as any).costPrice || 0) || Number(item.unitPrice || 0) * item.quantity * 0.6;
        costOfGoodsSold += itemCost;

        const categoryName = item.productName || 'Uncategorized';
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, { revenue: 0, cost: 0, profit: 0 });
        }

        const categoryData = categoryMap.get(categoryName)!;
        categoryData.revenue += Number(item.subtotal);
        categoryData.cost += itemCost;
        categoryData.profit = categoryData.revenue - categoryData.cost;
      }
    }

    // Operating expenses: estimated from purchase orders cost in period
    let operatingExpenses = 0;
    try {
      const purchaseResult = await this.transactionRepository.manager
        .createQueryBuilder()
        .select('SUM(po.total_amount)', 'total')
        .from('purchase_orders', 'po')
        .where('po.company_id = :companyId', { companyId })
        .andWhere('po.created_at BETWEEN :startDate AND :endDate', { startDate, endDate: endOfDay })
        .andWhere('po.status IN (:...statuses)', { statuses: ['received', 'completed'] })
        .getRawOne();
      operatingExpenses = Number(purchaseResult?.total || 0);
    } catch {
      operatingExpenses = 0;
    }

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

  /**
   * Laporan Keuangan Bulanan
   * Menampilkan pendapatan kotor, bersih, HPP, dan keuntungan per bulan dalam satu tahun
   */
  async getMonthlyFinanceReport(companyId: string, year: number) {
    const months: MonthlyFinanceData[] = [];

    const MONTH_NAMES = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    for (let month = 1; month <= 12; month++) {
      // Use UTC to avoid timezone issues (server may not be in WIB)
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      // Query transaksi bulan ini
      const txResult = await this.transactionRepository
        .createQueryBuilder('tx')
        .select([
          'COUNT(tx.id) as totalTransactions',
          'COALESCE(SUM(tx.total), 0) as pendapatanKotor',
          'COALESCE(SUM(tx.discount_amount), 0) as totalDiskon',
          'COALESCE(SUM(tx.tax_amount), 0) as totalPajak',
          'COALESCE(SUM(tx.subtotal), 0) as subtotal',
        ])
        .where('tx.companyId = :companyId', { companyId })
        .andWhere('tx.status = :status', { status: 'completed' })
        .andWhere('tx.createdAt BETWEEN :start AND :end', {
          start: startDate,
          end: endDate,
        })
        .getRawOne();

      // Query HPP (Harga Pokok Penjualan) dari transaction items
      const cogResult = await this.transactionRepository.manager.query(`
        SELECT 
          COALESCE(SUM(ti.quantity * COALESCE(p.cost, p.price * 0.6)), 0) as hpp
        FROM transactions tx
        JOIN transaction_items ti ON ti.transaction_id = tx.id
        LEFT JOIN products p ON p.id = ti.\`productId\`
        WHERE tx.company_id = ?
          AND tx.status = 'completed'
          AND tx.created_at BETWEEN ? AND ?
      `, [companyId, startDate, endDate]);

      const pendapatanKotor = parseFloat(txResult?.pendapatanKotor || '0');
      const totalDiskon = parseFloat(txResult?.totalDiskon || '0');
      const totalPajak = parseFloat(txResult?.totalPajak || '0');
      const hpp = parseFloat(cogResult?.[0]?.hpp || '0');

      // Pendapatan bersih = pendapatan kotor - diskon
      const pendapatanBersih = pendapatanKotor - totalDiskon;

      // Laba kotor = pendapatan bersih - HPP
      const labaKotor = pendapatanBersih - hpp;

      // Estimasi biaya operasional - gunakan data expenses nyata jika ada, fallback 10%
      let biayaOperasional = 0;
      try {
        const expenseResult = await this.transactionRepository.manager.query(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM expenses
          WHERE company_id = ?
            AND expense_date BETWEEN ? AND ?
            AND deleted_at IS NULL
        `, [companyId, startDate, endDate]);
        biayaOperasional = parseFloat(expenseResult?.[0]?.total || '0');
      } catch {
        // Tabel expenses belum ada atau kosong - gunakan estimasi 10%
        biayaOperasional = pendapatanBersih * 0.1;
      }
      // Jika tidak ada data expenses, estimasi 10%
      if (biayaOperasional === 0 && pendapatanBersih > 0) {
        biayaOperasional = pendapatanBersih * 0.1;
      }

      // Laba bersih = laba kotor - biaya operasional
      const labaBersih = labaKotor - biayaOperasional;

      // Margin laba bersih
      const marginLabaBersih = pendapatanBersih > 0
        ? (labaBersih / pendapatanBersih) * 100
        : 0;

      // Margin laba kotor
      const marginLabaKotor = pendapatanBersih > 0
        ? (labaKotor / pendapatanBersih) * 100
        : 0;

      months.push({
        bulan: month,
        namaBulan: MONTH_NAMES[month - 1],
        tahun: year,
        periode: `${MONTH_NAMES[month - 1]} ${year}`,
        totalTransaksi: parseInt(txResult?.totalTransactions || '0'),
        pendapatanKotor: Math.round(pendapatanKotor),
        totalDiskon: Math.round(totalDiskon),
        totalPajak: Math.round(totalPajak),
        pendapatanBersih: Math.round(pendapatanBersih),
        hpp: Math.round(hpp),
        labaKotor: Math.round(labaKotor),
        biayaOperasional: Math.round(biayaOperasional),
        labaBersih: Math.round(labaBersih),
        marginLabaKotor: Math.round(marginLabaKotor * 100) / 100,
        marginLabaBersih: Math.round(marginLabaBersih * 100) / 100,
      });
    }

    // Hitung total tahunan
    const totalTahunan = months.reduce(
      (acc, m) => ({
        totalTransaksi: acc.totalTransaksi + m.totalTransaksi,
        pendapatanKotor: acc.pendapatanKotor + m.pendapatanKotor,
        totalDiskon: acc.totalDiskon + m.totalDiskon,
        totalPajak: acc.totalPajak + m.totalPajak,
        pendapatanBersih: acc.pendapatanBersih + m.pendapatanBersih,
        hpp: acc.hpp + m.hpp,
        labaKotor: acc.labaKotor + m.labaKotor,
        biayaOperasional: acc.biayaOperasional + m.biayaOperasional,
        labaBersih: acc.labaBersih + m.labaBersih,
      }),
      {
        totalTransaksi: 0, pendapatanKotor: 0, totalDiskon: 0,
        totalPajak: 0, pendapatanBersih: 0, hpp: 0,
        labaKotor: 0, biayaOperasional: 0, labaBersih: 0,
      },
    );

    const marginLabaKotorTahunan = totalTahunan.pendapatanBersih > 0
      ? (totalTahunan.labaKotor / totalTahunan.pendapatanBersih) * 100
      : 0;

    const marginLabaBersihTahunan = totalTahunan.pendapatanBersih > 0
      ? (totalTahunan.labaBersih / totalTahunan.pendapatanBersih) * 100
      : 0;

    return {
      tahun: year,
      bulanTerbaik: months.reduce((best: MonthlyFinanceData | null, m: MonthlyFinanceData) =>
        m.labaBersih > (best?.labaBersih ?? -Infinity) ? m : best,
        null
      ),
      ringkasanTahunan: {
        ...totalTahunan,
        marginLabaKotor: Math.round(marginLabaKotorTahunan * 100) / 100,
        marginLabaBersih: Math.round(marginLabaBersihTahunan * 100) / 100,
      },
      perBulan: months,
    };
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { Transaction } from './transaction.entity';
import { TransactionItem } from './transaction-item.entity';
import { Product } from '../products/product.entity';
import { Customer } from '../customers/customer.entity';
import { Employee } from '../employees/employee.entity';
import { TransactionStatus } from '../../common/enums';
import { CreateTransactionDto, VoidTransactionDto } from './dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionItem)
    private transactionItemRepo: Repository<TransactionItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate unique transaction number
      const transactionNumber = await this.generateTransactionNumber(
        dto.storeId,
      );

      // Calculate totals to verify client calculations
      const calculatedTotals = this.calculateTotal(dto);

      // Validate calculations (allow small rounding differences)
      if (Math.abs(calculatedTotals.total - dto.total) > 0.01) {
        throw new BadRequestException(
          `Total mismatch. Expected: ${calculatedTotals.total}, Received: ${dto.total}`,
        );
      }

      // Validate and update stock for each item
      const productUpdates: { product: Product; quantity: number }[] = [];
      for (const item of dto.items) {
        if (!item.productId) continue;

        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' }, // Lock row to prevent race conditions
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        const currentStock = product.stock || 0;
        if (currentStock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Available: ${currentStock}, Required: ${item.quantity}`,
          );
        }

        // Deduct stock atomically
        product.stock = currentStock - item.quantity;
        await queryRunner.manager.save(Product, product);
        productUpdates.push({ product, quantity: item.quantity });
      }

      // Update customer loyalty points if customer provided
      let loyaltyPointsEarned = 0;
      if (dto.customerId) {
        const customer = await queryRunner.manager.findOne(Customer, {
          where: { id: dto.customerId },
        });

        if (customer) {
          // Calculate loyalty points: 1 point per 10,000 IDR spent
          loyaltyPointsEarned = Math.floor(dto.total / 10000);
          customer.loyaltyPoints = (customer.loyaltyPoints || 0) + loyaltyPointsEarned;
          await queryRunner.manager.save(Customer, customer);
        }
      }

      // Validate shiftId if provided — set null if shift doesn't exist
      let validShiftId: string | null = null;
      if (dto.shiftId) {
        const shiftExists = await queryRunner.manager.query(
          `SELECT id FROM shifts WHERE id = ? LIMIT 1`,
          [dto.shiftId]
        );
        if (shiftExists?.length > 0) validShiftId = dto.shiftId;
      }

      // Get companyId from store using queryRunner to stay within transaction
      const storeRows = await queryRunner.manager.query(
        `SELECT company_id FROM stores WHERE id = ? LIMIT 1`,
        [dto.storeId]
      );
      const companyId: string = storeRows?.[0]?.company_id || storeRows?.[0]?.companyId || '';
      if (!companyId) {
        throw new BadRequestException(`Store ${dto.storeId} not found`);
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(dto.storeId);

      // Normalize payment method — map frontend values ke enum yang valid di DB
      // DB enum: cash, qris, edc, bank_transfer, e_wallet (sesuai PaymentMethodType di transaction.entity.ts)
      const paymentMethodMap: Record<string, string> = {
        cash: 'cash',
        qris: 'qris',
        edc: 'edc',
        card: 'edc',
        bank_transfer: 'bank_transfer',
        transfer: 'bank_transfer',
        ewallet: 'e_wallet',
        e_wallet: 'e_wallet',
        other: 'cash',   // fallback 'other' ke 'cash' agar tidak gagal enum
      };
      const rawMethod = (dto.paymentMethod as string)?.toLowerCase() || 'cash';
      // Try exact match first, then check if it contains known keywords, else default to 'cash'
      let normalizedPaymentMethod = paymentMethodMap[rawMethod];
      if (!normalizedPaymentMethod) {
        if (rawMethod.includes('qris')) normalizedPaymentMethod = 'qris';
        else if (rawMethod.includes('transfer') || rawMethod.includes('bank')) normalizedPaymentMethod = 'bank_transfer';
        else if (rawMethod.includes('wallet') || rawMethod.includes('pay') || rawMethod.includes('ovo') || rawMethod.includes('dana') || rawMethod.includes('gopay')) normalizedPaymentMethod = 'e_wallet';
        else if (rawMethod.includes('card') || rawMethod.includes('edc') || rawMethod.includes('debit') || rawMethod.includes('credit')) normalizedPaymentMethod = 'edc';
        else normalizedPaymentMethod = 'cash'; // safe fallback
      }

      // Resolve employeeId — frontend sends user.id, but transactions.employee_id FK points to employees table
      // Look up employee by userId first, then try direct employee ID match
      let resolvedEmployeeId: string | null = null;
      if (dto.employeeId) {
        // Try: is it a direct employee ID?
        const empById = await queryRunner.manager.findOne(Employee, {
          where: { id: dto.employeeId },
        });
        if (empById) {
          resolvedEmployeeId = empById.id;
        } else {
          // Try: is it a user ID linked to an employee?
          const empByUserId = await queryRunner.manager.findOne(Employee, {
            where: { userId: dto.employeeId, companyId },
          });
          if (empByUserId) {
            resolvedEmployeeId = empByUserId.id;
          }
          // If neither found, leave null — don't fail the transaction
        }
      }

      // Create transaction using TypeORM entity manager to avoid raw SQL column name issues
      const crypto = require('crypto') as any;
      const txId = crypto.randomUUID();

      const txEntity = queryRunner.manager.create(Transaction);
      txEntity.id = txId;
      txEntity.companyId = companyId;
      txEntity.storeId = dto.storeId;
      txEntity.shiftId = validShiftId as any;
      txEntity.employeeId = resolvedEmployeeId as any;
      txEntity.transactionNumber = transactionNumber;
      txEntity.invoiceNumber = invoiceNumber;
      txEntity.subtotal = calculatedTotals.subtotal;
      txEntity.taxAmount = calculatedTotals.taxAmount;
      txEntity.discountAmount = calculatedTotals.discountAmount;
      txEntity.serviceCharge = 0;
      txEntity.total = calculatedTotals.total;
      txEntity.paymentMethod = normalizedPaymentMethod as any;
      txEntity.paidAmount = dto.paidAmount;
      txEntity.changeAmount = dto.changeAmount || 0;
      txEntity.customerId = dto.customerId || null as any;
      txEntity.customerName = dto.customerName || null as any;
      txEntity.customerPhone = dto.customerPhone || null as any;
      txEntity.status = TransactionStatus.COMPLETED;
      txEntity.notes = dto.notes || null as any;
      txEntity.metadata = {
        loyaltyPointsEarned,
        orderType: (dto as any).orderType,
        tableId: (dto as any).tableId,
        employeeId: dto.employeeId,
        employeeName: (dto as any).employeeName,
        paymentMethods: dto.paymentMethods || [{ method: dto.paymentMethod, amount: dto.paidAmount }],
      };
      await queryRunner.manager.save(Transaction, txEntity);

      // Create transaction items
      for (const item of dto.items) {
        const itemEntity = queryRunner.manager.create(TransactionItem);
        itemEntity.transactionId = txId;
        itemEntity.productId = item.productId || null as any;
        itemEntity.productName = item.productName;
        itemEntity.variantName = item.variantName || null as any;
        itemEntity.quantity = item.quantity;
        itemEntity.unitPrice = item.unitPrice;
        itemEntity.discountAmount = item.discountAmount || 0;
        itemEntity.subtotal = item.subtotal;
        itemEntity.notes = item.notes || null as any;
        await queryRunner.manager.save(TransactionItem, itemEntity);
      }

      await queryRunner.commitTransaction();

      // Reload with relations
      return this.findOne(txId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Calculate transaction totals with proper rounding
   * Formula:
   * 1. Calculate item subtotals: (unitPrice * quantity) - itemDiscount
   * 2. Sum all item subtotals = subtotal
   * 3. Apply transaction-level discount
   * 4. Calculate tax on discounted subtotal
   * 5. Total = subtotal - transactionDiscount + tax
   */
  calculateTotal(dto: CreateTransactionDto): {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
  } {
    // Calculate subtotal from items
    let subtotal = 0;
    for (const item of dto.items) {
      const itemSubtotal = item.quantity * item.unitPrice - (item.discountAmount || 0);
      subtotal += itemSubtotal;
    }

    // Round to 2 decimal places
    subtotal = Math.round(subtotal * 100) / 100;

    // Transaction-level discount
    const discountAmount = dto.discountAmount || 0;

    // Calculate tax on discounted amount
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = dto.taxAmount || 0;

    // Calculate total
    const total = Math.round((taxableAmount + taxAmount) * 100) / 100;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total,
    };
  }

  async findAllByStore(
    storeId: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: any = { storeId };

    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    }

    const [data, total] = await this.transactionRepo.findAndCount({
      where,
      relations: ['items'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  async findByInvoice(invoiceNumber: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { invoiceNumber },
      relations: ['items'],
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  async voidTransaction(
    id: string,
    dto: VoidTransactionDto,
  ): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { id },
        relations: ['items'],
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      if (transaction.status === TransactionStatus.VOIDED) {
        throw new BadRequestException('Transaction is already voided');
      }

      if (transaction.status !== TransactionStatus.COMPLETED) {
        throw new BadRequestException(
          'Only completed transactions can be voided',
        );
      }

      // Restore inventory for each item
      for (const item of transaction.items) {
        if (!item.productId) continue;

        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' },
        });

        if (product) {
          product.stock = (product.stock || 0) + item.quantity;
          await queryRunner.manager.save(Product, product);
        }
      }

      // Restore customer loyalty points if applicable
      if (transaction.customerId && transaction.metadata?.loyaltyPointsEarned) {
        const customer = await queryRunner.manager.findOne(Customer, {
          where: { id: transaction.customerId },
        });

        if (customer) {
          customer.loyaltyPoints = Math.max(
            0,
            (customer.loyaltyPoints || 0) - transaction.metadata.loyaltyPointsEarned,
          );
          await queryRunner.manager.save(Customer, customer);
        }
      }

      // Update transaction status
      transaction.status = TransactionStatus.VOIDED;
      transaction.voidReason = dto.reason;
      transaction.voidedAt = new Date();
      if (dto.voidedBy) {
        transaction.voidedBy = dto.voidedBy;
      }

      const updated = await queryRunner.manager.save(Transaction, transaction);

      await queryRunner.commitTransaction();
      return updated;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async refundTransaction(
    id: string,
    dto?: VoidTransactionDto,
  ): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { id },
        relations: ['items'],
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      if (transaction.status === TransactionStatus.REFUNDED) {
        throw new BadRequestException('Transaction is already refunded');
      }

      if (transaction.status !== TransactionStatus.COMPLETED) {
        throw new BadRequestException(
          'Only completed transactions can be refunded',
        );
      }

      // Restore inventory for each item
      for (const item of transaction.items) {
        if (!item.productId) continue;

        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' },
        });

        if (product) {
          product.stock = (product.stock || 0) + item.quantity;
          await queryRunner.manager.save(Product, product);
        }
      }

      // Restore customer loyalty points if applicable
      if (transaction.customerId && transaction.metadata?.loyaltyPointsEarned) {
        const customer = await queryRunner.manager.findOne(Customer, {
          where: { id: transaction.customerId },
        });

        if (customer) {
          customer.loyaltyPoints = Math.max(
            0,
            (customer.loyaltyPoints || 0) - transaction.metadata.loyaltyPointsEarned,
          );
          await queryRunner.manager.save(Customer, customer);
        }
      }

      // Update transaction status
      transaction.status = TransactionStatus.REFUNDED;
      if (dto) {
        transaction.voidReason = dto.reason;
        if (dto.voidedBy) {
          transaction.voidedBy = dto.voidedBy;
        }
      }
      transaction.voidedAt = new Date();

      const updated = await queryRunner.manager.save(Transaction, transaction);

      await queryRunner.commitTransaction();
      return updated;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getSalesReport(storeId: string, startDate: string, endDate: string) {
    const result = await this.transactionRepo
      .createQueryBuilder('tx')
      .select([
        'COUNT(tx.id) as totalTransactions',
        'SUM(tx.total) as totalRevenue',
        'SUM(tx.taxAmount) as totalTax',
        'SUM(tx.discountAmount) as totalDiscount',
        'AVG(tx.total) as averageTransaction',
      ])
      .where('tx.storeId = :storeId', { storeId })
      .andWhere('tx.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return result;
  }

  private async generateInvoiceNumber(storeId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${dateStr}`;

    const rows = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM transactions WHERE invoice_number LIKE ? AND store_id = ?`,
      [`${prefix}%`, storeId]
    );
    const count = parseInt(rows?.[0]?.cnt || '0', 10);
    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}-${seq}`;
  }

  /**
   * Generate unique transaction number
   * Format: TRX-YYYYMMDD-XXXX
   */
  private async generateTransactionNumber(storeId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `TRX-${dateStr}`;

    const rows = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM transactions WHERE transaction_number LIKE ? AND store_id = ?`,
      [`${prefix}%`, storeId]
    );
    const count = parseInt(rows?.[0]?.cnt || '0', 10);
    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}-${seq}`;
  }

  /**
   * Generate receipt data for printing
   */
  async getReceipt(id: string): Promise<any> {
    const transaction = await this.transactionRepo.findOne({
      where: { id },
      relations: ['items', 'store', 'employee', 'customer'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      transactionNumber: transaction.transactionNumber,
      invoiceNumber: transaction.invoiceNumber,
      date: transaction.createdAt,
      store: {
        name: transaction.store?.name,
        address: transaction.store?.address,
        phone: transaction.store?.phone,
      },
      employee: transaction.employee?.name,
      customer: {
        name: transaction.customerName || transaction.customer?.name,
        phone: transaction.customerPhone || transaction.customer?.phone,
      },
      items: transaction.items.map((item) => ({
        name: item.productName,
        variant: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discountAmount,
        subtotal: item.subtotal,
      })),
      subtotal: transaction.subtotal,
      discount: transaction.discountAmount,
      tax: transaction.taxAmount,
      total: transaction.total,
      paymentMethod: transaction.paymentMethod,
      paidAmount: transaction.paidAmount,
      changeAmount: transaction.changeAmount,
      status: transaction.status,
      notes: transaction.notes,
      loyaltyPointsEarned: transaction.metadata?.loyaltyPointsEarned || 0,
    };
  }
}

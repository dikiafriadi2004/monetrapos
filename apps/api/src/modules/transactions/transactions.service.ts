import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
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
import { NotificationsService } from '../notifications/notifications.service';
import { FnbOrder, OrderStatus as FnbOrderStatus } from '../fnb/fnb-order.entity';
import { Table, TableStatus } from '../fnb/table.entity';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionItem)
    private transactionItemRepo: Repository<TransactionItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    @InjectRepository(FnbOrder) private fnbOrderRepo: Repository<FnbOrder>,
    @InjectRepository(Table) private tableRepo: Repository<Table>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
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
          // Product not found — skip stock deduction (may be a custom/deleted item)
          this.logger.warn(`Product ${item.productId} not found — skipping stock deduction for "${item.productName}"`);
          continue;
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
          // Tier multiplier
          const tierMultiplier: Record<string, number> = {
            regular: 1, silver: 1.25, gold: 1.5, platinum: 2,
          };
          const multiplier = tierMultiplier[customer.loyaltyTier] || 1;

          // 1 poin per Rp 10.000, dikali multiplier tier
          loyaltyPointsEarned = Math.floor((dto.total / 10000) * multiplier);
          customer.loyaltyPoints = (customer.loyaltyPoints || 0) + loyaltyPointsEarned;

          // Update total spent dan total orders — gunakan increment SQL agar aman dari race condition
          await queryRunner.manager.query(
            `UPDATE customers SET 
              total_spent = total_spent + ?,
              total_orders = total_orders + 1,
              last_purchase_at = NOW(),
              first_purchase_at = COALESCE(first_purchase_at, NOW())
            WHERE id = ?`,
            [dto.total, dto.customerId]
          );

          // Reload customer untuk update tier
          const updatedCustomer = await queryRunner.manager.findOne(Customer, {
            where: { id: dto.customerId },
          });
          if (updatedCustomer) {
            const newTotalSpent = Number(updatedCustomer.totalSpent);
            let newTier = 'regular';
            if (newTotalSpent >= 50000000) newTier = 'platinum';
            else if (newTotalSpent >= 15000000) newTier = 'gold';
            else if (newTotalSpent >= 5000000) newTier = 'silver';

            if (newTier !== updatedCustomer.loyaltyTier) {
              await queryRunner.manager.query(
                'UPDATE customers SET loyalty_tier = ? WHERE id = ?',
                [newTier, dto.customerId]
              );
            }
          }
        }
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

      // Check if there's an existing pending transaction for this FnB order
      const fnbOrderId = dto.fnbOrderId as string | undefined;
      let txId: string = '';
      let isExistingTx = false;

      if (fnbOrderId) {
        // Look for existing pending transaction linked to this FnB order
        const existingTx = await queryRunner.manager
          .createQueryBuilder(Transaction, 'tx')
          .where(`JSON_EXTRACT(tx.metadata, '$.fnbOrderId') = :fnbOrderId`, { fnbOrderId })
          .andWhere('tx.status = :status', { status: 'pending' })
          .getOne();

        if (existingTx) {
          // Update the existing pending transaction instead of creating a new one
          txId = existingTx.id;
          isExistingTx = true;

          existingTx.companyId = companyId;
          existingTx.storeId = dto.storeId;          existingTx.employeeId = resolvedEmployeeId as any;
          existingTx.transactionNumber = transactionNumber;
          existingTx.invoiceNumber = invoiceNumber;
          existingTx.subtotal = calculatedTotals.subtotal;
          existingTx.taxAmount = calculatedTotals.taxAmount;
          existingTx.discountAmount = calculatedTotals.discountAmount;
          existingTx.serviceCharge = 0;
          existingTx.total = calculatedTotals.total;
          existingTx.paymentMethod = normalizedPaymentMethod as any;
          existingTx.paidAmount = dto.paidAmount;
          existingTx.changeAmount = dto.changeAmount || 0;
          existingTx.customerId = dto.customerId || null as any;
          existingTx.customerName = dto.customerName || null as any;
          existingTx.customerPhone = dto.customerPhone || null as any;
          existingTx.status = TransactionStatus.COMPLETED;
          existingTx.notes = dto.notes || null as any;
          existingTx.metadata = {
            ...existingTx.metadata,
            loyaltyPointsEarned,
            orderType: dto.orderType,
            tableId: dto.tableId,
            fnbOrderId,
            employeeId: dto.employeeId,
            employeeName: (dto as any).employeeName,
            paymentMethods: dto.paymentMethods || [{ method: dto.paymentMethod, amount: dto.paidAmount }],
          };
          await queryRunner.manager.save(Transaction, existingTx);

          // Remove old items and replace with current cart items
          await queryRunner.manager.delete(TransactionItem, { transactionId: txId });
        }
      }

      if (!isExistingTx) {
        // Create new transaction
        const crypto = require('crypto') as any;
        txId = crypto.randomUUID();

        const txEntity = queryRunner.manager.create(Transaction);
        txEntity.id = txId;
        txEntity.companyId = companyId;
        txEntity.storeId = dto.storeId;        txEntity.employeeId = resolvedEmployeeId as any;
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
          orderType: dto.orderType,
          tableId: dto.tableId,
          fnbOrderId: fnbOrderId || undefined,
          employeeId: dto.employeeId,
          employeeName: (dto as any).employeeName,
          paymentMethods: dto.paymentMethods || [{ method: dto.paymentMethod, amount: dto.paidAmount }],
        };
        await queryRunner.manager.save(Transaction, txEntity);
      }

      // Create transaction items
      for (const item of dto.items) {
        const itemEntity = queryRunner.manager.create(TransactionItem);
        itemEntity.transactionId = txId!;
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
      const savedTx = await this.findOne(txId!);

      // Auto-complete FnB order after successful payment (non-blocking)
      const tableId = dto.tableId;
      const orderType = dto.orderType;
      // Always try to complete FnB order if this is an FnB transaction
      if (fnbOrderId || tableId || orderType) {
        this.autoCompleteFnbOrder(fnbOrderId, tableId, dto.storeId, companyId)
          .catch(e => this.logger.warn(`Failed to auto-complete FnB order: ${e.message}`));
      }

      // Check low stock for each sold product (non-blocking, background)
      this.checkLowStockAfterSale(companyId, dto.storeId, dto.items).catch(e =>
        this.logger.warn(`Low stock check failed: ${e.message}`)
      );

      return savedTx;
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
      // Set start ke awal hari (00:00:00) dan end ke akhir hari (23:59:59.999)
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      where.createdAt = Between(start, end);
    } else if (startDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      where.createdAt = Between(start, new Date());
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

      // Restore customer loyalty points dan total_spent jika applicable
      if (transaction.customerId) {
        const customer = await queryRunner.manager.findOne(Customer, {
          where: { id: transaction.customerId },
        });

        if (customer) {
          // Kurangi loyalty points
          if (transaction.metadata?.loyaltyPointsEarned) {
            customer.loyaltyPoints = Math.max(
              0,
              (customer.loyaltyPoints || 0) - transaction.metadata.loyaltyPointsEarned,
            );
          }
          await queryRunner.manager.save(Customer, customer);

          // Kurangi total_spent dan total_orders via SQL atomic
          await queryRunner.manager.query(
            `UPDATE customers SET
              total_spent = GREATEST(0, total_spent - ?),
              total_orders = GREATEST(0, total_orders - 1)
            WHERE id = ?`,
            [transaction.total, transaction.customerId],
          );
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

      // Restore customer loyalty points dan total_spent jika applicable
      if (transaction.customerId) {
        const customer = await queryRunner.manager.findOne(Customer, {
          where: { id: transaction.customerId },
        });

        if (customer) {
          // Kurangi loyalty points
          if (transaction.metadata?.loyaltyPointsEarned) {
            customer.loyaltyPoints = Math.max(
              0,
              (customer.loyaltyPoints || 0) - transaction.metadata.loyaltyPointsEarned,
            );
          }
          await queryRunner.manager.save(Customer, customer);

          // Kurangi total_spent dan total_orders via SQL atomic
          await queryRunner.manager.query(
            `UPDATE customers SET
              total_spent = GREATEST(0, total_spent - ?),
              total_orders = GREATEST(0, total_orders - 1)
            WHERE id = ?`,
            [transaction.total, transaction.customerId],
          );
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
    // Set start ke awal hari dan end ke akhir hari
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

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
      .andWhere('tx.createdAt BETWEEN :start AND :end', { start, end })
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
      items: (transaction.items || []).map((item) => ({
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

  /**
   * Auto-complete FnB order after successful payment.
   * Tries by fnbOrderId first, then by active order on the same table.
   */
  private async autoCompleteFnbOrder(
    fnbOrderId: string | undefined,
    tableId: string | undefined,
    storeId: string,
    companyId: string,
  ): Promise<void> {
    const activeStatuses = [
      FnbOrderStatus.PENDING,
      FnbOrderStatus.PREPARING,
      FnbOrderStatus.READY,
      FnbOrderStatus.SERVED,
    ];

    if (fnbOrderId) {
      const order = await this.fnbOrderRepo.findOne({ where: { id: fnbOrderId } });
      await this.fnbOrderRepo.update(
        { id: fnbOrderId },
        { status: FnbOrderStatus.COMPLETED, completed_at: new Date() },
      );
      this.logger.log(`FnB order ${fnbOrderId} auto-completed after payment`);
      // Free table if dine-in
      if (order?.table_id) {
        await this.tableRepo.update(
          { id: order.table_id },
          { status: TableStatus.AVAILABLE, current_transaction_id: null },
        ).catch(() => {});
      }
      return;
    }

    if (tableId) {
      const order = await this.fnbOrderRepo.findOne({
        where: { store_id: storeId, table_id: tableId } as any,
        order: { created_at: 'DESC' } as any,
      });
      if (order && activeStatuses.includes(order.status)) {
        await this.fnbOrderRepo.update(
          { id: order.id },
          { status: FnbOrderStatus.COMPLETED, completed_at: new Date() },
        );
        await this.tableRepo.update(
          { id: tableId },
          { status: TableStatus.AVAILABLE, current_transaction_id: null },
        ).catch(() => {});
        this.logger.log(`FnB order ${order.id} (table ${tableId}) auto-completed after payment`);
      }
      return;
    }

    // No fnbOrderId or tableId — cannot safely determine which order to complete
    this.logger.warn(`autoCompleteFnbOrder: no fnbOrderId or tableId provided, skipping auto-complete`);
  }

  /**
   * Check low stock after a sale and send in-app + email notifications
   */
  private async checkLowStockAfterSale(
    companyId: string,
    storeId: string,
    items: Array<{ productId?: string; productName: string; quantity: number }>,
  ): Promise<void> {
    for (const item of items) {
      if (!item.productId) continue;
      try {
        const product = await this.productRepo.findOne({
          where: { id: item.productId },
        });
        if (!product || !product.trackInventory) continue;

        const currentStock = product.stock || 0;
        if (currentStock <= product.lowStockThreshold) {
          this.logger.warn(
            `Low stock: ${product.name} — stok ${currentStock} (threshold: ${product.lowStockThreshold})`,
          );

          // Save in-app notification
          await this.notificationsService.createInAppNotification({
            companyId,
            type: 'low_stock',
            title: `⚠️ Stok Rendah: ${product.name}`,
            message: `Stok ${product.name} tersisa ${currentStock} unit (batas minimum: ${product.lowStockThreshold}).`,
            data: { productId: product.id, productName: product.name, currentStock, threshold: product.lowStockThreshold, storeId },
          });

          // Send email alert (non-blocking)
          const companyRows = await this.dataSource.query(
            `SELECT email FROM companies WHERE id = ? LIMIT 1`,
            [companyId],
          );
          const email = companyRows?.[0]?.email;
          if (email) {
            this.notificationsService.sendLowStockAlert(email, product.name, currentStock)
              .catch(e => this.logger.warn(`Low stock email failed: ${e.message}`));
          }
        }
      } catch (e) {
        this.logger.warn(`checkLowStockAfterSale error for product ${item.productId}: ${(e as any).message}`);
      }
    }
  }
}

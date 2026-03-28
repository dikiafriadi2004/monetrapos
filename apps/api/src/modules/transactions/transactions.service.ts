import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { Transaction } from './transaction.entity';
import { TransactionItem } from './transaction-item.entity';
import { Product } from '../products/product.entity';
import { TransactionStatus } from '../../common/enums';
import { CreateTransactionDto, VoidTransactionDto } from './dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionItem) private transactionItemRepo: Repository<TransactionItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const invoiceNumber = await this.generateInvoiceNumber(dto.storeId);

      // Validate and update stock for each item
      for (const item of dto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
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

        // Deduct stock
        product.stock = currentStock - item.quantity;
        await queryRunner.manager.save(Product, product);
      }

      // Create transaction
      const transaction = queryRunner.manager.create(Transaction, {
        invoiceNumber,
        storeId: dto.storeId,
        paymentMethod: dto.paymentMethod as any,
        subtotal: dto.subtotal,
        taxAmount: dto.taxAmount || 0,
        discountAmount: dto.discountAmount || 0,
        total: dto.total,
        paidAmount: dto.paidAmount,
        changeAmount: dto.changeAmount || 0,
        notes: dto.notes,
        employeeId: dto.employeeId,
        status: TransactionStatus.COMPLETED,
      } as any);

      const savedTransaction = await queryRunner.manager.save(Transaction, transaction);

      await queryRunner.commitTransaction();
      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllByStore(
    storeId: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Transaction[]; total: number; page: number; limit: number }> {
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

  async voidTransaction(id: string, dto: VoidTransactionDto): Promise<Transaction> {
    const transaction = await this.findOne(id);
    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException('Only completed transactions can be voided');
    }
    transaction.status = TransactionStatus.VOIDED;
    transaction.voidReason = dto.reason;
    return this.transactionRepo.save(transaction);
  }

  async refundTransaction(id: string): Promise<Transaction> {
    const transaction = await this.findOne(id);
    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException('Only completed transactions can be refunded');
    }
    transaction.status = TransactionStatus.REFUNDED;
    return this.transactionRepo.save(transaction);
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
      .andWhere('tx.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return result;
  }

  private async generateInvoiceNumber(storeId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${dateStr}`;

    const count = await this.transactionRepo
      .createQueryBuilder('tx')
      .where('tx.invoiceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .andWhere('tx.storeId = :storeId', { storeId })
      .getCount();

    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}-${seq}`;
  }
}

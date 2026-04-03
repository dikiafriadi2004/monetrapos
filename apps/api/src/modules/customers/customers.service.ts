import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { LoyaltyPointTransaction, LoyaltyPointTransactionType } from './loyalty-point-transaction.entity';
import { Transaction } from '../transactions/transaction.entity';
import { CreateCustomerDto, UpdateCustomerDto, AddPointsDto, RedeemPointsDto } from './dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(LoyaltyPointTransaction)
    private loyaltyPointTransactionRepo: Repository<LoyaltyPointTransaction>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
  ) {}

  async create(dto: CreateCustomerDto, companyId: string): Promise<Customer> {
    const customerNumber = await this.generateCustomerNumber(companyId);
    
    const customer = this.customerRepo.create({
      ...dto,
      companyId,
      customerNumber,
    });
    return this.customerRepo.save(customer);
  }

  private async generateCustomerNumber(companyId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Find the last customer number for today
    const lastCustomer = await this.customerRepo
      .createQueryBuilder('customer')
      .where('customer.companyId = :companyId', { companyId })
      .andWhere('customer.customerNumber LIKE :pattern', { pattern: `CUST-${dateStr}-%` })
      .orderBy('customer.customerNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastCustomer) {
      const lastSequence = parseInt(lastCustomer.customerNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `CUST-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  async findAll(
    companyId: string,
    options?: {
      storeId?: string;
      page?: number;
      limit?: number;
      search?: string;
    },
  ): Promise<{ data: Customer[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.customerRepo
      .createQueryBuilder('customer')
      .where('customer.companyId = :companyId', { companyId });

    if (options?.storeId) {
      queryBuilder.andWhere('customer.storeId = :storeId', { storeId: options.storeId });
    }

    if (options?.search) {
      queryBuilder.andWhere(
        '(customer.name ILIKE :search OR customer.phone ILIKE :search OR customer.email ILIKE :search OR customer.customerNumber ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .orderBy('customer.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, companyId: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id, companyId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findByPhone(
    phone: string,
    companyId: string,
  ): Promise<Customer | null> {
    return this.customerRepo.findOne({ where: { phone, companyId } });
  }

  async addPoints(
    id: string,
    companyId: string,
    dto: AddPointsDto,
    performedBy?: string,
  ): Promise<Customer> {
    const customer = await this.findOne(id, companyId);
    const oldPoints = customer.loyaltyPoints || 0;
    customer.loyaltyPoints = oldPoints + dto.points;
    customer.totalSpent = (customer.totalSpent || 0) + (dto.amount || 0);
    customer.totalOrders = (customer.totalOrders || 0) + 1;
    customer.lastPurchaseAt = new Date();
    if (!customer.firstPurchaseAt) {
      customer.firstPurchaseAt = new Date();
    }

    // Update tier based on total spent
    customer.loyaltyTier = this.calculateTier(customer.totalSpent);

    const savedCustomer = await this.customerRepo.save(customer);

    // Log loyalty point transaction
    await this.logLoyaltyPointTransaction({
      customerId: id,
      companyId,
      type: LoyaltyPointTransactionType.EARN,
      points: dto.points,
      balanceAfter: customer.loyaltyPoints,
      referenceType: dto.referenceType || 'manual',
      referenceId: dto.referenceId,
      description: dto.description || `Earned ${dto.points} points`,
      performedBy,
    });

    return savedCustomer;
  }

  async redeemPoints(
    id: string,
    companyId: string,
    dto: RedeemPointsDto,
    performedBy?: string,
  ): Promise<Customer> {
    const customer = await this.findOne(id, companyId);
    if (customer.loyaltyPoints < dto.points) {
      throw new Error('Insufficient points');
    }
    customer.loyaltyPoints -= dto.points;
    const savedCustomer = await this.customerRepo.save(customer);

    // Log loyalty point transaction
    await this.logLoyaltyPointTransaction({
      customerId: id,
      companyId,
      type: LoyaltyPointTransactionType.REDEEM,
      points: dto.points,
      balanceAfter: customer.loyaltyPoints,
      referenceType: dto.referenceType || 'manual',
      referenceId: dto.referenceId,
      description: dto.description || `Redeemed ${dto.points} points`,
      performedBy,
    });

    return savedCustomer;
  }

  async update(
    id: string,
    companyId: string,
    dto: UpdateCustomerDto,
  ): Promise<Customer> {
    const customer = await this.findOne(id, companyId);
    Object.assign(customer, dto);
    return this.customerRepo.save(customer);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const customer = await this.findOne(id, companyId);
    await this.customerRepo.softRemove(customer);
  }

  /**
   * Get purchase history for a customer
   */
  async getPurchaseHistory(
    customerId: string,
    companyId: string,
    options?: {
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: Transaction[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.transactionRepo.findAndCount({
      where: {
        customerId,
        companyId,
      },
      relations: ['items', 'store'],
      order: {
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /**
   * Get loyalty point transaction history
   */
  async getLoyaltyPointHistory(
    customerId: string,
    companyId: string,
    options?: {
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: LoyaltyPointTransaction[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await this.loyaltyPointTransactionRepo.findAndCount({
      where: {
        customerId,
        companyId,
      },
      order: {
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /**
   * Log a loyalty point transaction
   */
  private async logLoyaltyPointTransaction(data: {
    customerId: string;
    companyId: string;
    type: LoyaltyPointTransactionType;
    points: number;
    balanceAfter: number;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    performedBy?: string;
  }): Promise<LoyaltyPointTransaction> {
    const transaction = this.loyaltyPointTransactionRepo.create(data);
    return this.loyaltyPointTransactionRepo.save(transaction);
  }

  /**
   * Calculate customer tier based on total spent
   * Regular: 0 - 5M
   * Silver: 5M - 15M
   * Gold: 15M - 50M
   * Platinum: 50M+
   */
  private calculateTier(totalSpent: number): string {
    if (totalSpent >= 50000000) return 'platinum';
    if (totalSpent >= 15000000) return 'gold';
    if (totalSpent >= 5000000) return 'silver';
    return 'regular';
  }

  /**
   * Verify customer_number uniqueness
   */
  async isCustomerNumberUnique(customerNumber: string): Promise<boolean> {
    const count = await this.customerRepo.count({
      where: { customerNumber },
    });
    return count === 0;
  }
}

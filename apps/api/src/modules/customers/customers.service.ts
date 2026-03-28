import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { AddPointsDto, RedeemPointsDto } from './dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
  ) {}

  async create(data: Partial<Customer>, companyId: string): Promise<Customer> {
    const customer = this.customerRepo.create({
      ...data,
      companyId,
    });
    return this.customerRepo.save(customer);
  }

  async findAll(companyId: string, storeId?: string): Promise<Customer[]> {
    const where: any = { companyId };
    if (storeId) where.storeId = storeId;
    return this.customerRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, companyId: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({ where: { id, companyId } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findByPhone(phone: string, companyId: string): Promise<Customer | null> {
    return this.customerRepo.findOne({ where: { phone, companyId } });
  }

  async addPoints(id: string, companyId: string, dto: AddPointsDto): Promise<Customer> {
    const customer = await this.findOne(id, companyId);
    customer.loyaltyPoints = (customer.loyaltyPoints || 0) + dto.points;
    customer.totalSpent = (customer.totalSpent || 0) + (dto.amount || 0);
    customer.totalOrders = (customer.totalOrders || 0) + 1;
    customer.lastPurchaseAt = new Date();
    if (!customer.firstPurchaseAt) {
      customer.firstPurchaseAt = new Date();
    }
    return this.customerRepo.save(customer);
  }

  async redeemPoints(id: string, companyId: string, dto: RedeemPointsDto): Promise<Customer> {
    const customer = await this.findOne(id, companyId);
    if (customer.loyaltyPoints < dto.points) {
      throw new Error('Insufficient points');
    }
    customer.loyaltyPoints -= dto.points;
    return this.customerRepo.save(customer);
  }

  async update(id: string, companyId: string, data: Partial<Customer>): Promise<Customer> {
    const customer = await this.findOne(id, companyId);
    Object.assign(customer, data);
    return this.customerRepo.save(customer);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const customer = await this.findOne(id, companyId);
    await this.customerRepo.softRemove(customer);
  }
}

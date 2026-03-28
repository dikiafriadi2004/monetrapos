import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Discount } from './discount.entity';
import { CreateDiscountDto, UpdateDiscountDto } from './dto';

@Injectable()
export class DiscountsService {
  constructor(
    @InjectRepository(Discount) private discountRepo: Repository<Discount>,
  ) {}

  async create(dto: CreateDiscountDto): Promise<Discount> {
    const discount = this.discountRepo.create(dto);
    return this.discountRepo.save(discount);
  }

  async findAllByStore(storeId: string): Promise<Discount[]> {
    return this.discountRepo.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Discount> {
    const discount = await this.discountRepo.findOne({ where: { id } });
    if (!discount) throw new NotFoundException('Discount not found');
    return discount;
  }

  async findActiveByStore(storeId: string): Promise<Discount[]> {
    const now = new Date();
    return this.discountRepo
      .createQueryBuilder('discount')
      .where('discount.storeId = :storeId', { storeId })
      .andWhere('discount.isActive = :isActive', { isActive: true })
      .andWhere('(discount.startDate IS NULL OR discount.startDate <= :now)', { now })
      .andWhere('(discount.endDate IS NULL OR discount.endDate >= :now)', { now })
      .getMany();
  }

  async findByVoucherCode(storeId: string, code: string): Promise<Discount | null> {
    const now = new Date();
    return this.discountRepo
      .createQueryBuilder('discount')
      .where('discount.storeId = :storeId', { storeId })
      .andWhere('discount.voucherCode = :code', { code })
      .andWhere('discount.isActive = :isActive', { isActive: true })
      .andWhere('(discount.startDate IS NULL OR discount.startDate <= :now)', { now })
      .andWhere('(discount.endDate IS NULL OR discount.endDate >= :now)', { now })
      .getOne();
  }

  async update(id: string, dto: UpdateDiscountDto): Promise<Discount> {
    const discount = await this.findOne(id);
    Object.assign(discount, dto);
    return this.discountRepo.save(discount);
  }

  async remove(id: string): Promise<void> {
    const discount = await this.findOne(id);
    await this.discountRepo.remove(discount);
  }
}

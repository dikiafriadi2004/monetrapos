import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from './payment-method.entity';
import { QrisConfig } from './qris-config.entity';
import {
  CreatePaymentMethodDto, UpdatePaymentMethodDto,
  CreateQrisConfigDto, UpdateQrisConfigDto,
} from './dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentMethod) private paymentMethodRepo: Repository<PaymentMethod>,
    @InjectRepository(QrisConfig) private qrisConfigRepo: Repository<QrisConfig>,
  ) {}

  // ────── Payment Methods ──────

  async createPaymentMethod(dto: CreatePaymentMethodDto): Promise<PaymentMethod> {
    const pm = this.paymentMethodRepo.create(dto);
    return this.paymentMethodRepo.save(pm);
  }

  async findAllPaymentMethods(storeId: string): Promise<PaymentMethod[]> {
    return this.paymentMethodRepo.find({
      where: { storeId },
      order: { name: 'ASC' },
    });
  }

  async findActivePaymentMethods(storeId: string): Promise<PaymentMethod[]> {
    return this.paymentMethodRepo.find({
      where: { storeId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOnePaymentMethod(id: string): Promise<PaymentMethod> {
    const pm = await this.paymentMethodRepo.findOne({ where: { id } });
    if (!pm) throw new NotFoundException('Payment method not found');
    return pm;
  }

  async updatePaymentMethod(id: string, dto: UpdatePaymentMethodDto): Promise<PaymentMethod> {
    const pm = await this.findOnePaymentMethod(id);
    Object.assign(pm, dto);
    return this.paymentMethodRepo.save(pm);
  }

  async removePaymentMethod(id: string): Promise<void> {
    const pm = await this.findOnePaymentMethod(id);
    await this.paymentMethodRepo.remove(pm);
  }

  // ────── QRIS Config ──────

  async createQrisConfig(dto: CreateQrisConfigDto): Promise<QrisConfig> {
    const qris = this.qrisConfigRepo.create(dto);
    return this.qrisConfigRepo.save(qris);
  }

  async findQrisConfigByStore(storeId: string): Promise<QrisConfig[]> {
    return this.qrisConfigRepo.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveQrisConfig(storeId: string): Promise<QrisConfig | null> {
    return this.qrisConfigRepo.findOne({
      where: { storeId, isActive: true },
    });
  }

  async updateQrisConfig(id: string, dto: UpdateQrisConfigDto): Promise<QrisConfig> {
    const qris = await this.qrisConfigRepo.findOne({ where: { id } });
    if (!qris) throw new NotFoundException('QRIS config not found');
    Object.assign(qris, dto);
    return this.qrisConfigRepo.save(qris);
  }

  async removeQrisConfig(id: string): Promise<void> {
    const qris = await this.qrisConfigRepo.findOne({ where: { id } });
    if (!qris) throw new NotFoundException('QRIS config not found');
    await this.qrisConfigRepo.remove(qris);
  }
}

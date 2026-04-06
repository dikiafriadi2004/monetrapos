import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod, PaymentMethodType } from './payment-method.entity';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './dto';

@Injectable()
export class PaymentMethodsService {
  private readonly logger = new Logger(PaymentMethodsService.name);

  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
  ) {}

  /**
   * Find payment method by ID
   */
  async findById(id: string, companyId: string): Promise<PaymentMethod | null> {
    return this.paymentMethodRepo.findOne({ where: { id, companyId } });
  }

  /**
   * Find all payment methods for a company
   */
  async findByCompany(companyId: string): Promise<PaymentMethod[]> {
    return this.paymentMethodRepo.find({
      where: { companyId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Create a custom payment method
   */
  async create(
    dto: CreatePaymentMethodDto & { companyId: string },
  ): Promise<PaymentMethod> {
    // Check if code already exists for this company
    const existing = await this.paymentMethodRepo.findOne({
      where: { companyId: dto.companyId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Payment method with code '${dto.code}' already exists`,
      );
    }

    const paymentMethod = this.paymentMethodRepo.create(dto);
    return this.paymentMethodRepo.save(paymentMethod);
  }

  /**
   * Update a payment method
   */
  async update(
    id: string,
    companyId: string,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    const paymentMethod = await this.paymentMethodRepo.findOne({
      where: { id, companyId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // If updating code, check for conflicts
    if (dto.code && dto.code !== paymentMethod.code) {
      const existing = await this.paymentMethodRepo.findOne({
        where: { companyId, code: dto.code },
      });

      if (existing) {
        throw new ConflictException(
          `Payment method with code '${dto.code}' already exists`,
        );
      }
    }

    Object.assign(paymentMethod, dto);
    return this.paymentMethodRepo.save(paymentMethod);
  }

  /**
   * Toggle payment method active status
   */
  async toggle(id: string, companyId: string): Promise<PaymentMethod> {
    const paymentMethod = await this.paymentMethodRepo.findOne({
      where: { id, companyId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    paymentMethod.isActive = !paymentMethod.isActive;
    return this.paymentMethodRepo.save(paymentMethod);
  }

  /**
   * Delete a payment method
   */
  async delete(id: string, companyId: string): Promise<void> {
    const paymentMethod = await this.paymentMethodRepo.findOne({
      where: { id, companyId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    await this.paymentMethodRepo.remove(paymentMethod);
  }

  /**
   * Find all QRIS payment methods that have an image uploaded
   */
  async findAllQrisWithImage(): Promise<PaymentMethod[]> {
    return this.paymentMethodRepo
      .createQueryBuilder('pm')
      .where('pm.type = :type', { type: 'qris' })
      .andWhere('pm.iconUrl IS NOT NULL')
      .andWhere("pm.iconUrl != ''")
      .andWhere('pm.isActive = true')
      .getMany();
  }

  /**
   * Seed default payment methods for a company
   * Called when company is activated
   */
  async seedDefaultPaymentMethods(companyId: string): Promise<void> {
    this.logger.log(`Seeding default payment methods for company: ${companyId}`);

    const defaultMethods = [
      {
        companyId,
        name: 'Cash',
        code: 'cash',
        type: PaymentMethodType.CASH,
        sortOrder: 1,
        isActive: true,
      },
      {
        companyId,
        name: 'Debit Card',
        code: 'debit_card',
        type: PaymentMethodType.CARD,
        sortOrder: 2,
        isActive: true,
        requiresReference: true,
      },
      {
        companyId,
        name: 'Credit Card',
        code: 'credit_card',
        type: PaymentMethodType.CARD,
        sortOrder: 3,
        isActive: true,
        requiresReference: true,
      },
      {
        companyId,
        name: 'QRIS',
        code: 'qris',
        type: PaymentMethodType.QRIS,
        sortOrder: 4,
        isActive: true,
      },
    ];

    for (const method of defaultMethods) {
      // Check if already exists
      const existing = await this.paymentMethodRepo.findOne({
        where: { companyId, code: method.code },
      });

      if (!existing) {
        await this.paymentMethodRepo.save(this.paymentMethodRepo.create(method));
        this.logger.log(`Created payment method: ${method.name}`);
      }
    }

    this.logger.log(`Default payment methods seeded for company: ${companyId}`);
  }
}

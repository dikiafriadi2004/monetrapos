import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, Not } from 'typeorm';
import { Discount, DiscountScope } from './discount.entity';
import { DiscountUsage } from './discount-usage.entity';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ValidatePromoCodeDto } from './dto/validate-promo-code.dto';
import { DiscountType } from '../../common/enums';

@Injectable()
export class DiscountsService {
  constructor(
    @InjectRepository(Discount)
    private readonly discountRepository: Repository<Discount>,
    @InjectRepository(DiscountUsage)
    private readonly usageRepository: Repository<DiscountUsage>,
  ) {}

  async create(createDto: CreateDiscountDto, companyId: string): Promise<Discount> {
    // Normalize field names — frontend may send discountType, minPurchaseAmount, maxDiscountAmount
    const normalizedType = this.normalizeDiscountType(
      (createDto as any).discountType || createDto.type
    );
    const minTransaction = createDto.minTransaction ?? (createDto as any).minPurchaseAmount ?? undefined;
    const maxDiscount = createDto.maxDiscount ?? (createDto as any).maxDiscountAmount ?? undefined;
    // usageLimit: 0 means unlimited → set to undefined
    const usageLimit = createDto.usageLimit && createDto.usageLimit > 0 ? createDto.usageLimit : undefined;

    // Validate promo code uniqueness if provided
    if (createDto.promoCode) {
      const existing = await this.discountRepository.findOne({
        where: { promoCode: createDto.promoCode, companyId },
      });
      if (existing) {
        throw new BadRequestException('Promo code already exists');
      }
    }

    // Validate percentage discount
    if (normalizedType === DiscountType.PERCENTAGE && createDto.value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    const discount = this.discountRepository.create({
      ...createDto,
      type: normalizedType as any,
      minTransaction,
      maxDiscount,
      usageLimit,
      companyId,
      scope: createDto.scope || DiscountScope.ALL,
    });

    return await this.discountRepository.save(discount);
  }

  async findAll(
    companyId: string,
    storeId?: string,
    isActive?: boolean,
  ): Promise<Discount[]> {
    const query = this.discountRepository
      .createQueryBuilder('discount')
      .where('discount.companyId = :companyId', { companyId })
      .leftJoinAndSelect('discount.store', 'store')
      .orderBy('discount.createdAt', 'DESC');

    if (storeId) {
      query.andWhere('(discount.storeId = :storeId OR discount.storeId IS NULL)', {
        storeId,
      });
    }

    if (isActive !== undefined) {
      query.andWhere('discount.isActive = :isActive', { isActive });
    }

    return await query.getMany();
  }

  async findOne(id: string, companyId: string): Promise<Discount> {
    const discount = await this.discountRepository.findOne({
      where: { id, companyId },
      relations: ['store'],
    });

    if (!discount) {
      throw new NotFoundException(`Discount with ID ${id} not found`);
    }

    return discount;
  }

  async update(
    id: string,
    updateDto: UpdateDiscountDto,
    companyId: string,
  ): Promise<Discount> {
    const discount = await this.findOne(id, companyId);

    // Normalize field names
    const normalizedType = (updateDto as any).discountType || (updateDto as any).type
      ? this.normalizeDiscountType((updateDto as any).discountType || (updateDto as any).type)
      : undefined;
    const minTransaction = (updateDto as any).minTransaction ?? (updateDto as any).minPurchaseAmount;
    const maxDiscount = (updateDto as any).maxDiscount ?? (updateDto as any).maxDiscountAmount;
    const usageLimit = (updateDto as any).usageLimit !== undefined
      ? ((updateDto as any).usageLimit > 0 ? (updateDto as any).usageLimit : undefined)
      : undefined;

    // Validate promo code uniqueness if changed
    if (updateDto.promoCode && updateDto.promoCode !== discount.promoCode) {
      const existing = await this.discountRepository.findOne({
        where: { promoCode: updateDto.promoCode, companyId },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Promo code already exists');
      }
    }

    // Validate percentage discount
    if (
      (normalizedType === DiscountType.PERCENTAGE || discount.type === DiscountType.PERCENTAGE) &&
      updateDto.value !== undefined &&
      updateDto.value > 100
    ) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    const updateData: any = { ...updateDto };
    if (normalizedType) updateData.type = normalizedType;
    if (minTransaction !== undefined) updateData.minTransaction = minTransaction;
    if (maxDiscount !== undefined) updateData.maxDiscount = maxDiscount;
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit;
    // Remove frontend-only fields
    delete updateData.discountType;
    delete updateData.minPurchaseAmount;
    delete updateData.maxDiscountAmount;

    Object.assign(discount, updateData);
    return await this.discountRepository.save(discount);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const discount = await this.findOne(id, companyId);
    // Hard delete — remove from DB
    await this.discountRepository.remove(discount);
  }

  async validatePromoCode(
    validateDto: ValidatePromoCodeDto,
    companyId: string,
  ): Promise<{
    valid: boolean;
    discount?: Discount;
    discountAmount?: number;
    message?: string;
  }> {
    // Find discount by promo code
    const discount = await this.discountRepository.findOne({
      where: {
        promoCode: validateDto.promoCode,
        companyId,
        isActive: true,
      },
    });

    if (!discount) {
      return {
        valid: false,
        message: 'Invalid promo code',
      };
    }

    // Check date validity
    const now = new Date();
    if (discount.startDate && new Date(discount.startDate) > now) {
      return {
        valid: false,
        message: 'Promo code not yet active',
      };
    }

    if (discount.endDate && new Date(discount.endDate) < now) {
      return {
        valid: false,
        message: 'Promo code has expired',
      };
    }

    // Check usage limit
    if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
      return {
        valid: false,
        message: 'Promo code usage limit reached',
      };
    }

    // Check per-customer usage limit
    if (discount.usageLimitPerCustomer && validateDto.customerId) {
      const customerUsageCount = await this.usageRepository.count({
        where: {
          discount_id: discount.id,
          customer_id: validateDto.customerId,
        },
      });

      if (customerUsageCount >= discount.usageLimitPerCustomer) {
        return {
          valid: false,
          message: 'You have reached the usage limit for this promo code',
        };
      }
    }

    // Check minimum transaction
    if (discount.minTransaction && validateDto.transactionTotal < discount.minTransaction) {
      return {
        valid: false,
        message: `Minimum transaction amount is ${discount.minTransaction}`,
      };
    }

    // Check store applicability
    if (discount.storeId && validateDto.storeId && discount.storeId !== validateDto.storeId) {
      return {
        valid: false,
        message: 'Promo code not applicable to this store',
      };
    }

    // Check scope applicability
    if (discount.scope === DiscountScope.CATEGORY) {
      if (!validateDto.categoryIds || validateDto.categoryIds.length === 0) {
        return {
          valid: false,
          message: 'No applicable categories in cart',
        };
      }

      const hasApplicableCategory = discount.applicableIds?.some((id) =>
        validateDto.categoryIds?.includes(id),
      );

      if (!hasApplicableCategory) {
        return {
          valid: false,
          message: 'Promo code not applicable to items in cart',
        };
      }
    }

    if (discount.scope === DiscountScope.PRODUCT) {
      if (!validateDto.productIds || validateDto.productIds.length === 0) {
        return {
          valid: false,
          message: 'No applicable products in cart',
        };
      }

      const hasApplicableProduct = discount.applicableIds?.some((id) =>
        validateDto.productIds?.includes(id),
      );

      if (!hasApplicableProduct) {
        return {
          valid: false,
          message: 'Promo code not applicable to items in cart',
        };
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.type === DiscountType.PERCENTAGE) {
      discountAmount = (validateDto.transactionTotal * discount.value) / 100;
    } else {
      discountAmount = discount.value;
    }

    // Apply max discount limit
    if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
      discountAmount = discount.maxDiscount;
    }

    return {
      valid: true,
      discount,
      discountAmount,
      message: 'Promo code applied successfully',
    };
  }

  async recordUsage(
    discountId: string,
    transactionId: string,
    discountAmount: number,
    customerId?: string,
  ): Promise<void> {
    // Create usage record
    const usage = this.usageRepository.create({
      discount_id: discountId,
      transaction_id: transactionId,
      customer_id: customerId,
      discount_amount: discountAmount,
    });

    await this.usageRepository.save(usage);

    // Increment usage count
    await this.discountRepository.increment({ id: discountId }, 'usageCount', 1);
  }

  /**
   * Normalize discount type — frontend may send 'fixed_amount', backend expects 'fixed'
   */
  private normalizeDiscountType(type: string): DiscountType {
    const map: Record<string, DiscountType> = {
      percentage: DiscountType.PERCENTAGE,
      fixed: DiscountType.FIXED,
      fixed_amount: DiscountType.FIXED,
      buy_x_get_y: DiscountType.BUY_X_GET_Y,
      voucher: DiscountType.VOUCHER,
    };
    return map[type?.toLowerCase()] ?? DiscountType.PERCENTAGE;
  }

  async generatePromoCode(prefix: string, length: number = 8): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix.toUpperCase();

    for (let i = 0; i < length; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check if code already exists
    const existing = await this.discountRepository.findOne({
      where: { promoCode: code },
    });

    if (existing) {
      // Recursively generate new code
      return this.generatePromoCode(prefix, length);
    }

    return code;
  }

  async getUsageStats(discountId: string, companyId: string): Promise<{
    totalUsage: number;
    totalDiscountAmount: number;
    usageByCustomer: Array<{ customerId: string; count: number; totalAmount: number }>;
  }> {
    const discount = await this.findOne(discountId, companyId);

    const usages = await this.usageRepository.find({
      where: { discount_id: discountId },
      relations: ['customer'],
    });

    const totalUsage = usages.length;
    const totalDiscountAmount = usages.reduce(
      (sum, usage) => sum + Number(usage.discount_amount),
      0,
    );

    // Group by customer
    const usageByCustomerMap = new Map<
      string,
      { count: number; totalAmount: number }
    >();

    usages.forEach((usage) => {
      if (usage.customer_id) {
        const existing = usageByCustomerMap.get(usage.customer_id) || {
          count: 0,
          totalAmount: 0,
        };
        existing.count++;
        existing.totalAmount += Number(usage.discount_amount);
        usageByCustomerMap.set(usage.customer_id, existing);
      }
    });

    const usageByCustomer = Array.from(usageByCustomerMap.entries()).map(
      ([customerId, data]) => ({
        customerId,
        count: data.count,
        totalAmount: data.totalAmount,
      }),
    );

    return {
      totalUsage,
      totalDiscountAmount,
      usageByCustomer,
    };
  }
}

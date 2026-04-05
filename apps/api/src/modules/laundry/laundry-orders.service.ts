import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LaundryOrder, LaundryOrderStatus } from './laundry-order.entity';
import { LaundryItem } from './laundry-item.entity';
import { LaundryServiceType, PricingType } from './laundry-service-type.entity';
import { CreateLaundryOrderDto } from './dto/create-laundry-order.dto';
import { UpdateLaundryOrderDto, UpdateLaundryOrderStatusDto } from './dto/update-laundry-order.dto';

@Injectable()
export class LaundryOrdersService {
  constructor(
    @InjectRepository(LaundryOrder)
    private readonly orderRepository: Repository<LaundryOrder>,
    @InjectRepository(LaundryItem)
    private readonly itemRepository: Repository<LaundryItem>,
    @InjectRepository(LaundryServiceType)
    private readonly serviceTypeRepository: Repository<LaundryServiceType>,
    private readonly dataSource: DataSource,
  ) {}

  private async generateOrderNumber(companyId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prefix = `LND-${year}${month}${day}`;

    const lastOrder = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.company_id = :companyId', { companyId })
      .andWhere('order.order_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('order.order_number', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.order_number.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(5, '0')}`;
  }

  private async calculatePrice(
    serviceType: LaundryServiceType,
    weightKg?: number,
    itemCount?: number,
  ): Promise<number> {
    if (serviceType.pricing_type === PricingType.PER_KG) {
      if (!weightKg || weightKg <= 0) {
        throw new BadRequestException('Weight is required for per-kg pricing');
      }
      return serviceType.price * weightKg;
    } else {
      if (!itemCount || itemCount <= 0) {
        throw new BadRequestException('Item count is required for per-item pricing');
      }
      return serviceType.price * itemCount;
    }
  }

  async create(createDto: CreateLaundryOrderDto, companyId: string): Promise<LaundryOrder> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get service type
      const serviceType = await this.serviceTypeRepository.findOne({
        where: { id: createDto.service_type_id, company_id: companyId },
      });

      if (!serviceType) {
        throw new NotFoundException('Service type not found');
      }

      // Calculate item count from items array
      const itemCount = createDto.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      // Calculate total price
      const totalPrice = await this.calculatePrice(
        serviceType,
        createDto.weight_kg,
        itemCount,
      );

      // Generate order number
      const orderNumber = await this.generateOrderNumber(companyId);

      // Create order
      const order = this.orderRepository.create({
        ...createDto,
        order_number: orderNumber,
        company_id: companyId,
        item_count: itemCount,
        total_price: totalPrice,
        status: LaundryOrderStatus.RECEIVED,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Create items if provided
      if (createDto.items && createDto.items.length > 0) {
        const items = createDto.items.map((itemDto) =>
          this.itemRepository.create({
            item_type: itemDto.item_type as any,
            description: itemDto.description,
            color: itemDto.color,
            brand: itemDto.brand,
            quantity: itemDto.quantity,
            notes: itemDto.notes,
            order_id: savedOrder.id,
          }),
        );

        await queryRunner.manager.save(items);
      }

      await queryRunner.commitTransaction();

      return await this.findOne(savedOrder.id, companyId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    companyId: string,
    storeId?: string,
    status?: LaundryOrderStatus,
    customerId?: string,
  ): Promise<LaundryOrder[]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .where('order.company_id = :companyId', { companyId })
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.service_type', 'service_type')
      .leftJoinAndSelect('order.store', 'store')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.created_at', 'DESC');

    if (storeId) {
      query.andWhere('order.store_id = :storeId', { storeId });
    }

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    if (customerId) {
      query.andWhere('order.customer_id = :customerId', { customerId });
    }

    return await query.getMany();
  }

  async findOne(id: string, companyId: string): Promise<LaundryOrder> {
    const order = await this.orderRepository.findOne({
      where: { id, company_id: companyId },
      relations: ['customer', 'service_type', 'store', 'items'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(
    id: string,
    updateDto: UpdateLaundryOrderDto,
    companyId: string,
  ): Promise<LaundryOrder> {
    const order = await this.findOne(id, companyId);

    // Prevent updates to delivered or cancelled orders
    if (
      order.status === LaundryOrderStatus.DELIVERED ||
      order.status === LaundryOrderStatus.CANCELLED
    ) {
      throw new BadRequestException('Cannot update delivered or cancelled orders');
    }

    Object.assign(order, updateDto);
    return await this.orderRepository.save(order);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateLaundryOrderStatusDto,
    companyId: string,
  ): Promise<LaundryOrder> {
    const order = await this.findOne(id, companyId);

    const now = new Date();
    const newStatus = updateStatusDto.status;

    // Update timestamps based on status
    if (newStatus === LaundryOrderStatus.WASHING) {
      order.washing_started_at = now;
    } else if (newStatus === LaundryOrderStatus.DRYING) {
      order.drying_started_at = now;
    } else if (newStatus === LaundryOrderStatus.IRONING) {
      order.ironing_started_at = now;
    } else if (newStatus === LaundryOrderStatus.READY) {
      order.ready_at = now;
    } else if (newStatus === LaundryOrderStatus.DELIVERED) {
      order.delivered_at = now;
    }

    order.status = newStatus;
    return await this.orderRepository.save(order);
  }

  async addItems(
    orderId: string,
    items: Array<{
      item_type: string;
      description?: string;
      color?: string;
      brand?: string;
      quantity: number;
      barcode?: string;
      notes?: string;
    }>,
    companyId: string,
  ): Promise<LaundryItem[]> {
    const order = await this.findOne(orderId, companyId);

    const laundryItems = items.map((itemDto) =>
      this.itemRepository.create({
        item_type: itemDto.item_type as any,
        description: itemDto.description,
        color: itemDto.color,
        brand: itemDto.brand,
        quantity: itemDto.quantity,
        barcode: itemDto.barcode,
        notes: itemDto.notes,
        order_id: order.id,
      }),
    );

    const savedItems = await this.itemRepository.save(laundryItems);

    // Update item count
    order.item_count += items.reduce((sum, item) => sum + item.quantity, 0);
    await this.orderRepository.save(order);

    return savedItems;
  }

  async getSchedule(
    companyId: string,
    storeId?: string,
    date?: string,
  ): Promise<{
    pickups: LaundryOrder[];
    deliveries: LaundryOrder[];
  }> {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const query = this.orderRepository
      .createQueryBuilder('order')
      .where('order.company_id = :companyId', { companyId })
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.service_type', 'service_type')
      .leftJoinAndSelect('order.store', 'store');

    if (storeId) {
      query.andWhere('order.store_id = :storeId', { storeId });
    }

    // Get pickups
    const pickups = await query
      .clone()
      .andWhere('order.pickup_date >= :startOfDay', { startOfDay })
      .andWhere('order.pickup_date <= :endOfDay', { endOfDay })
      .orderBy('order.pickup_date', 'ASC')
      .getMany();

    // Get deliveries
    const deliveries = await query
      .clone()
      .andWhere('order.delivery_date >= :startOfDay', { startOfDay })
      .andWhere('order.delivery_date <= :endOfDay', { endOfDay })
      .orderBy('order.delivery_date', 'ASC')
      .getMany();

    return { pickups, deliveries };
  }
}

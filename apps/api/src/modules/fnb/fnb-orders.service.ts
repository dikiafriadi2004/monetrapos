import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FnbOrder, OrderStatus, OrderType } from './fnb-order.entity';
import { CreateFnbOrderDto } from './dto/create-fnb-order.dto';
import { UpdateFnbOrderDto, UpdateOrderStatusDto } from './dto/update-fnb-order.dto';

@Injectable()
export class FnbOrdersService {
  constructor(
    @InjectRepository(FnbOrder)
    private readonly fnbOrderRepository: Repository<FnbOrder>,
  ) {}

  private async generateOrderNumber(companyId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prefix = `ORD-${year}${month}${day}`;

    const lastOrder = await this.fnbOrderRepository
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

  async create(createFnbOrderDto: CreateFnbOrderDto, companyId: string): Promise<FnbOrder> {
    // Validate dine-in orders must have table
    if (createFnbOrderDto.order_type === OrderType.DINE_IN && !createFnbOrderDto.table_id) {
      throw new BadRequestException('Dine-in orders must have a table assigned');
    }

    // Validate delivery orders must have address
    if (createFnbOrderDto.order_type === OrderType.DELIVERY && !createFnbOrderDto.delivery_address) {
      throw new BadRequestException('Delivery orders must have a delivery address');
    }

    const orderNumber = await this.generateOrderNumber(companyId);

    const order = this.fnbOrderRepository.create({
      ...createFnbOrderDto,
      order_number: orderNumber,
      company_id: companyId,
      status: OrderStatus.PENDING,
    });

    return await this.fnbOrderRepository.save(order);
  }

  async findAll(
    companyId: string,
    storeId?: string,
    status?: OrderStatus,
    orderType?: OrderType,
  ): Promise<FnbOrder[]> {
    const query = this.fnbOrderRepository
      .createQueryBuilder('order')
      .where('order.company_id = :companyId', { companyId })
      .leftJoinAndSelect('order.table', 'table')
      .leftJoinAndSelect('order.transaction', 'transaction')
      .leftJoinAndSelect('order.store', 'store')
      .orderBy('order.created_at', 'DESC');

    if (storeId) {
      query.andWhere('order.store_id = :storeId', { storeId });
    }

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    if (orderType) {
      query.andWhere('order.order_type = :orderType', { orderType });
    }

    return await query.getMany();
  }

  async findOne(id: string, companyId: string): Promise<FnbOrder> {
    const order = await this.fnbOrderRepository.findOne({
      where: { id, company_id: companyId },
      relations: ['table', 'transaction', 'store'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(
    id: string,
    updateFnbOrderDto: UpdateFnbOrderDto,
    companyId: string,
  ): Promise<FnbOrder> {
    const order = await this.findOne(id, companyId);

    // Prevent updates to completed or cancelled orders
    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot update completed or cancelled orders');
    }

    Object.assign(order, updateFnbOrderDto);
    return await this.fnbOrderRepository.save(order);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateOrderStatusDto,
    companyId: string,
  ): Promise<FnbOrder> {
    const order = await this.findOne(id, companyId);

    const now = new Date();
    const oldStatus = order.status;
    const newStatus = updateStatusDto.status;

    // Update timestamps based on status
    if (newStatus === OrderStatus.PREPARING && oldStatus === OrderStatus.PENDING) {
      order.preparing_at = now;
    } else if (newStatus === OrderStatus.READY && oldStatus === OrderStatus.PREPARING) {
      order.ready_at = now;
    } else if (newStatus === OrderStatus.SERVED && oldStatus === OrderStatus.READY) {
      order.served_at = now;
    } else if (newStatus === OrderStatus.COMPLETED) {
      order.completed_at = now;
    }

    order.status = newStatus;
    return await this.fnbOrderRepository.save(order);
  }

  async getKitchenDisplay(companyId: string, storeId?: string): Promise<{
    pending: FnbOrder[];
    preparing: FnbOrder[];
    ready: FnbOrder[];
  }> {
    const query = this.fnbOrderRepository
      .createQueryBuilder('order')
      .where('order.company_id = :companyId', { companyId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY],
      })
      .leftJoinAndSelect('order.table', 'table')
      .leftJoinAndSelect('order.transaction', 'transaction')
      .leftJoinAndSelect('transaction.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .orderBy('order.created_at', 'ASC');

    if (storeId) {
      query.andWhere('order.store_id = :storeId', { storeId });
    }

    const orders = await query.getMany();

    return {
      pending: orders.filter((o) => o.status === OrderStatus.PENDING),
      preparing: orders.filter((o) => o.status === OrderStatus.PREPARING),
      ready: orders.filter((o) => o.status === OrderStatus.READY),
    };
  }
}

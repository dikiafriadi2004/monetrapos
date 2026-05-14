import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FnbOrder, OrderStatus, OrderType } from './fnb-order.entity';
import { Table, TableStatus } from './table.entity';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionItem } from '../transactions/transaction-item.entity';
import { CreateFnbOrderDto } from './dto/create-fnb-order.dto';
import { UpdateFnbOrderDto, UpdateOrderStatusDto } from './dto/update-fnb-order.dto';

@Injectable()
export class FnbOrdersService {
  private readonly logger = new Logger(FnbOrdersService.name);

  constructor(
    @InjectRepository(FnbOrder)
    private readonly fnbOrderRepository: Repository<FnbOrder>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionItem)
    private readonly transactionItemRepository: Repository<TransactionItem>,
    private readonly dataSource: DataSource,
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
    const items = createFnbOrderDto.items || [];

    // Calculate totals from items
    const subtotal = items.reduce((s, i) => s + (i.unit_price * i.quantity), 0);

    // Create FnB order
    const order = this.fnbOrderRepository.create({
      order_type: createFnbOrderDto.order_type,
      store_id: createFnbOrderDto.store_id,
      table_id: (createFnbOrderDto.table_id || null) as any,
      delivery_address: createFnbOrderDto.delivery_address,
      delivery_fee: createFnbOrderDto.delivery_fee || 0,
      notes: createFnbOrderDto.notes,
      order_number: orderNumber,
      company_id: companyId,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await this.fnbOrderRepository.save(order) as FnbOrder;

    // If items provided, create a pending transaction linked to this order
    if (items.length > 0) {
      try {
        const crypto = require('crypto');
        const txId = crypto.randomUUID();

        // Create transaction (status pending — will be completed at checkout)
        const tx = this.transactionRepository.create({
          id: txId,
          companyId,
          storeId: createFnbOrderDto.store_id,
          transactionNumber: `FNB-${orderNumber}`,
          invoiceNumber: `FNB-${orderNumber}`,
          subtotal,
          taxAmount: 0,
          discountAmount: 0,
          serviceCharge: 0,
          total: subtotal,
          paidAmount: 0,
          changeAmount: 0,
          paymentMethod: 'cash' as any, // placeholder, updated at checkout
          status: 'pending' as any,
          customerId: createFnbOrderDto.customer_id || null as any,
          metadata: {
            orderType: createFnbOrderDto.order_type,
            tableId: createFnbOrderDto.table_id,
            fnbOrderId: savedOrder.id,
            fnbOrderNumber: orderNumber,
          },
        });
        await this.transactionRepository.save(tx);

        // Create transaction items
        for (const item of items) {
          const txItem = this.transactionItemRepository.create({
            transactionId: txId,
            productId: item.product_id || null as any,
            productName: item.product_name,
            variantName: item.variant_name || null as any,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discountAmount: 0,
            subtotal: item.unit_price * item.quantity,
            notes: item.notes || null as any,
          });
          await this.transactionItemRepository.save(txItem);
        }

        // Link transaction to FnB order
        savedOrder.transaction_id = txId;
        await this.fnbOrderRepository.save(savedOrder);

        this.logger.log(`FnB order ${orderNumber} created with ${items.length} items, tx: ${txId}`);
      } catch (err: any) {
        this.logger.error(`Failed to create transaction for FnB order: ${err.message}`);
        // Don't fail the order creation — items can be added later
      }
    }

    // Update table status to occupied if dine-in
    if (createFnbOrderDto.order_type === OrderType.DINE_IN && createFnbOrderDto.table_id) {
      try {
        await this.tableRepository.update(
          { id: createFnbOrderDto.table_id, company_id: companyId },
          { status: TableStatus.OCCUPIED, current_transaction_id: savedOrder.transaction_id || null },
        );
        this.logger.log(`Table ${createFnbOrderDto.table_id} set to occupied`);
      } catch (err: any) {
        this.logger.warn(`Failed to update table status: ${err.message}`);
      }
    }

    // Return with relations
    return this.findOne(savedOrder.id, companyId);
  }

  async findAll(
    companyId: string,
    storeId?: string,
    status?: OrderStatus,
    orderType?: OrderType,
    startDate?: string,
    endDate?: string,
  ): Promise<FnbOrder[]> {
    const query = this.fnbOrderRepository
      .createQueryBuilder('order')
      .where('order.company_id = :companyId', { companyId })
      .leftJoinAndSelect('order.table', 'table')
      .leftJoinAndSelect('order.transaction', 'transaction')
      .leftJoinAndSelect('transaction.items', 'items')
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

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query.andWhere('order.created_at >= :startDate', { startDate: start });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.andWhere('order.created_at <= :endDate', { endDate: end });
    }

    return await query.getMany();
  }

  async findOne(id: string, companyId: string): Promise<FnbOrder> {
    const order = await this.fnbOrderRepository.findOne({
      where: { id, company_id: companyId },
      relations: ['table', 'transaction', 'transaction.items', 'store'],
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

    // Block: completed can only be set from POS checkout
    if (newStatus === OrderStatus.COMPLETED) {
      throw new BadRequestException('Status "completed" hanya bisa diset dari POS saat checkout pembayaran.');
    }

    // Update timestamps based on status
    if (newStatus === OrderStatus.PREPARING && oldStatus === OrderStatus.PENDING) {
      order.preparing_at = now;
    } else if (newStatus === OrderStatus.READY && oldStatus === OrderStatus.PREPARING) {
      order.ready_at = now;
    } else if (newStatus === OrderStatus.SERVED && oldStatus === OrderStatus.READY) {
      order.served_at = now;
    }

    order.status = newStatus;
    const saved = await this.fnbOrderRepository.save(order) as FnbOrder;

    // Free table when order cancelled
    if (newStatus === OrderStatus.CANCELLED && order.table_id) {
      try {
        await this.tableRepository.update(
          { id: order.table_id },
          { status: TableStatus.AVAILABLE, current_transaction_id: null },
        );
      } catch { /* silent */ }
    }

    return saved;
  }

  /** Add items to an existing order (tambah pesanan) */
  async addItems(
    id: string,
    items: Array<{ product_id: string; product_name: string; unit_price: number; quantity: number; variant_name?: string; notes?: string }>,
    companyId: string,
  ): Promise<FnbOrder> {
    const order = await this.findOne(id, companyId);

    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Tidak bisa menambah item ke order yang sudah selesai atau dibatalkan.');
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('Minimal 1 item harus ditambahkan.');
    }

    let txId = order.transaction_id;

    if (!txId) {
      // Create new transaction
      const crypto = require('crypto');
      txId = crypto.randomUUID();
      const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      const tx = this.transactionRepository.create({
        id: txId,
        companyId,
        storeId: order.store_id,
        transactionNumber: `FNB-${order.order_number}`,
        invoiceNumber: `FNB-${order.order_number}`,
        subtotal,
        taxAmount: 0,
        discountAmount: 0,
        serviceCharge: 0,
        total: subtotal,
        paidAmount: 0,
        changeAmount: 0,
        paymentMethod: 'cash' as any,
        status: 'pending' as any,
        metadata: { fnbOrderId: id, fnbOrderNumber: order.order_number },
      });
      await this.transactionRepository.save(tx);
      order.transaction_id = txId;
      await this.fnbOrderRepository.save(order);
    } else {
      // Update existing transaction totals
      const newItemsTotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      await this.transactionRepository.increment({ id: txId }, 'subtotal', newItemsTotal);
      await this.transactionRepository.increment({ id: txId }, 'total', newItemsTotal);
    }

    // Add items to transaction
    for (const item of items) {
      const txItem = this.transactionItemRepository.create({
        transactionId: txId,
        productId: item.product_id || null as any,
        productName: item.product_name,
        variantName: item.variant_name || null as any,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        discountAmount: 0,
        subtotal: item.unit_price * item.quantity,
        notes: item.notes || null as any,
      });
      await this.transactionItemRepository.save(txItem);
    }

    this.logger.log(`Added ${items.length} items to FnB order ${order.order_number}`);
    return this.findOne(id, companyId);
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
      .orderBy('order.created_at', 'ASC');

    if (storeId) {
      query.andWhere('order.store_id = :storeId', { storeId });
    }

    const orders = await query.getMany();

    // For orders without transaction items, try to fetch items directly
    for (const order of orders) {
      if (order.transaction && (!order.transaction.items || order.transaction.items.length === 0)) {
        try {
          const items = await this.transactionItemRepository.find({
            where: { transactionId: order.transaction_id },
          });
          order.transaction.items = items;
        } catch { /* silent */ }
      }
    }

    return {
      pending: orders.filter((o) => o.status === OrderStatus.PENDING),
      preparing: orders.filter((o) => o.status === OrderStatus.PREPARING),
      ready: orders.filter((o) => o.status === OrderStatus.READY),
    };
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from './purchase-order.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { StockMovement, MovementType } from '../inventory/stock-movement.entity';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly purchaseOrderItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    companyId: string,
    userId: string,
    createDto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate PO number
      const poNumber = await this.generatePONumber(companyId);

      // Calculate totals
      let subtotal = 0;
      const items = createDto.items.map((item) => {
        const totalPrice = item.quantity_ordered * item.unit_price;
        subtotal += totalPrice;

        return {
          ...item,
          total_price: totalPrice,
          quantity_received: 0,
        };
      });

      const taxAmount = subtotal * ((createDto.tax_rate || 0) / 100);
      const total =
        subtotal +
        taxAmount -
        (createDto.discount_amount || 0) +
        (createDto.shipping_cost || 0);

      // Create purchase order
      const purchaseOrder = this.purchaseOrderRepository.create({
        company_id: companyId,
        po_number: poNumber,
        supplier_id: createDto.supplier_id,
        store_id: createDto.store_id,
        created_by: userId,
        status: createDto.status || PurchaseOrderStatus.DRAFT,
        order_date: createDto.order_date || new Date(),
        expected_delivery_date: createDto.expected_delivery_date,
        subtotal,
        tax_rate: createDto.tax_rate || 0,
        tax_amount: taxAmount,
        discount_amount: createDto.discount_amount || 0,
        shipping_cost: createDto.shipping_cost || 0,
        total,
        notes: createDto.notes,
        terms_and_conditions: createDto.terms_and_conditions,
      });

      const savedPO = await queryRunner.manager.save(purchaseOrder);

      // Create purchase order items
      const poItems = items.map((item) =>
        this.purchaseOrderItemRepository.create({
          ...item,
          purchase_order_id: savedPO.id,
        }),
      );

      await queryRunner.manager.save(poItems);

      await queryRunner.commitTransaction();

      this.logger.log(`Purchase order ${poNumber} created for company ${companyId}`);

      return this.findOne(companyId, savedPO.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create purchase order', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    companyId: string,
    filters?: {
      status?: PurchaseOrderStatus;
      supplier_id?: string;
      store_id?: string;
      from_date?: Date;
      to_date?: Date;
    },
  ): Promise<PurchaseOrder[]> {
    const query = this.purchaseOrderRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.store', 'store')
      .leftJoinAndSelect('po.creator', 'creator')
      .leftJoinAndSelect('po.items', 'items')
      .where('po.company_id = :companyId', { companyId });

    if (filters?.status) {
      query.andWhere('po.status = :status', { status: filters.status });
    }

    if (filters?.supplier_id) {
      query.andWhere('po.supplier_id = :supplierId', {
        supplierId: filters.supplier_id,
      });
    }

    if (filters?.store_id) {
      query.andWhere('po.store_id = :storeId', { storeId: filters.store_id });
    }

    if (filters?.from_date) {
      query.andWhere('po.order_date >= :fromDate', {
        fromDate: filters.from_date,
      });
    }

    if (filters?.to_date) {
      query.andWhere('po.order_date <= :toDate', { toDate: filters.to_date });
    }

    return await query.orderBy('po.order_date', 'DESC').getMany();
  }

  async findOne(companyId: string, id: string): Promise<PurchaseOrder> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id, company_id: companyId },
      relations: ['supplier', 'store', 'creator', 'receiver', 'items'],
    });

    if (!purchaseOrder) {
      throw new NotFoundException(`Purchase order with ID ${id} not found`);
    }

    return purchaseOrder;
  }

  async update(
    companyId: string,
    id: string,
    updateDto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const purchaseOrder = await this.findOne(companyId, id);

    // Only allow updates for DRAFT status
    if (purchaseOrder.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft purchase orders can be updated',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update basic fields
      if (updateDto.supplier_id) purchaseOrder.supplier_id = updateDto.supplier_id;
      if (updateDto.store_id) purchaseOrder.store_id = updateDto.store_id;
      if (updateDto.order_date) purchaseOrder.order_date = updateDto.order_date;
      if (updateDto.expected_delivery_date)
        purchaseOrder.expected_delivery_date = updateDto.expected_delivery_date;
      if (updateDto.notes !== undefined) purchaseOrder.notes = updateDto.notes;
      if (updateDto.terms_and_conditions !== undefined)
        purchaseOrder.terms_and_conditions = updateDto.terms_and_conditions;

      // Update items if provided
      if (updateDto.items) {
        // Delete existing items
        await queryRunner.manager.delete(PurchaseOrderItem, {
          purchase_order_id: id,
        });

        // Recalculate totals
        let subtotal = 0;
        const items = updateDto.items.map((item) => {
          const totalPrice = item.quantity_ordered * item.unit_price;
          subtotal += totalPrice;

          return this.purchaseOrderItemRepository.create({
            ...item,
            purchase_order_id: id,
            total_price: totalPrice,
            quantity_received: 0,
          });
        });

        const taxAmount = subtotal * ((updateDto.tax_rate || purchaseOrder.tax_rate) / 100);
        const total =
          subtotal +
          taxAmount -
          (updateDto.discount_amount ?? purchaseOrder.discount_amount) +
          (updateDto.shipping_cost ?? purchaseOrder.shipping_cost);

        purchaseOrder.subtotal = subtotal;
        purchaseOrder.tax_rate = updateDto.tax_rate ?? purchaseOrder.tax_rate;
        purchaseOrder.tax_amount = taxAmount;
        purchaseOrder.discount_amount = updateDto.discount_amount ?? purchaseOrder.discount_amount;
        purchaseOrder.shipping_cost = updateDto.shipping_cost ?? purchaseOrder.shipping_cost;
        purchaseOrder.total = total;

        await queryRunner.manager.save(items);
      }

      await queryRunner.manager.save(purchaseOrder);
      await queryRunner.commitTransaction();

      return this.findOne(companyId, id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to update purchase order', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(
    companyId: string,
    id: string,
    status: PurchaseOrderStatus,
  ): Promise<PurchaseOrder> {
    const purchaseOrder = await this.findOne(companyId, id);

    // Validate status transitions
    if (purchaseOrder.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Cannot change status of received purchase order');
    }

    if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot change status of cancelled purchase order');
    }

    purchaseOrder.status = status;
    await this.purchaseOrderRepository.save(purchaseOrder);

    this.logger.log(`Purchase order ${purchaseOrder.po_number} status changed to ${status}`);

    return this.findOne(companyId, id);
  }

  async receivePurchaseOrder(
    companyId: string,
    id: string,
    userId: string,
    receiveDto: ReceivePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const purchaseOrder = await this.findOne(companyId, id);

    // Validate status
    if (purchaseOrder.status === PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Cannot receive a draft purchase order');
    }

    if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot receive a cancelled purchase order');
    }

    if (purchaseOrder.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Purchase order already received');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update received quantities and create stock movements
      for (const receivedItem of receiveDto.items) {
        const poItem = purchaseOrder.items.find((i) => i.id === receivedItem.item_id);

        if (!poItem) {
          throw new NotFoundException(`Purchase order item ${receivedItem.item_id} not found`);
        }

        // Update quantity received
        poItem.quantity_received += receivedItem.quantity_received;

        if (poItem.quantity_received > poItem.quantity_ordered) {
          throw new BadRequestException(
            `Received quantity for ${poItem.product_name} exceeds ordered quantity`,
          );
        }

        if (receivedItem.notes) {
          poItem.notes = receivedItem.notes;
        }

        await queryRunner.manager.save(poItem);

        // Create stock movement (increase inventory)
        const stockMovement = this.stockMovementRepository.create({
          companyId: companyId,
          storeId: purchaseOrder.store_id,
          productId: poItem.product_id,
          type: MovementType.IN,
          quantity: receivedItem.quantity_received,
          reason: `Purchase Order ${purchaseOrder.po_number}`,
          reference: purchaseOrder.id,
          performedBy: userId,
        });

        await queryRunner.manager.save(stockMovement);

        // Update inventory (this would be handled by inventory service in real implementation)
        await queryRunner.manager.query(
          `
          INSERT INTO inventory (company_id, store_id, product_id, available_quantity, reserved_quantity, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            available_quantity = available_quantity + ?,
            updated_at = NOW()
          `,
          [
            companyId,
            purchaseOrder.store_id,
            poItem.product_id,
            receivedItem.quantity_received,
            receivedItem.quantity_received,
          ],
        );
      }

      // Update purchase order status
      purchaseOrder.status = PurchaseOrderStatus.RECEIVED;
      purchaseOrder.received_date = new Date();
      purchaseOrder.received_by = userId;

      if (receiveDto.notes) {
        purchaseOrder.notes = purchaseOrder.notes
          ? `${purchaseOrder.notes}\n\nReceiving Notes: ${receiveDto.notes}`
          : `Receiving Notes: ${receiveDto.notes}`;
      }

      await queryRunner.manager.save(purchaseOrder);

      await queryRunner.commitTransaction();

      this.logger.log(`Purchase order ${purchaseOrder.po_number} received by user ${userId}`);

      return this.findOne(companyId, id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to receive purchase order', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancel(companyId: string, id: string): Promise<PurchaseOrder> {
    const purchaseOrder = await this.findOne(companyId, id);

    if (purchaseOrder.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Cannot cancel a received purchase order');
    }

    if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Purchase order already cancelled');
    }

    purchaseOrder.status = PurchaseOrderStatus.CANCELLED;
    await this.purchaseOrderRepository.save(purchaseOrder);

    this.logger.log(`Purchase order ${purchaseOrder.po_number} cancelled`);

    return this.findOne(companyId, id);
  }

  private async generatePONumber(companyId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Get count of POs this month
    const count = await this.purchaseOrderRepository
      .createQueryBuilder('po')
      .where('po.company_id = :companyId', { companyId })
      .andWhere('po.po_number LIKE :pattern', {
        pattern: `PO-${year}${month}-%`,
      })
      .getCount();

    const sequence = String(count + 1).padStart(5, '0');
    return `PO-${year}${month}-${sequence}`;
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Inventory } from './inventory.entity';
import { StockMovement, MovementType } from './stock-movement.entity';
import { Product } from '../products/product.entity';
import { CreateStockMovementDto, ReserveStockDto, TransferStockDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Get or create inventory record for a product/variant in a store
   */
  private async getOrCreateInventory(
    companyId: string,
    storeId: string,
    productId: string,
    variantId?: string | null,
  ): Promise<Inventory> {
    let inventory = await this.inventoryRepo.findOne({
      where: {
        companyId,
        storeId,
        productId,
        variantId: variantId ? variantId : IsNull(),
      },
    });

    if (!inventory) {
      inventory = this.inventoryRepo.create({
        companyId,
        storeId,
        productId,
        variantId: variantId || null,
        quantity: 0,
        reservedQuantity: 0,
      });
      inventory = await this.inventoryRepo.save(inventory);
    }

    return inventory;
  }

  /**
   * Record a stock movement (IN, OUT, ADJUSTMENT, RETURN)
   */
  async recordMovement(
    companyId: string,
    userId: string,
    dto: CreateStockMovementDto,
  ): Promise<StockMovement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify product exists and belongs to company
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: dto.productId, companyId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Get or create inventory record
      let inventory = await queryRunner.manager.findOne(Inventory, {
        where: {
          companyId,
          storeId: dto.storeId,
          productId: dto.productId,
          variantId: dto.variantId ? dto.variantId : IsNull(),
        },
      });

      if (!inventory) {
        inventory = queryRunner.manager.create(Inventory, {
          companyId,
          storeId: dto.storeId,
          productId: dto.productId,
          variantId: dto.variantId || null,
          quantity: 0,
          reservedQuantity: 0,
        });
        inventory = await queryRunner.manager.save(Inventory, inventory);
      }

      const currentQuantity = inventory.quantity;
      let newQuantity = currentQuantity;

      // Calculate new quantity based on movement type
      switch (dto.type) {
        case MovementType.IN:
        case MovementType.RETURN:
          newQuantity = currentQuantity + dto.quantity;
          break;

        case MovementType.OUT:
        case MovementType.SALE:
          newQuantity = currentQuantity - dto.quantity;
          if (newQuantity < 0) {
            throw new BadRequestException('Insufficient stock');
          }
          break;

        case MovementType.ADJUSTMENT:
          // For adjustment, the quantity is the new absolute value
          newQuantity = dto.quantity;
          break;

        default:
          throw new BadRequestException(`Invalid movement type: ${dto.type}`);
      }

      // Update inventory quantity
      inventory.quantity = newQuantity;
      if (dto.type === MovementType.IN) {
        inventory.lastRestockDate = new Date();
      }
      await queryRunner.manager.save(Inventory, inventory);

      // Create stock movement record
      const movement = queryRunner.manager.create(StockMovement, {
        companyId,
        storeId: dto.storeId,
        productId: dto.productId,
        variantId: dto.variantId || null,
        type: dto.type,
        quantity: dto.quantity,
        stockAfter: newQuantity,
        reason: dto.reason,
        reference: dto.reference,
        performedBy: userId,
      });
      const savedMovement = await queryRunner.manager.save(
        StockMovement,
        movement,
      );

      await queryRunner.commitTransaction();
      return savedMovement;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reserve stock for pending orders (decreases available_quantity)
   */
  async reserveStock(
    companyId: string,
    userId: string,
    dto: ReserveStockDto,
  ): Promise<Inventory> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get inventory with row-level lock to prevent race conditions
      const inventory = await queryRunner.manager
        .createQueryBuilder(Inventory, 'inventory')
        .where('inventory.companyId = :companyId', { companyId })
        .andWhere('inventory.storeId = :storeId', { storeId: dto.storeId })
        .andWhere('inventory.productId = :productId', {
          productId: dto.productId,
        })
        .andWhere(
          dto.variantId
            ? 'inventory.variantId = :variantId'
            : 'inventory.variantId IS NULL',
          dto.variantId ? { variantId: dto.variantId } : {},
        )
        .setLock('pessimistic_write')
        .getOne();

      if (!inventory) {
        throw new NotFoundException('Inventory record not found');
      }

      const availableQuantity = inventory.quantity - inventory.reservedQuantity;
      if (availableQuantity < dto.quantity) {
        throw new BadRequestException(
          `Insufficient available stock. Available: ${availableQuantity}, Requested: ${dto.quantity}`,
        );
      }

      // Increase reserved quantity
      inventory.reservedQuantity += dto.quantity;
      const updatedInventory = await queryRunner.manager.save(
        Inventory,
        inventory,
      );

      // Log the reservation as a movement
      const movement = queryRunner.manager.create(StockMovement, {
        companyId,
        storeId: dto.storeId,
        productId: dto.productId,
        variantId: dto.variantId || null,
        type: MovementType.OUT,
        quantity: dto.quantity,
        stockAfter: inventory.quantity,
        reason: dto.reason || 'Stock reserved',
        reference: 'RESERVE',
        performedBy: userId,
      });
      await queryRunner.manager.save(StockMovement, movement);

      await queryRunner.commitTransaction();
      return updatedInventory;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Release reserved stock (increases available_quantity)
   */
  async releaseStock(
    companyId: string,
    userId: string,
    dto: ReserveStockDto,
  ): Promise<Inventory> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const inventory = await queryRunner.manager
        .createQueryBuilder(Inventory, 'inventory')
        .where('inventory.companyId = :companyId', { companyId })
        .andWhere('inventory.storeId = :storeId', { storeId: dto.storeId })
        .andWhere('inventory.productId = :productId', {
          productId: dto.productId,
        })
        .andWhere(
          dto.variantId
            ? 'inventory.variantId = :variantId'
            : 'inventory.variantId IS NULL',
          dto.variantId ? { variantId: dto.variantId } : {},
        )
        .setLock('pessimistic_write')
        .getOne();

      if (!inventory) {
        throw new NotFoundException('Inventory record not found');
      }

      if (inventory.reservedQuantity < dto.quantity) {
        throw new BadRequestException(
          `Cannot release more than reserved. Reserved: ${inventory.reservedQuantity}, Requested: ${dto.quantity}`,
        );
      }

      // Decrease reserved quantity
      inventory.reservedQuantity -= dto.quantity;
      const updatedInventory = await queryRunner.manager.save(
        Inventory,
        inventory,
      );

      // Log the release as a movement
      const movement = queryRunner.manager.create(StockMovement, {
        companyId,
        storeId: dto.storeId,
        productId: dto.productId,
        variantId: dto.variantId || null,
        type: MovementType.IN,
        quantity: dto.quantity,
        stockAfter: inventory.quantity,
        reason: dto.reason || 'Stock released',
        reference: 'RELEASE',
        performedBy: userId,
      });
      await queryRunner.manager.save(StockMovement, movement);

      await queryRunner.commitTransaction();
      return updatedInventory;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Transfer stock between stores
   */
  async transferStock(
    companyId: string,
    userId: string,
    dto: TransferStockDto,
  ): Promise<{ fromInventory: Inventory; toInventory: Inventory }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify product exists
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: dto.productId, companyId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Get source inventory with lock
      const fromInventory = await queryRunner.manager
        .createQueryBuilder(Inventory, 'inventory')
        .where('inventory.companyId = :companyId', { companyId })
        .andWhere('inventory.storeId = :storeId', {
          storeId: dto.fromStoreId,
        })
        .andWhere('inventory.productId = :productId', {
          productId: dto.productId,
        })
        .andWhere(
          dto.variantId
            ? 'inventory.variantId = :variantId'
            : 'inventory.variantId IS NULL',
          dto.variantId ? { variantId: dto.variantId } : {},
        )
        .setLock('pessimistic_write')
        .getOne();

      if (!fromInventory) {
        throw new NotFoundException('Source inventory not found');
      }

      const availableQuantity =
        fromInventory.quantity - fromInventory.reservedQuantity;
      if (availableQuantity < dto.quantity) {
        throw new BadRequestException(
          `Insufficient available stock in source store. Available: ${availableQuantity}, Requested: ${dto.quantity}`,
        );
      }

      // Get or create destination inventory
      let toInventory = await queryRunner.manager.findOne(Inventory, {
        where: {
          companyId,
          storeId: dto.toStoreId,
          productId: dto.productId,
          variantId: dto.variantId ? dto.variantId : IsNull(),
        },
      });

      if (!toInventory) {
        toInventory = queryRunner.manager.create(Inventory, {
          companyId,
          storeId: dto.toStoreId,
          productId: dto.productId,
          variantId: dto.variantId || null,
          quantity: 0,
          reservedQuantity: 0,
        });
        toInventory = await queryRunner.manager.save(Inventory, toInventory);
      }

      // Deduct from source
      fromInventory.quantity -= dto.quantity;
      await queryRunner.manager.save(Inventory, fromInventory);

      // Add to destination
      toInventory.quantity += dto.quantity;
      toInventory.lastRestockDate = new Date();
      await queryRunner.manager.save(Inventory, toInventory);

      // Record movements
      const reference = `TRANSFER-${Date.now()}`;

      const fromMovement = queryRunner.manager.create(StockMovement, {
        companyId,
        storeId: dto.fromStoreId,
        productId: dto.productId,
        variantId: dto.variantId || null,
        type: MovementType.TRANSFER,
        quantity: dto.quantity,
        stockAfter: fromInventory.quantity,
        reference,
        reason: dto.notes || `Transfer to store ${dto.toStoreId}`,
        performedBy: userId,
      });

      const toMovement = queryRunner.manager.create(StockMovement, {
        companyId,
        storeId: dto.toStoreId,
        productId: dto.productId,
        variantId: dto.variantId || null,
        type: MovementType.TRANSFER,
        quantity: dto.quantity,
        stockAfter: toInventory.quantity,
        reference,
        reason: dto.notes || `Transfer from store ${dto.fromStoreId}`,
        performedBy: userId,
      });

      await queryRunner.manager.save(StockMovement, fromMovement);
      await queryRunner.manager.save(StockMovement, toMovement);

      await queryRunner.commitTransaction();

      return {
        fromInventory,
        toInventory,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get inventory by store with filters
   */
  async getInventoryByStore(
    companyId: string,
    storeId: string,
    filters?: {
      productId?: string;
      lowStock?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: Inventory[]; total: number }> {
    const query = this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.variant', 'variant')
      .where('inventory.companyId = :companyId', { companyId })
      .andWhere('inventory.storeId = :storeId', { storeId });

    if (filters?.productId) {
      query.andWhere('inventory.productId = :productId', {
        productId: filters.productId,
      });
    }

    if (filters?.lowStock) {
      query.andWhere(
        'inventory.availableQuantity <= product.lowStockThreshold',
      );
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  /**
   * Get inventory for a product across all stores
   */
  async getInventoryByProduct(
    companyId: string,
    productId: string,
    variantId?: string | null,
  ): Promise<Inventory[]> {
    const where: any = {
      companyId,
      productId,
      variantId: variantId ? variantId : IsNull(),
    };

    return this.inventoryRepo.find({
      where,
      relations: ['store', 'product', 'variant'],
      order: { storeId: 'ASC' },
    });
  }

  /**
   * Get available quantity for a product/variant in a store
   */
  async getAvailableQuantity(
    companyId: string,
    storeId: string,
    productId: string,
    variantId?: string | null,
  ): Promise<number> {
    const inventory = await this.inventoryRepo.findOne({
      where: {
        companyId,
        storeId,
        productId,
        variantId: variantId ? variantId : IsNull(),
      },
    });

    if (!inventory) {
      return 0;
    }

    return inventory.availableQuantity;
  }

  /**
   * Get low stock products for a store
   */
  async getLowStockProducts(
    companyId: string,
    storeId: string,
  ): Promise<Inventory[]> {
    return this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.variant', 'variant')
      .where('inventory.companyId = :companyId', { companyId })
      .andWhere('inventory.storeId = :storeId', { storeId })
      .andWhere('product.trackInventory = true')
      .andWhere('inventory.availableQuantity <= product.lowStockThreshold')
      .andWhere('product.isActive = true')
      .orderBy('inventory.availableQuantity', 'ASC')
      .getMany();
  }

  /**
   * Get stock movement history
   */
  async findMovements(
    companyId: string,
    filters?: {
      storeId?: string;
      productId?: string;
      variantId?: string;
      type?: MovementType;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: StockMovement[]; total: number }> {
    const query = this.movementRepo
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .leftJoinAndSelect('movement.variant', 'variant')
      .leftJoinAndSelect('movement.store', 'store')
      .leftJoinAndSelect('movement.performedByUser', 'user')
      .where('movement.companyId = :companyId', { companyId });

    if (filters?.storeId) {
      query.andWhere('movement.storeId = :storeId', {
        storeId: filters.storeId,
      });
    }

    if (filters?.productId) {
      query.andWhere('movement.productId = :productId', {
        productId: filters.productId,
      });
    }

    if (filters?.variantId) {
      query.andWhere('movement.variantId = :variantId', {
        variantId: filters.variantId,
      });
    }

    if (filters?.type) {
      query.andWhere('movement.type = :type', { type: filters.type });
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 100;
    query
      .orderBy('movement.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  /**
   * Called internally after a transaction to deduct stock
   */
  async recordSale(
    companyId: string,
    userId: string,
    storeId: string,
    productId: string,
    variantId: string | null | undefined,
    quantity: number,
    reference: string,
  ): Promise<StockMovement> {
    return this.recordMovement(companyId, userId, {
      type: MovementType.SALE,
      quantity,
      productId,
      variantId: variantId || undefined,
      storeId,
      reference,
      reason: 'Auto-deducted from POS transaction',
    });
  }

  /**
   * Send low stock alerts for products below threshold
   * This method can be called manually or scheduled via cron job
   */
  async sendLowStockAlerts(
    companyId: string,
    storeId: string,
    recipientEmail: string,
  ): Promise<{ sent: number; products: string[] }> {
    try {
      const lowStockProducts = await this.getLowStockProducts(
        companyId,
        storeId,
      );

      if (lowStockProducts.length === 0) {
        this.logger.log(
          `No low stock products found for company ${companyId}, store ${storeId}`,
        );
        return { sent: 0, products: [] };
      }

      // Send individual alerts for each low stock product
      const productNames: string[] = [];
      for (const inventory of lowStockProducts) {
        const productName = inventory.variant
          ? `${inventory.product.name} (${inventory.variant.name})`
          : inventory.product.name;

        productNames.push(productName);

        await this.notificationsService.sendLowStockAlert(
          recipientEmail,
          productName,
          inventory.availableQuantity,
        );

        this.logger.log(
          `Low stock alert sent for product: ${productName}, available: ${inventory.availableQuantity}`,
        );
      }

      return { sent: lowStockProducts.length, products: productNames };
    } catch (error) {
      this.logger.error(
        `Failed to send low stock alerts for company ${companyId}, store ${storeId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Check if product is low stock after movement and send alert if needed
   */
  private async checkAndAlertLowStock(
    companyId: string,
    storeId: string,
    productId: string,
    variantId: string | null,
  ): Promise<void> {
    try {
      // Get inventory with product details
      const inventory = await this.inventoryRepo
        .createQueryBuilder('inventory')
        .leftJoinAndSelect('inventory.product', 'product')
        .leftJoinAndSelect('inventory.variant', 'variant')
        .where('inventory.companyId = :companyId', { companyId })
        .andWhere('inventory.storeId = :storeId', { storeId })
        .andWhere('inventory.productId = :productId', { productId })
        .andWhere(
          variantId
            ? 'inventory.variantId = :variantId'
            : 'inventory.variantId IS NULL',
          variantId ? { variantId } : {},
        )
        .getOne();

      if (!inventory || !inventory.product) {
        return;
      }

      // Check if stock is low
      if (
        inventory.product.trackInventory &&
        inventory.availableQuantity <= inventory.product.lowStockThreshold
      ) {
        const productName = inventory.variant
          ? `${inventory.product.name} (${inventory.variant.name})`
          : inventory.product.name;

        this.logger.warn(
          `Low stock detected: ${productName}, available: ${inventory.availableQuantity}, threshold: ${inventory.product.lowStockThreshold}`,
        );

        // Note: In production, you would get the recipient email from company settings
        // For now, this is a placeholder that logs the alert
        // The actual email sending would be triggered by a scheduled job or manual call
      }
    } catch (error) {
      this.logger.error(
        `Failed to check low stock for product ${productId}`,
        error,
      );
      // Don't throw - this is a background check that shouldn't fail the main operation
    }
  }
}

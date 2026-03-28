import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockMovement, MovementType } from './stock-movement.entity';
import { Product } from '../products/product.entity';
import { CreateStockMovementDto } from './dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async recordMovement(memberId: string, dto: CreateStockMovementDto): Promise<StockMovement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get current product stock
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: dto.productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const currentStock = product.stock || 0;
      let newStock = currentStock;

      // Calculate new stock based on movement type
      if (dto.type === MovementType.IN || dto.type === MovementType.RETURN) {
        newStock = currentStock + dto.quantity;
      } else if (dto.type === MovementType.OUT || dto.type === MovementType.SALE) {
        newStock = currentStock - dto.quantity;
        if (newStock < 0) {
          throw new BadRequestException('Insufficient stock');
        }
      } else if (dto.type === MovementType.ADJUSTMENT) {
        // For adjustment, the quantity can be positive or negative
        newStock = dto.quantity;
      }

      // Update product stock
      product.stock = newStock;
      await queryRunner.manager.save(Product, product);

      // Create stock movement record
      const movement = queryRunner.manager.create(StockMovement, {
        ...dto,
        memberId,
        stockAfter: newStock,
      });
      const savedMovement = await queryRunner.manager.save(StockMovement, movement);

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
   * Called internally after a transaction is created to log the SALE movement.
   */
  async recordSale(
    memberId: string,
    storeId: string,
    productId: string,
    quantity: number,
    reference: string,
  ): Promise<StockMovement> {
    return this.recordMovement(memberId, {
      type: MovementType.SALE,
      quantity,
      productId,
      storeId,
      reference,
      reason: 'Auto-deducted from POS transaction',
    });
  }

  async findAll(memberId: string, storeId?: string, productId?: string): Promise<StockMovement[]> {
    const where: any = { memberId };
    if (storeId) where.storeId = storeId;
    if (productId) where.productId = productId;
    return this.movementRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }
}

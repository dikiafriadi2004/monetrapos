import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  StockOpname,
  StockOpnameItem,
  StockOpnameStatus,
} from './stock-opname.entity';
import { CreateStockOpnameDto } from './dto/create-stock-opname.dto';
import { UpdateStockOpnameDto } from './dto/update-stock-opname.dto';
import { StockMovement, MovementType } from './stock-movement.entity';

@Injectable()
export class StockOpnameService {
  private readonly logger = new Logger(StockOpnameService.name);

  constructor(
    @InjectRepository(StockOpname)
    private readonly stockOpnameRepository: Repository<StockOpname>,
    @InjectRepository(StockOpnameItem)
    private readonly stockOpnameItemRepository: Repository<StockOpnameItem>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    companyId: string,
    userId: string,
    createDto: CreateStockOpnameDto,
  ): Promise<StockOpname> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate opname number
      const opnameNumber = await this.generateOpnameNumber(companyId);

      // Calculate differences and count discrepancies
      let totalDiscrepancies = 0;
      const items = createDto.items.map((item) => {
        const difference = item.physical_quantity - item.system_quantity;
        if (difference !== 0) {
          totalDiscrepancies++;
        }

        return {
          ...item,
          difference,
          is_adjusted: false,
        };
      });

      // Create stock opname
      const stockOpname = this.stockOpnameRepository.create({
        company_id: companyId,
        opname_number: opnameNumber,
        store_id: createDto.store_id,
        created_by: userId,
        status: StockOpnameStatus.IN_PROGRESS,
        opname_date: createDto.opname_date || new Date(),
        notes: createDto.notes,
        total_items: items.length,
        total_discrepancies: totalDiscrepancies,
      });

      const savedOpname = await queryRunner.manager.save(stockOpname);

      // Create stock opname items
      const opnameItems = items.map((item) =>
        this.stockOpnameItemRepository.create({
          ...item,
          stock_opname_id: savedOpname.id,
        }),
      );

      await queryRunner.manager.save(opnameItems);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Stock opname ${opnameNumber} created for company ${companyId}`,
      );

      return this.findOne(companyId, savedOpname.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create stock opname', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    companyId: string,
    filters?: {
      status?: StockOpnameStatus;
      store_id?: string;
      from_date?: Date;
      to_date?: Date;
    },
  ): Promise<StockOpname[]> {
    const query = this.stockOpnameRepository
      .createQueryBuilder('opname')
      .leftJoinAndSelect('opname.store', 'store')
      .leftJoinAndSelect('opname.creator', 'creator')
      .leftJoinAndSelect('opname.completer', 'completer')
      .leftJoinAndSelect('opname.items', 'items')
      .where('opname.company_id = :companyId', { companyId });

    if (filters?.status) {
      query.andWhere('opname.status = :status', { status: filters.status });
    }

    if (filters?.store_id) {
      query.andWhere('opname.store_id = :storeId', {
        storeId: filters.store_id,
      });
    }

    if (filters?.from_date) {
      query.andWhere('opname.opname_date >= :fromDate', {
        fromDate: filters.from_date,
      });
    }

    if (filters?.to_date) {
      query.andWhere('opname.opname_date <= :toDate', {
        toDate: filters.to_date,
      });
    }

    return await query.orderBy('opname.opname_date', 'DESC').getMany();
  }

  async findOne(companyId: string, id: string): Promise<StockOpname> {
    const stockOpname = await this.stockOpnameRepository.findOne({
      where: { id, company_id: companyId },
      relations: ['store', 'creator', 'completer', 'items'],
    });

    if (!stockOpname) {
      throw new NotFoundException(`Stock opname with ID ${id} not found`);
    }

    return stockOpname;
  }

  async update(
    companyId: string,
    id: string,
    updateDto: UpdateStockOpnameDto,
  ): Promise<StockOpname> {
    const stockOpname = await this.findOne(companyId, id);

    // Only allow updates for IN_PROGRESS status
    if (stockOpname.status !== StockOpnameStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Only in-progress stock opnames can be updated',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update basic fields
      if (updateDto.store_id) stockOpname.store_id = updateDto.store_id;
      if (updateDto.opname_date) stockOpname.opname_date = updateDto.opname_date;
      if (updateDto.notes !== undefined) stockOpname.notes = updateDto.notes;

      // Update items if provided
      if (updateDto.items) {
        // Delete existing items
        await queryRunner.manager.delete(StockOpnameItem, {
          stock_opname_id: id,
        });

        // Recalculate differences and count discrepancies
        let totalDiscrepancies = 0;
        const items = updateDto.items.map((item) => {
          const difference = item.physical_quantity - item.system_quantity;
          if (difference !== 0) {
            totalDiscrepancies++;
          }

          return this.stockOpnameItemRepository.create({
            ...item,
            stock_opname_id: id,
            difference,
            is_adjusted: false,
          });
        });

        stockOpname.total_items = items.length;
        stockOpname.total_discrepancies = totalDiscrepancies;

        await queryRunner.manager.save(items);
      }

      await queryRunner.manager.save(stockOpname);
      await queryRunner.commitTransaction();

      return this.findOne(companyId, id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to update stock opname', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async complete(
    companyId: string,
    id: string,
    userId: string,
    applyAdjustments: boolean = true,
  ): Promise<StockOpname> {
    const stockOpname = await this.findOne(companyId, id);

    // Validate status
    if (stockOpname.status !== StockOpnameStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Only in-progress stock opnames can be completed',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Apply adjustments if requested
      if (applyAdjustments) {
        for (const item of stockOpname.items) {
          if (item.difference !== 0 && !item.is_adjusted) {
            // Create stock movement for adjustment
            const movementType = MovementType.ADJUSTMENT;

            const stockMovement = this.stockMovementRepository.create({
              companyId: companyId,
              storeId: stockOpname.store_id,
              productId: item.product_id,
              type: movementType,
              quantity: Math.abs(item.difference),
              reason: `Stock Opname ${stockOpname.opname_number}`,
              reference: stockOpname.id,
              performedBy: userId,
            });

            await queryRunner.manager.save(stockMovement);

            // Update inventory
            await queryRunner.manager.query(
              `
              UPDATE inventory
              SET available_quantity = available_quantity + ?,
                  updated_at = NOW()
              WHERE company_id = ?
                AND store_id = ?
                AND product_id = ?
              `,
              [
                item.difference,
                companyId,
                stockOpname.store_id,
                item.product_id,
              ],
            );

            // Mark item as adjusted
            item.is_adjusted = true;
            await queryRunner.manager.save(item);
          }
        }
      }

      // Update stock opname status
      stockOpname.status = StockOpnameStatus.COMPLETED;
      stockOpname.completed_at = new Date();
      stockOpname.completed_by = userId;

      await queryRunner.manager.save(stockOpname);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Stock opname ${stockOpname.opname_number} completed by user ${userId}`,
      );

      return this.findOne(companyId, id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to complete stock opname', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancel(companyId: string, id: string): Promise<StockOpname> {
    const stockOpname = await this.findOne(companyId, id);

    if (stockOpname.status === StockOpnameStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed stock opname');
    }

    if (stockOpname.status === StockOpnameStatus.CANCELLED) {
      throw new BadRequestException('Stock opname already cancelled');
    }

    stockOpname.status = StockOpnameStatus.CANCELLED;
    await this.stockOpnameRepository.save(stockOpname);

    this.logger.log(`Stock opname ${stockOpname.opname_number} cancelled`);

    return this.findOne(companyId, id);
  }

  async getDiscrepancyReport(
    companyId: string,
    id: string,
  ): Promise<{
    opname: StockOpname;
    summary: {
      total_items: number;
      items_with_discrepancy: number;
      items_with_surplus: number;
      items_with_shortage: number;
      total_surplus_quantity: number;
      total_shortage_quantity: number;
    };
    discrepancies: StockOpnameItem[];
  }> {
    const opname = await this.findOne(companyId, id);

    const discrepancies = opname.items.filter((item) => item.difference !== 0);

    const summary = {
      total_items: opname.items.length,
      items_with_discrepancy: discrepancies.length,
      items_with_surplus: discrepancies.filter((item) => item.difference > 0)
        .length,
      items_with_shortage: discrepancies.filter((item) => item.difference < 0)
        .length,
      total_surplus_quantity: discrepancies
        .filter((item) => item.difference > 0)
        .reduce((sum, item) => sum + item.difference, 0),
      total_shortage_quantity: Math.abs(
        discrepancies
          .filter((item) => item.difference < 0)
          .reduce((sum, item) => sum + item.difference, 0),
      ),
    };

    return {
      opname,
      summary,
      discrepancies,
    };
  }

  private async generateOpnameNumber(companyId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Get count of opnames this month
    const count = await this.stockOpnameRepository
      .createQueryBuilder('opname')
      .where('opname.company_id = :companyId', { companyId })
      .andWhere('opname.opname_number LIKE :pattern', {
        pattern: `SO-${year}${month}-%`,
      })
      .getCount();

    const sequence = String(count + 1).padStart(5, '0');
    return `SO-${year}${month}-${sequence}`;
  }
}

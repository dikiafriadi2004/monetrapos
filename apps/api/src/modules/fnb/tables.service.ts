import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table, TableStatus } from './table.entity';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto, UpdateTableStatusDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
  ) {}

  async create(createTableDto: CreateTableDto, companyId: string): Promise<Table> {
    // Check if table number already exists in this store
    const existingTable = await this.tableRepository.findOne({
      where: {
        table_number: createTableDto.table_number,
        store_id: createTableDto.store_id,
        company_id: companyId,
        is_active: true,
      },
    });

    if (existingTable) {
      throw new BadRequestException(
        `Table number ${createTableDto.table_number} already exists in this store`,
      );
    }

    const table = this.tableRepository.create({
      ...createTableDto,
      company_id: companyId,
      status: createTableDto.status || TableStatus.AVAILABLE,
    });

    return await this.tableRepository.save(table);
  }

  async findAll(
    companyId: string,
    storeId?: string,
    floor?: string,
    section?: string,
    status?: TableStatus,
  ): Promise<Table[]> {
    const query = this.tableRepository
      .createQueryBuilder('table')
      .where('table.company_id = :companyId', { companyId })
      .andWhere('table.is_active = :isActive', { isActive: true })
      .leftJoinAndSelect('table.current_transaction', 'transaction')
      .orderBy('table.table_number', 'ASC');

    if (storeId) {
      query.andWhere('table.store_id = :storeId', { storeId });
    }

    if (floor) {
      query.andWhere('table.floor = :floor', { floor });
    }

    if (section) {
      query.andWhere('table.section = :section', { section });
    }

    if (status) {
      query.andWhere('table.status = :status', { status });
    }

    return await query.getMany();
  }

  async findOne(id: string, companyId: string): Promise<Table> {
    const table = await this.tableRepository.findOne({
      where: { id, company_id: companyId, is_active: true },
      relations: ['current_transaction', 'store'],
    });

    if (!table) {
      throw new NotFoundException(`Table with ID ${id} not found`);
    }

    return table;
  }

  async update(
    id: string,
    updateTableDto: UpdateTableDto,
    companyId: string,
  ): Promise<Table> {
    const table = await this.findOne(id, companyId);

    // Check if table number is being changed and if it already exists
    if (
      updateTableDto.table_number &&
      updateTableDto.table_number !== table.table_number
    ) {
      const existingTable = await this.tableRepository.findOne({
        where: {
          table_number: updateTableDto.table_number,
          store_id: updateTableDto.store_id || table.store_id,
          company_id: companyId,
          is_active: true,
        },
      });

      if (existingTable && existingTable.id !== id) {
        throw new BadRequestException(
          `Table number ${updateTableDto.table_number} already exists in this store`,
        );
      }
    }

    Object.assign(table, updateTableDto);
    return await this.tableRepository.save(table);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateTableStatusDto,
    companyId: string,
  ): Promise<Table> {
    const table = await this.findOne(id, companyId);

    // Validate status transitions
    if (updateStatusDto.status === TableStatus.OCCUPIED) {
      // current_transaction_id optional — can be set later when transaction is created
    }

    if (updateStatusDto.status === TableStatus.AVAILABLE) {
      // Clear transaction when table becomes available
      table.current_transaction_id = null;
    } else if (updateStatusDto.current_transaction_id !== undefined) {
      table.current_transaction_id = updateStatusDto.current_transaction_id;
    }

    table.status = updateStatusDto.status;
    return await this.tableRepository.save(table);
  }

  /**
   * Sync table statuses based on active FnB orders.
   * Fixes tables that are occupied without active orders, or available with active orders.
   */
  async syncTableStatuses(companyId: string, storeId?: string): Promise<{ fixed: number }> {
    const query = this.tableRepository
      .createQueryBuilder('table')
      .where('table.company_id = :companyId', { companyId })
      .andWhere('table.is_active = :isActive', { isActive: true });

    if (storeId) query.andWhere('table.store_id = :storeId', { storeId });

    const tables = await query.getMany();
    let fixed = 0;

    for (const table of tables) {
      // Check if there's an active FnB order for this table
      const activeOrder = await this.tableRepository.manager
        .createQueryBuilder()
        .select('o.id', 'id')
        .from('fnb_orders', 'o')
        .where('o.table_id = :tableId', { tableId: table.id })
        .andWhere('o.status NOT IN (:...done)', { done: ['completed', 'cancelled'] })
        .getRawOne();

      const shouldBeOccupied = !!activeOrder;
      const isOccupied = table.status === TableStatus.OCCUPIED;

      if (shouldBeOccupied && !isOccupied) {
        await this.tableRepository.update({ id: table.id }, { status: TableStatus.OCCUPIED });
        fixed++;
      } else if (!shouldBeOccupied && isOccupied) {
        await this.tableRepository.update({ id: table.id }, { status: TableStatus.AVAILABLE, current_transaction_id: null });
        fixed++;
      }
    }

    return { fixed };
  }

  async remove(id: string, companyId: string): Promise<void> {
    const table = await this.findOne(id, companyId);

    if (table.status === TableStatus.OCCUPIED) {
      throw new BadRequestException('Cannot delete an occupied table');
    }

    // Soft delete
    table.is_active = false;
    await this.tableRepository.save(table);
  }

  async getFloorPlan(
    companyId: string,
    storeId: string,
    floor?: string,
  ): Promise<{
    floors: string[];
    sections: string[];
    tables: Table[];
  }> {
    const query = this.tableRepository
      .createQueryBuilder('table')
      .where('table.company_id = :companyId', { companyId })
      .andWhere('table.store_id = :storeId', { storeId })
      .andWhere('table.is_active = :isActive', { isActive: true })
      .leftJoinAndSelect('table.current_transaction', 'transaction');

    if (floor) {
      query.andWhere('table.floor = :floor', { floor });
    }

    const tables = await query.getMany();

    // Get unique floors and sections
    const floors = [...new Set(tables.map((t) => t.floor).filter(Boolean))];
    const sections = [...new Set(tables.map((t) => t.section).filter(Boolean))];

    return {
      floors,
      sections,
      tables,
    };
  }
}

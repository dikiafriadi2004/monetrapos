import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store, StoreType } from './store.entity';
import { User } from '../users/user.entity';
import { CreateStoreDto, UpdateStoreDto } from './dto';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private storeRepo: Repository<Store>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(dto: CreateStoreDto, companyId: string): Promise<Store> {
    // Validate store code uniqueness within company
    if (dto.code) {
      await this.validateStoreCode(dto.code, companyId);
    }

    // Validate manager if provided
    if (dto.managerId) {
      await this.validateManager(dto.managerId, companyId);
    }

    const store = this.storeRepo.create({
      ...dto,
      companyId,
      type: dto.type as any,
    });
    
    return this.storeRepo.save(store);
  }

  /**
   * Validate that store code is unique within company
   */
  private async validateStoreCode(code: string, companyId: string, excludeStoreId?: string): Promise<void> {
    const query = this.storeRepo.createQueryBuilder('store')
      .where('store.companyId = :companyId', { companyId })
      .andWhere('store.code = :code', { code });

    if (excludeStoreId) {
      query.andWhere('store.id != :excludeStoreId', { excludeStoreId });
    }

    const existingStore = await query.getOne();
    
    if (existingStore) {
      throw new ConflictException(`Store code '${code}' already exists in your company`);
    }
  }

  /**
   * Validate that manager exists and belongs to the same company
   */
  private async validateManager(managerId: string, companyId: string): Promise<void> {
    const manager = await this.userRepo.findOne({
      where: { id: managerId, companyId },
    });

    if (!manager) {
      throw new BadRequestException('Manager not found or does not belong to your company');
    }

    if (!manager.isActive) {
      throw new BadRequestException('Manager account is not active');
    }
  }

  /**
   * Create default store for new company after subscription activation
   */
  async createDefaultStore(
    companyId: string,
    companyName: string,
  ): Promise<Store> {
    const defaultStore = this.storeRepo.create({
      companyId,
      name: `${companyName} - Main Store`,
      code: 'MAIN',
      type: StoreType.RETAIL,
      isActive: true,
      receiptHeader: companyName,
      receiptFooter: 'Thank you for your business!',
    });

    return this.storeRepo.save(defaultStore);
  }

  async findAll(
    companyId: string,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      isActive?: boolean;
      type?: string;
      managerId?: string;
    },
  ): Promise<{ data: Store[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.storeRepo.createQueryBuilder('store')
      .leftJoinAndSelect('store.manager', 'manager')
      .where('store.companyId = :companyId', { companyId });

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('store.isActive = :isActive', { isActive: options.isActive });
    }

    if (options?.type) {
      queryBuilder.andWhere('store.type = :type', { type: options.type });
    }

    if (options?.managerId) {
      queryBuilder.andWhere('store.managerId = :managerId', { managerId: options.managerId });
    }

    if (options?.search) {
      queryBuilder.andWhere(
        '(store.name ILIKE :search OR store.code ILIKE :search OR store.city ILIKE :search OR store.address ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    const [data, total] = await queryBuilder
      .orderBy('store.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, companyId: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ 
      where: { id, companyId },
      relations: ['manager'],
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async update(
    id: string,
    dto: UpdateStoreDto,
    companyId: string,
  ): Promise<Store> {
    const store = await this.findOne(id, companyId);

    // Validate store code uniqueness if code is being updated
    if (dto.code && dto.code !== store.code) {
      await this.validateStoreCode(dto.code, companyId, id);
    }

    // Validate manager if being updated
    if (dto.managerId !== undefined) {
      if (dto.managerId === null) {
        // Allow removing manager
        store.managerId = null as any;
      } else {
        await this.validateManager(dto.managerId, companyId);
        store.managerId = dto.managerId;
      }
    }

    Object.assign(store, dto);
    return this.storeRepo.save(store);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const store = await this.findOne(id, companyId);
    await this.storeRepo.softRemove(store);
  }

  /**
   * Assign a manager to a store
   */
  async assignManager(storeId: string, managerId: string, companyId: string): Promise<Store> {
    const store = await this.findOne(storeId, companyId);
    await this.validateManager(managerId, companyId);
    
    store.managerId = managerId;
    return this.storeRepo.save(store);
  }

  /**
   * Remove manager from a store
   */
  async removeManager(storeId: string, companyId: string): Promise<Store> {
    const store = await this.findOne(storeId, companyId);
    store.managerId = null as any;
    return this.storeRepo.save(store);
  }

  /**
   * Get all stores managed by a specific user
   */
  async findByManager(managerId: string, companyId: string): Promise<Store[]> {
    return this.storeRepo.find({
      where: { managerId, companyId, isActive: true },
      relations: ['manager'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Check if a store code is available
   */
  async isCodeAvailable(code: string, companyId: string, excludeStoreId?: string): Promise<boolean> {
    try {
      await this.validateStoreCode(code, companyId, excludeStoreId);
      return true;
    } catch {
      return false;
    }
  }

  async getStoreStats(storeId: string, companyId: string): Promise<any> {
    const store = await this.storeRepo.findOne({
      where: { id: storeId, companyId },
      relations: ['manager'],
    });
    if (!store) throw new NotFoundException('Store not found');

    // TODO: Implement actual stats calculation
    return {
      store,
      stats: {
        totalEmployees: 0,
        totalProducts: 0,
        todaySales: 0,
        monthSales: 0,
      },
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './store.entity';
import { CreateStoreDto, UpdateStoreDto } from './dto';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private storeRepo: Repository<Store>,
  ) {}

  async create(dto: CreateStoreDto, companyId: string): Promise<Store> {
    const store = this.storeRepo.create({
      ...dto,
      companyId,
      type: dto.type as any,
    });
    return this.storeRepo.save(store);
  }

  async findAll(companyId: string): Promise<Store[]> {
    return this.storeRepo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, companyId: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { id, companyId } });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async update(id: string, dto: UpdateStoreDto, companyId: string): Promise<Store> {
    const store = await this.findOne(id, companyId);
    Object.assign(store, dto);
    return this.storeRepo.save(store);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const store = await this.findOne(id, companyId);
    await this.storeRepo.softRemove(store);
  }

  async getStoreStats(storeId: string, companyId: string): Promise<any> {
    const store = await this.storeRepo.findOne({ where: { id: storeId, companyId } });
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

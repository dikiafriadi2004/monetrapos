import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tax } from './tax.entity';
import { CreateTaxDto, UpdateTaxDto } from './dto';

@Injectable()
export class TaxesService {
  constructor(@InjectRepository(Tax) private taxRepo: Repository<Tax>) {}

  async create(dto: CreateTaxDto): Promise<Tax> {
    const tax = this.taxRepo.create(dto);
    return this.taxRepo.save(tax);
  }

  async findAllByStore(storeId: string): Promise<Tax[]> {
    return this.taxRepo.find({
      where: { storeId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Tax> {
    const tax = await this.taxRepo.findOne({ where: { id } });
    if (!tax) throw new NotFoundException('Tax not found');
    return tax;
  }

  async findActiveByStore(storeId: string): Promise<Tax[]> {
    return this.taxRepo.find({
      where: { storeId, isActive: true },
    });
  }

  async update(id: string, dto: UpdateTaxDto): Promise<Tax> {
    const tax = await this.findOne(id);
    Object.assign(tax, dto);
    return this.taxRepo.save(tax);
  }

  async remove(id: string): Promise<void> {
    const tax = await this.findOne(id);
    await this.taxRepo.remove(tax);
  }
}

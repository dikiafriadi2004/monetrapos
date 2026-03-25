import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feature } from './feature.entity';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectRepository(Feature)
    private featureRepo: Repository<Feature>,
  ) {}

  async create(companyId: string, dto: CreateFeatureDto): Promise<Feature> {
    const feature = this.featureRepo.create({ ...dto, companyId });
    return this.featureRepo.save(feature);
  }

  async findAll(companyId: string): Promise<Feature[]> {
    return this.featureRepo.find({ where: { companyId } });
  }

  async findOne(companyId: string, id: string): Promise<Feature> {
    const feature = await this.featureRepo.findOne({ where: { id, companyId } });
    if (!feature) throw new NotFoundException('Feature not found');
    return feature;
  }

  async update(companyId: string, id: string, dto: UpdateFeatureDto): Promise<Feature> {
    const feature = await this.findOne(companyId, id);
    Object.assign(feature, dto);
    return this.featureRepo.save(feature);
  }

  async remove(companyId: string, id: string): Promise<void> {
    const feature = await this.findOne(companyId, id);
    await this.featureRepo.remove(feature);
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LaundryServiceType } from './laundry-service-type.entity';
import { CreateLaundryServiceTypeDto } from './dto/create-laundry-service-type.dto';

@Injectable()
export class LaundryServiceTypesService {
  constructor(
    @InjectRepository(LaundryServiceType)
    private readonly serviceTypeRepository: Repository<LaundryServiceType>,
  ) {}

  async create(
    createDto: CreateLaundryServiceTypeDto,
    companyId: string,
  ): Promise<LaundryServiceType> {
    const serviceType = this.serviceTypeRepository.create({
      ...createDto,
      company_id: companyId,
    });

    return await this.serviceTypeRepository.save(serviceType);
  }

  async findAll(companyId: string): Promise<LaundryServiceType[]> {
    return await this.serviceTypeRepository.find({
      where: { company_id: companyId, is_active: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, companyId: string): Promise<LaundryServiceType> {
    const serviceType = await this.serviceTypeRepository.findOne({
      where: { id, company_id: companyId, is_active: true },
    });

    if (!serviceType) {
      throw new NotFoundException(`Service type with ID ${id} not found`);
    }

    return serviceType;
  }

  async update(
    id: string,
    updateDto: Partial<CreateLaundryServiceTypeDto>,
    companyId: string,
  ): Promise<LaundryServiceType> {
    const serviceType = await this.findOne(id, companyId);
    Object.assign(serviceType, updateDto);
    return await this.serviceTypeRepository.save(serviceType);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const serviceType = await this.findOne(id, companyId);
    serviceType.is_active = false;
    await this.serviceTypeRepository.save(serviceType);
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddOn, AddOnStatus } from './add-on.entity';
import { CreateAddOnDto } from './dto/create-add-on.dto';
import { UpdateAddOnDto } from './dto/update-add-on.dto';

@Injectable()
export class AddOnsService {
  private readonly logger = new Logger(AddOnsService.name);

  constructor(
    @InjectRepository(AddOn)
    private addOnsRepository: Repository<AddOn>,
  ) {}

  /**
   * Create a new add-on (Super Admin only)
   */
  async create(createAddOnDto: CreateAddOnDto): Promise<AddOn> {
    this.logger.log(`Creating add-on: ${createAddOnDto.name}`);

    // Check if slug already exists
    const existing = await this.addOnsRepository.findOne({
      where: { slug: createAddOnDto.slug },
    });

    if (existing) {
      throw new BadRequestException('Add-on with this slug already exists');
    }

    const addOn = this.addOnsRepository.create(createAddOnDto);
    return await this.addOnsRepository.save(addOn);
  }

  /**
   * Get all add-ons (with optional filtering)
   */
  async findAll(filters?: {
    category?: string;
    status?: AddOnStatus;
    planId?: string;
  }): Promise<AddOn[]> {
    const query = this.addOnsRepository.createQueryBuilder('add_on');

    if (filters?.category) {
      query.andWhere('add_on.category = :category', {
        category: filters.category,
      });
    }

    if (filters?.status) {
      query.andWhere('add_on.status = :status', { status: filters.status });
    }

    // Filter by plan availability
    if (filters?.planId) {
      query.andWhere(
        "(add_on.available_for_plans = '[]' OR add_on.available_for_plans LIKE :planId)",
        { planId: `%${filters.planId}%` },
      );
    }

    query.orderBy('add_on.category', 'ASC').addOrderBy('add_on.name', 'ASC');

    return await query.getMany();
  }

  /**
   * Get available add-ons for a specific plan
   */
  async findAvailableForPlan(planId: string): Promise<AddOn[]> {
    return await this.findAll({
      status: AddOnStatus.ACTIVE,
      planId,
    });
  }

  /**
   * Get add-on by ID
   */
  async findOne(id: string): Promise<AddOn> {
    const addOn = await this.addOnsRepository.findOne({ where: { id } });

    if (!addOn) {
      throw new NotFoundException('Add-on not found');
    }

    return addOn;
  }

  /**
   * Get add-on by slug
   */
  async findBySlug(slug: string): Promise<AddOn> {
    const addOn = await this.addOnsRepository.findOne({ where: { slug } });

    if (!addOn) {
      throw new NotFoundException('Add-on not found');
    }

    return addOn;
  }

  /**
   * Update add-on (Super Admin only)
   */
  async update(id: string, updateAddOnDto: UpdateAddOnDto): Promise<AddOn> {
    this.logger.log(`Updating add-on: ${id}`);

    const addOn = await this.findOne(id);

    // If slug is being updated, check for conflicts
    if (updateAddOnDto.slug && updateAddOnDto.slug !== addOn.slug) {
      const existing = await this.addOnsRepository.findOne({
        where: { slug: updateAddOnDto.slug },
      });

      if (existing) {
        throw new BadRequestException('Add-on with this slug already exists');
      }
    }

    Object.assign(addOn, updateAddOnDto);
    return await this.addOnsRepository.save(addOn);
  }

  /**
   * Delete add-on (Super Admin only)
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting add-on: ${id}`);

    const addOn = await this.findOne(id);
    await this.addOnsRepository.remove(addOn);
  }

  /**
   * Check if add-on is available for a specific plan
   */
  async isAvailableForPlan(addOnId: string, planId: string): Promise<boolean> {
    const addOn = await this.findOne(addOnId);

    // If available_for_plans is empty, it's available for all plans
    if (!addOn.available_for_plans || addOn.available_for_plans.length === 0) {
      return true;
    }

    // Check if plan ID is in the list
    return addOn.available_for_plans.includes(planId);
  }
}

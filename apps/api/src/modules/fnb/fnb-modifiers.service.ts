import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FnbModifierGroup, FnbModifierOption } from './fnb-modifier.entity';

@Injectable()
export class FnbModifiersService {
  constructor(
    @InjectRepository(FnbModifierGroup)
    private groupRepo: Repository<FnbModifierGroup>,
    @InjectRepository(FnbModifierOption)
    private optionRepo: Repository<FnbModifierOption>,
  ) {}

  // ---- Groups ----

  async createGroup(companyId: string, dto: Partial<FnbModifierGroup>): Promise<FnbModifierGroup> {
    const group = this.groupRepo.create({ ...dto, company_id: companyId });
    return this.groupRepo.save(group);
  }

  async findAllGroups(companyId: string): Promise<FnbModifierGroup[]> {
    return this.groupRepo.find({
      where: { company_id: companyId },
      relations: ['options'],
      order: { name: 'ASC' },
    });
  }

  async findGroupsForProduct(companyId: string, productId: string): Promise<FnbModifierGroup[]> {
    const groups = await this.findAllGroups(companyId);
    return groups.filter(g =>
      g.is_active && (
        !g.product_ids ||
        g.product_ids.length === 0 ||
        g.product_ids.includes(productId)
      )
    );
  }

  async findOneGroup(companyId: string, id: string): Promise<FnbModifierGroup> {
    const group = await this.groupRepo.findOne({
      where: { id, company_id: companyId },
      relations: ['options'],
    });
    if (!group) throw new NotFoundException('Modifier group not found');
    return group;
  }

  async updateGroup(companyId: string, id: string, dto: Partial<FnbModifierGroup>): Promise<FnbModifierGroup> {
    const group = await this.findOneGroup(companyId, id);
    Object.assign(group, dto);
    return this.groupRepo.save(group);
  }

  async removeGroup(companyId: string, id: string): Promise<void> {
    const group = await this.findOneGroup(companyId, id);
    await this.optionRepo.delete({ group_id: id });
    await this.groupRepo.remove(group);
  }

  // ---- Options ----

  async createOption(companyId: string, groupId: string, dto: Partial<FnbModifierOption>): Promise<FnbModifierOption> {
    await this.findOneGroup(companyId, groupId); // verify ownership
    const option = this.optionRepo.create({ ...dto, group_id: groupId });
    return this.optionRepo.save(option);
  }

  async updateOption(companyId: string, groupId: string, optionId: string, dto: Partial<FnbModifierOption>): Promise<FnbModifierOption> {
    await this.findOneGroup(companyId, groupId);
    const option = await this.optionRepo.findOne({ where: { id: optionId, group_id: groupId } });
    if (!option) throw new NotFoundException('Modifier option not found');
    Object.assign(option, dto);
    return this.optionRepo.save(option);
  }

  async removeOption(companyId: string, groupId: string, optionId: string): Promise<void> {
    await this.findOneGroup(companyId, groupId);
    await this.optionRepo.delete({ id: optionId, group_id: groupId });
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  async create(companyId: string, createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    // Generate unique supplier code
    const supplierCode = await this.generateSupplierCode(companyId);

    const supplier = this.supplierRepository.create({
      ...createSupplierDto,
      company_id: companyId,
      supplier_code: supplierCode,
    });

    return await this.supplierRepository.save(supplier);
  }

  async findAll(companyId: string, isActive?: boolean): Promise<Supplier[]> {
    const query = this.supplierRepository
      .createQueryBuilder('supplier')
      .where('supplier.company_id = :companyId', { companyId });

    if (isActive !== undefined) {
      query.andWhere('supplier.is_active = :isActive', { isActive });
    }

    return await query.orderBy('supplier.name', 'ASC').getMany();
  }

  async findOne(companyId: string, id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async update(companyId: string, id: string, updateSupplierDto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(companyId, id);

    Object.assign(supplier, updateSupplierDto);

    return await this.supplierRepository.save(supplier);
  }

  async remove(companyId: string, id: string): Promise<void> {
    const supplier = await this.findOne(companyId, id);

    // Soft delete by setting is_active to false
    supplier.is_active = false;
    await this.supplierRepository.save(supplier);
  }

  async activate(companyId: string, id: string): Promise<Supplier> {
    const supplier = await this.findOne(companyId, id);
    supplier.is_active = true;
    return await this.supplierRepository.save(supplier);
  }

  private async generateSupplierCode(companyId: string): Promise<string> {
    const prefix = 'SUP';
    const lastSupplier = await this.supplierRepository
      .createQueryBuilder('supplier')
      .where('supplier.company_id = :companyId', { companyId })
      .andWhere('supplier.supplier_code LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('supplier.created_at', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastSupplier) {
      const lastNumber = parseInt(lastSupplier.supplier_code.replace(prefix, ''), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
  }
}

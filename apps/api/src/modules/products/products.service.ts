import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Category } from './category.entity';
import { ProductVariant } from './product-variant.entity';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateVariantDto,
  UpdateVariantDto,
} from './dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(ProductVariant)
    private variantRepo: Repository<ProductVariant>,
  ) {}

  // ────── Products ──────

  async createProduct(dto: CreateProductDto): Promise<Product> {
    // Check SKU uniqueness if provided
    if (dto.sku) {
      const existingSku = await this.productRepo.findOne({
        where: { sku: dto.sku, storeId: dto.storeId },
      });
      if (existingSku) {
        throw new ConflictException(`Product with SKU "${dto.sku}" already exists`);
      }
    }

    // Check barcode uniqueness if provided
    if (dto.barcode) {
      const existingBarcode = await this.productRepo.findOne({
        where: { barcode: dto.barcode, storeId: dto.storeId },
      });
      if (existingBarcode) {
        throw new ConflictException(`Product with barcode "${dto.barcode}" already exists`);
      }
    }

    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  async findAllProducts(
    storeId: string,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      categoryId?: string;
      isActive?: boolean;
      lowStock?: boolean;
    },
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .where('product.storeId = :storeId', { storeId });

    if (options?.search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search OR product.barcode ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    if (options?.categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', {
        categoryId: options.categoryId,
      });
    }

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('product.isActive = :isActive', {
        isActive: options.isActive,
      });
    }

    if (options?.lowStock) {
      queryBuilder.andWhere('product.trackInventory = true');
      queryBuilder.andWhere('product.stock <= product.lowStockThreshold');
    }

    const [data, total] = await queryBuilder
      .orderBy('product.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOneProduct(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'variants'],
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOneProduct(id);

    // Check SKU uniqueness if being updated
    if (dto.sku && dto.sku !== product.sku) {
      const existingSku = await this.productRepo.findOne({
        where: { sku: dto.sku, storeId: product.storeId },
      });
      if (existingSku && existingSku.id !== id) {
        throw new ConflictException(`Product with SKU "${dto.sku}" already exists`);
      }
    }

    // Check barcode uniqueness if being updated
    if (dto.barcode && dto.barcode !== product.barcode) {
      const existingBarcode = await this.productRepo.findOne({
        where: { barcode: dto.barcode, storeId: product.storeId },
      });
      if (existingBarcode && existingBarcode.id !== id) {
        throw new ConflictException(`Product with barcode "${dto.barcode}" already exists`);
      }
    }

    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async removeProduct(id: string): Promise<void> {
    const product = await this.findOneProduct(id);
    await this.productRepo.remove(product);
  }

  async updateStock(id: string, quantity: number): Promise<Product> {
    const product = await this.findOneProduct(id);
    product.stock = quantity;
    return this.productRepo.save(product);
  }

  async bulkUpdatePrices(
    storeId: string,
    updates: Array<{ id: string; price: number; cost?: number }>,
  ): Promise<{ updated: number; errors: any[] }> {
    const errors: Array<{ id: string; error: string }> = [];
    let updated = 0;

    for (const update of updates) {
      try {
        const product = await this.productRepo.findOne({
          where: { id: update.id, storeId },
        });
        if (product) {
          product.price = update.price;
          if (update.cost !== undefined) {
            product.cost = update.cost;
          }
          await this.productRepo.save(product);
          updated++;
        } else {
          errors.push({ id: update.id, error: 'Product not found' });
        }
      } catch (error) {
        errors.push({ id: update.id, error: error.message });
      }
    }

    return { updated, errors };
  }

  async bulkUpdateStock(
    storeId: string,
    updates: Array<{ id: string; stock: number }>,
  ): Promise<{ updated: number; errors: any[] }> {
    const errors: Array<{ id: string; error: string }> = [];
    let updated = 0;

    for (const update of updates) {
      try {
        const product = await this.productRepo.findOne({
          where: { id: update.id, storeId },
        });
        if (product) {
          product.stock = update.stock;
          await this.productRepo.save(product);
          updated++;
        } else {
          errors.push({ id: update.id, error: 'Product not found' });
        }
      } catch (error) {
        errors.push({ id: update.id, error: error.message });
      }
    }

    return { updated, errors };
  }

  async bulkActivate(
    storeId: string,
    productIds: string[],
    isActive: boolean,
  ): Promise<{ updated: number }> {
    const result = await this.productRepo
      .createQueryBuilder()
      .update(Product)
      .set({ isActive })
      .where('id IN (:...ids)', { ids: productIds })
      .andWhere('storeId = :storeId', { storeId })
      .execute();

    return { updated: result.affected || 0 };
  }

  // ────── Categories ──────

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    // Verify parent exists if parentId provided
    if (dto.parentId) {
      const parent = await this.categoryRepo.findOne({
        where: { id: dto.parentId, companyId: dto.companyId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    // Check slug uniqueness within company
    const existingSlug = await this.categoryRepo.findOne({
      where: { slug: dto.slug, companyId: dto.companyId },
    });
    if (existingSlug) {
      throw new ConflictException(`Category with slug "${dto.slug}" already exists`);
    }

    const category = this.categoryRepo.create(dto);
    return this.categoryRepo.save(category);
  }

  async findAllCategories(
    companyId: string,
    storeId?: string,
  ): Promise<Category[]> {
    const where: any = { companyId };
    if (storeId) {
      where.storeId = storeId;
    }

    return this.categoryRepo.find({
      where,
      relations: ['parent', 'children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async getCategoryTree(
    companyId: string,
    storeId?: string,
  ): Promise<Category[]> {
    // Get all categories
    const where: any = { companyId, parentId: null };
    if (storeId) {
      where.storeId = storeId;
    }

    // Get root categories (no parent)
    const rootCategories = await this.categoryRepo.find({
      where,
      relations: ['children', 'children.children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    return rootCategories;
  }

  async findOneCategory(id: string, companyId: string): Promise<Category> {
    const category = await this.categoryRepo.findOne({
      where: { id, companyId },
      relations: ['parent', 'children', 'products'],
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async updateCategory(
    id: string,
    companyId: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.categoryRepo.findOne({
      where: { id, companyId },
    });
    if (!category) throw new NotFoundException('Category not found');

    // Verify parent exists if parentId provided
    if (dto.parentId) {
      // Prevent self-reference
      if (dto.parentId === id) {
        throw new ConflictException('Category cannot be its own parent');
      }

      const parent = await this.categoryRepo.findOne({
        where: { id: dto.parentId, companyId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }

      // Prevent circular reference (parent cannot be a child of this category)
      const isCircular = await this.isCircularReference(id, dto.parentId);
      if (isCircular) {
        throw new ConflictException('Circular reference detected');
      }
    }

    // Check slug uniqueness if being updated
    if (dto.slug && dto.slug !== category.slug) {
      const existingSlug = await this.categoryRepo.findOne({
        where: { slug: dto.slug, companyId },
      });
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException(`Category with slug "${dto.slug}" already exists`);
      }
    }

    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  async removeCategory(id: string, companyId: string): Promise<void> {
    const category = await this.categoryRepo.findOne({
      where: { id, companyId },
      relations: ['children', 'products'],
    });
    if (!category) throw new NotFoundException('Category not found');

    // Check if category has children
    if (category.children && category.children.length > 0) {
      throw new ConflictException(
        'Cannot delete category with subcategories. Delete subcategories first.',
      );
    }

    // Check if category has products
    if (category.products && category.products.length > 0) {
      throw new ConflictException(
        'Cannot delete category with products. Move or delete products first.',
      );
    }

    await this.categoryRepo.remove(category);
  }

  private async isCircularReference(
    categoryId: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentParentId = newParentId;

    while (currentParentId) {
      if (currentParentId === categoryId) {
        return true; // Circular reference detected
      }

      const parent = await this.categoryRepo.findOne({
        where: { id: currentParentId },
      });

      if (!parent) break;
      currentParentId = parent.parentId;
    }

    return false;
  }

  // ────── Variants ──────

  async createVariant(
    productId: string,
    dto: CreateVariantDto,
  ): Promise<ProductVariant> {
    const product = await this.findOneProduct(productId);
    const variant = this.variantRepo.create({ ...dto, productId: product.id });
    return this.variantRepo.save(variant);
  }

  async findAllVariants(productId: string): Promise<ProductVariant[]> {
    return this.variantRepo.find({
      where: { productId },
      order: { name: 'ASC' },
    });
  }

  async updateVariant(
    id: string,
    dto: UpdateVariantDto,
  ): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({ where: { id } });
    if (!variant) throw new NotFoundException('Variant not found');
    Object.assign(variant, dto);
    return this.variantRepo.save(variant);
  }

  async removeVariant(id: string): Promise<void> {
    const variant = await this.variantRepo.findOne({ where: { id } });
    if (!variant) throw new NotFoundException('Variant not found');
    await this.variantRepo.remove(variant);
  }
}

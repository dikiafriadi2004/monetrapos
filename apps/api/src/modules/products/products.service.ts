import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Category } from './category.entity';
import { ProductVariant } from './product-variant.entity';
import {
  CreateProductDto, UpdateProductDto,
  CreateCategoryDto, UpdateCategoryDto,
  CreateVariantDto, UpdateVariantDto,
} from './dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(ProductVariant) private variantRepo: Repository<ProductVariant>,
  ) {}

  // ────── Products ──────

  async createProduct(dto: CreateProductDto): Promise<Product> {
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  async findAllProducts(storeId: string): Promise<Product[]> {
    return this.productRepo.find({
      where: { storeId },
      relations: ['category', 'variants'],
      order: { name: 'ASC' },
    });
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

  // ────── Categories ──────

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepo.create(dto);
    return this.categoryRepo.save(category);
  }

  async findAllCategories(storeId: string): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { storeId },
      order: { name: 'ASC' },
    });
  }

  async findOneCategory(id: string): Promise<Category> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  async removeCategory(id: string): Promise<void> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    await this.categoryRepo.remove(category);
  }

  // ────── Variants ──────

  async createVariant(productId: string, dto: CreateVariantDto): Promise<ProductVariant> {
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

  async updateVariant(id: string, dto: UpdateVariantDto): Promise<ProductVariant> {
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

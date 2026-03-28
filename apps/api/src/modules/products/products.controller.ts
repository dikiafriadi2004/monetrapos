import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard, RequirePermissions } from '../auth/guards';
import { ProductsService } from './products.service';
import {
  CreateProductDto, UpdateProductDto,
  CreateCategoryDto, UpdateCategoryDto,
  CreateVariantDto, UpdateVariantDto,
} from './dto';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ────── Products ──────

  @Post('products')
  @RequirePermissions('product.create')
  @ApiOperation({ summary: 'Create a new product' })
  createProduct(@Body() dto: CreateProductDto) {
    return this.productsService.createProduct(dto);
  }

  @Get('products')
  @RequirePermissions('product.view')
  @ApiOperation({ summary: 'Get all products for a store' })
  @ApiQuery({ name: 'storeId', required: true })
  findAllProducts(@Query('storeId') storeId: string) {
    return this.productsService.findAllProducts(storeId);
  }

  @Get('products/:id')
  @RequirePermissions('product.view')
  @ApiOperation({ summary: 'Get product by ID' })
  findOneProduct(@Param('id') id: string) {
    return this.productsService.findOneProduct(id);
  }

  @Patch('products/:id')
  @RequirePermissions('product.edit')
  @ApiOperation({ summary: 'Update product' })
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @RequirePermissions('product.delete')
  @ApiOperation({ summary: 'Delete product' })
  removeProduct(@Param('id') id: string) {
    return this.productsService.removeProduct(id);
  }

  @Patch('products/:id/stock')
  @RequirePermissions('product.manage_stock')
  @ApiOperation({ summary: 'Update product stock' })
  updateStock(@Param('id') id: string, @Body('stock') stock: number) {
    return this.productsService.updateStock(id, stock);
  }

  // ────── Categories ──────

  @Post('categories')
  @RequirePermissions('product.create')
  @ApiOperation({ summary: 'Create a new category' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.productsService.createCategory(dto);
  }

  @Get('categories')
  @RequirePermissions('product.view')
  @ApiOperation({ summary: 'Get all categories for a store' })
  @ApiQuery({ name: 'storeId', required: true })
  findAllCategories(@Query('storeId') storeId: string) {
    return this.productsService.findAllCategories(storeId);
  }

  @Get('categories/:id')
  @RequirePermissions('product.view')
  @ApiOperation({ summary: 'Get category by ID with products' })
  findOneCategory(@Param('id') id: string) {
    return this.productsService.findOneCategory(id);
  }

  @Patch('categories/:id')
  @RequirePermissions('product.edit')
  @ApiOperation({ summary: 'Update category' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.productsService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @RequirePermissions('product.delete')
  @ApiOperation({ summary: 'Delete category' })
  removeCategory(@Param('id') id: string) {
    return this.productsService.removeCategory(id);
  }

  // ────── Variants ──────

  @Post('products/:productId/variants')
  @RequirePermissions('product.create')
  @ApiOperation({ summary: 'Create a product variant' })
  createVariant(@Param('productId') productId: string, @Body() dto: CreateVariantDto) {
    return this.productsService.createVariant(productId, dto);
  }

  @Get('products/:productId/variants')
  @RequirePermissions('product.view')
  @ApiOperation({ summary: 'Get all variants for a product' })
  findAllVariants(@Param('productId') productId: string) {
    return this.productsService.findAllVariants(productId);
  }

  @Patch('variants/:id')
  @RequirePermissions('product.edit')
  @ApiOperation({ summary: 'Update variant' })
  updateVariant(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    return this.productsService.updateVariant(id, dto);
  }

  @Delete('variants/:id')
  @RequirePermissions('product.delete')
  @ApiOperation({ summary: 'Delete variant' })
  removeVariant(@Param('id') id: string) {
    return this.productsService.removeVariant(id);
  }
}

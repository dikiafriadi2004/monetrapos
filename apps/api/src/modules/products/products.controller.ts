import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard, RequirePermissions } from '../auth/guards';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateVariantDto,
  UpdateVariantDto,
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
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  findAllProducts(
    @Query('storeId') storeId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: boolean,
    @Query('lowStock') lowStock?: boolean,
  ) {
    return this.productsService.findAllProducts(storeId, {
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      categoryId,
      isActive: isActive !== undefined ? (isActive === true || (isActive as any) === 'true') : undefined,
      lowStock: lowStock === true || (lowStock as any) === 'true',
    });
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

  @Post('products/bulk/prices')
  @RequirePermissions('product.edit')
  @ApiOperation({ summary: 'Bulk update product prices' })
  bulkUpdatePrices(
    @Body() dto: { storeId: string; updates: Array<{ id: string; price: number; cost?: number }> },
  ) {
    return this.productsService.bulkUpdatePrices(dto.storeId, dto.updates);
  }

  @Post('products/bulk/stock')
  @RequirePermissions('product.manage_stock')
  @ApiOperation({ summary: 'Bulk update product stock' })
  bulkUpdateStock(
    @Body() dto: { storeId: string; updates: Array<{ id: string; stock: number }> },
  ) {
    return this.productsService.bulkUpdateStock(dto.storeId, dto.updates);
  }

  @Post('products/bulk/activate')
  @RequirePermissions('product.edit')
  @ApiOperation({ summary: 'Bulk activate/deactivate products' })
  bulkActivate(
    @Body() dto: { storeId: string; productIds: string[]; isActive: boolean },
  ) {
    return this.productsService.bulkActivate(dto.storeId, dto.productIds, dto.isActive);
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
  @ApiOperation({ summary: 'Get all categories for a company/store' })
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'storeId', required: false })
  findAllCategories(
    @Query('companyId') companyId: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.productsService.findAllCategories(companyId, storeId);
  }

  @Get('categories/tree')
  @RequirePermissions('product.view')
  @ApiOperation({ summary: 'Get category tree structure' })
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'storeId', required: false })
  getCategoryTree(
    @Query('companyId') companyId: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.productsService.getCategoryTree(companyId, storeId);
  }

  @Get('categories/:id')
  @RequirePermissions('product.view')
  @ApiOperation({ summary: 'Get category by ID with products' })
  @ApiQuery({ name: 'companyId', required: true })
  findOneCategory(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.productsService.findOneCategory(id, companyId);
  }

  @Patch('categories/:id')
  @RequirePermissions('product.edit')
  @ApiOperation({ summary: 'Update category' })
  @ApiQuery({ name: 'companyId', required: true })
  updateCategory(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.productsService.updateCategory(id, companyId, dto);
  }

  @Delete('categories/:id')
  @RequirePermissions('product.delete')
  @ApiOperation({ summary: 'Delete category' })
  @ApiQuery({ name: 'companyId', required: true })
  removeCategory(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.productsService.removeCategory(id, companyId);
  }

  // ────── Variants ──────

  @Post('products/:productId/variants')
  @RequirePermissions('product.create')
  @ApiOperation({ summary: 'Create a product variant' })
  createVariant(
    @Param('productId') productId: string,
    @Body() dto: CreateVariantDto,
  ) {
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

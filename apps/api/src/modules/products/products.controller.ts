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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { PermissionGuard, RequirePermissions } from '../auth/guards';
import { ProductsService } from './products.service';
import { deleteOldFile } from '../../common/utils/file.utils';
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
  async createProduct(@Body() dto: CreateProductDto, @Request() req: any) {
    const companyId = req.user.companyId;
    // Auto-inject storeId from company's first store if not provided
    if (!dto.storeId) {
      const defaultStoreId = await this.productsService.getDefaultStoreId(companyId);
      if (!defaultStoreId) {
        throw new BadRequestException('Tidak ada toko aktif. Pastikan subscription sudah aktif dan toko sudah dibuat.');
      }
      dto.storeId = defaultStoreId;
    }
    // Inject companyId from JWT
    (dto as any).companyId = companyId;
    return this.productsService.createProduct(dto);
  }

  @Get('products')
  @RequirePermissions('product.view')
  @ApiOperation({ summary: 'Get all products for a store' })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  findAllProducts(
    @Request() req: any,
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
      companyId: req.user.companyId, // fallback if no storeId
    });
  }

  @Get('products/barcode/:barcode')
  @RequirePermissions('product.view')
  @ApiOperation({ summary: 'Get product by barcode' })
  @ApiQuery({ name: 'storeId', required: true })
  findByBarcode(
    @Param('barcode') barcode: string,
    @Query('storeId') storeId: string,
  ) {
    return this.productsService.findByBarcode(barcode, storeId);
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

  @Post('products/:id/image')
  @RequirePermissions('product.edit')
  @ApiOperation({ summary: 'Upload product image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = path.join(process.cwd(), 'uploads', 'products');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `product-${Date.now()}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
          return cb(new BadRequestException('Only image files are allowed (jpg, jpeg, png, webp)'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadProductImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const imageUrl = `/uploads/products/${file.filename}`;

    // Delete old image
    const product = await this.productsService.findOneProduct(id);
    deleteOldFile(product.imageUrl);

    const updated = await this.productsService.updateProduct(id, { imageUrl } as any);
    return { imageUrl, product: updated };
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
  async createCategory(@Body() dto: CreateCategoryDto, @Request() req: any) {
    // Inject companyId from JWT if not provided
    if (!dto.companyId) dto.companyId = req.user.companyId;
    // Inject storeId from company's first store if not provided
    if (!dto.storeId) {
      const defaultStoreId = await this.productsService.getDefaultStoreId(req.user.companyId);
      if (!defaultStoreId) {
        throw new BadRequestException('Tidak ada toko aktif. Pastikan subscription sudah aktif dan toko sudah dibuat.');
      }
      dto.storeId = defaultStoreId;
    }
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

  @Post('categories/:id/image')
  @RequirePermissions('product.edit')
  @ApiOperation({ summary: 'Upload category image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = path.join(process.cwd(), 'uploads', 'categories');
          if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `category-${Date.now()}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) return cb(new BadRequestException('Only image files allowed'), false);
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadCategoryImage(
    @Param('id') id: string,
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const imageUrl = `/uploads/categories/${file.filename}`;

    // Delete old image
    const category = await this.productsService.findOneCategory(id, req.user.companyId);
    deleteOldFile(category.imageUrl);

    await this.productsService.updateCategory(id, req.user.companyId, { imageUrl });
    return { imageUrl };
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

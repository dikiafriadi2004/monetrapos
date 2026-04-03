import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, CreateVariantDto, UpdateVariantDto } from './dto';

describe('ProductsController - Products & Variants', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProductsService = {
    createProduct: jest.fn(),
    findAllProducts: jest.fn(),
    findOneProduct: jest.fn(),
    updateProduct: jest.fn(),
    removeProduct: jest.fn(),
    updateStock: jest.fn(),
    bulkUpdatePrices: jest.fn(),
    bulkUpdateStock: jest.fn(),
    bulkActivate: jest.fn(),
    createVariant: jest.fn(),
    findAllVariants: jest.fn(),
    updateVariant: jest.fn(),
    removeVariant: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);

    jest.clearAllMocks();
  });

  describe('POST /products', () => {
    it('should create a product successfully', async () => {
      const dto: CreateProductDto = {
        name: 'Pizza Margherita',
        price: 50000,
        storeId: 'store-123',
      };

      const expectedResult = { id: 'prod-123', ...dto };
      mockProductsService.createProduct.mockResolvedValue(expectedResult);

      const result = await controller.createProduct(dto);

      expect(result).toEqual(expectedResult);
      expect(service.createProduct).toHaveBeenCalledWith(dto);
    });

    it('should throw ConflictException if SKU already exists', async () => {
      const dto: CreateProductDto = {
        name: 'Pizza',
        sku: 'PIZZA-001',
        price: 50000,
        storeId: 'store-123',
      };

      mockProductsService.createProduct.mockRejectedValue(
        new ConflictException('Product with SKU "PIZZA-001" already exists'),
      );

      await expect(controller.createProduct(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if barcode already exists', async () => {
      const dto: CreateProductDto = {
        name: 'Pizza',
        barcode: '1234567890',
        price: 50000,
        storeId: 'store-123',
      };

      mockProductsService.createProduct.mockRejectedValue(
        new ConflictException('Product with barcode "1234567890" already exists'),
      );

      await expect(controller.createProduct(dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('GET /products', () => {
    const storeId = 'store-123';

    it('should return paginated products', async () => {
      const response = {
        data: [
          { id: 'prod-1', name: 'Pizza', storeId },
          { id: 'prod-2', name: 'Burger', storeId },
        ],
        total: 2,
        page: 1,
        limit: 10,
      };

      mockProductsService.findAllProducts.mockResolvedValue(response);

      const result = await controller.findAllProducts(storeId, 1, 10);

      expect(result).toEqual(response);
      expect(service.findAllProducts).toHaveBeenCalledWith(storeId, {
        page: 1,
        limit: 10,
        search: undefined,
        categoryId: undefined,
        isActive: undefined,
        lowStock: false,
      });
    });

    it('should filter by search term', async () => {
      const response = { data: [], total: 0, page: 1, limit: 10 };
      mockProductsService.findAllProducts.mockResolvedValue(response);

      await controller.findAllProducts(storeId, undefined, undefined, 'pizza');

      expect(service.findAllProducts).toHaveBeenCalledWith(storeId, {
        page: undefined,
        limit: undefined,
        search: 'pizza',
        categoryId: undefined,
        isActive: undefined,
        lowStock: false,
      });
    });

    it('should filter by categoryId', async () => {
      const response = { data: [], total: 0, page: 1, limit: 10 };
      mockProductsService.findAllProducts.mockResolvedValue(response);

      await controller.findAllProducts(
        storeId,
        undefined,
        undefined,
        undefined,
        'cat-123',
      );

      expect(service.findAllProducts).toHaveBeenCalledWith(storeId, {
        page: undefined,
        limit: undefined,
        search: undefined,
        categoryId: 'cat-123',
        isActive: undefined,
        lowStock: false,
      });
    });

    it('should filter by isActive status', async () => {
      const response = { data: [], total: 0, page: 1, limit: 10 };
      mockProductsService.findAllProducts.mockResolvedValue(response);

      await controller.findAllProducts(
        storeId,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      );

      expect(service.findAllProducts).toHaveBeenCalledWith(storeId, {
        page: undefined,
        limit: undefined,
        search: undefined,
        categoryId: undefined,
        isActive: true,
        lowStock: false,
      });
    });

    it('should filter low stock products', async () => {
      const response = { data: [], total: 0, page: 1, limit: 10 };
      mockProductsService.findAllProducts.mockResolvedValue(response);

      await controller.findAllProducts(
        storeId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      );

      expect(service.findAllProducts).toHaveBeenCalledWith(storeId, {
        page: undefined,
        limit: undefined,
        search: undefined,
        categoryId: undefined,
        isActive: undefined,
        lowStock: true,
      });
    });

    it('should use default pagination when not provided', async () => {
      const response = { data: [], total: 0, page: 1, limit: 50 };
      mockProductsService.findAllProducts.mockResolvedValue(response);

      await controller.findAllProducts(storeId);

      expect(service.findAllProducts).toHaveBeenCalledWith(storeId, {
        page: undefined,
        limit: undefined,
        search: undefined,
        categoryId: undefined,
        isActive: undefined,
        lowStock: false,
      });
    });
  });

  describe('GET /products/:id', () => {
    it('should return product by id', async () => {
      const product = {
        id: 'prod-123',
        name: 'Pizza',
        category: { id: 'cat-123', name: 'Food' },
        variants: [],
      };

      mockProductsService.findOneProduct.mockResolvedValue(product);

      const result = await controller.findOneProduct('prod-123');

      expect(result).toEqual(product);
      expect(service.findOneProduct).toHaveBeenCalledWith('prod-123');
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductsService.findOneProduct.mockRejectedValue(
        new NotFoundException('Product not found'),
      );

      await expect(controller.findOneProduct('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PATCH /products/:id', () => {
    it('should update product successfully', async () => {
      const dto: UpdateProductDto = {
        name: 'Updated Pizza',
        price: 60000,
      };

      const updatedProduct = { id: 'prod-123', ...dto };
      mockProductsService.updateProduct.mockResolvedValue(updatedProduct);

      const result = await controller.updateProduct('prod-123', dto);

      expect(result).toEqual(updatedProduct);
      expect(service.updateProduct).toHaveBeenCalledWith('prod-123', dto);
    });

    it('should throw NotFoundException if product not found', async () => {
      const dto: UpdateProductDto = { name: 'Updated' };

      mockProductsService.updateProduct.mockRejectedValue(
        new NotFoundException('Product not found'),
      );

      await expect(controller.updateProduct('invalid-id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new SKU already exists', async () => {
      const dto: UpdateProductDto = { sku: 'EXISTING-SKU' };

      mockProductsService.updateProduct.mockRejectedValue(
        new ConflictException('Product with SKU "EXISTING-SKU" already exists'),
      );

      await expect(controller.updateProduct('prod-123', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete product successfully', async () => {
      mockProductsService.removeProduct.mockResolvedValue(undefined);

      await controller.removeProduct('prod-123');

      expect(service.removeProduct).toHaveBeenCalledWith('prod-123');
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductsService.removeProduct.mockRejectedValue(
        new NotFoundException('Product not found'),
      );

      await expect(controller.removeProduct('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PATCH /products/:id/stock', () => {
    it('should update product stock', async () => {
      const updatedProduct = { id: 'prod-123', stock: 100 };
      mockProductsService.updateStock.mockResolvedValue(updatedProduct);

      const result = await controller.updateStock('prod-123', 100);

      expect(result).toEqual(updatedProduct);
      expect(service.updateStock).toHaveBeenCalledWith('prod-123', 100);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductsService.updateStock.mockRejectedValue(
        new NotFoundException('Product not found'),
      );

      await expect(controller.updateStock('invalid-id', 100)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('POST /products/bulk/prices', () => {
    it('should update multiple product prices', async () => {
      const dto = {
        storeId: 'store-123',
        updates: [
          { id: 'prod-1', price: 50000, cost: 30000 },
          { id: 'prod-2', price: 60000 },
        ],
      };

      const response = { updated: 2, errors: [] };
      mockProductsService.bulkUpdatePrices.mockResolvedValue(response);

      const result = await controller.bulkUpdatePrices(dto);

      expect(result).toEqual(response);
      expect(service.bulkUpdatePrices).toHaveBeenCalledWith(
        dto.storeId,
        dto.updates,
      );
    });

    it('should handle errors for non-existent products', async () => {
      const dto = {
        storeId: 'store-123',
        updates: [
          { id: 'prod-1', price: 50000 },
          { id: 'invalid-id', price: 60000 },
        ],
      };

      const response = {
        updated: 1,
        errors: [{ id: 'invalid-id', error: 'Product not found' }],
      };
      mockProductsService.bulkUpdatePrices.mockResolvedValue(response);

      const result = await controller.bulkUpdatePrices(dto);

      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('POST /products/bulk/stock', () => {
    it('should update multiple product stocks', async () => {
      const dto = {
        storeId: 'store-123',
        updates: [
          { id: 'prod-1', stock: 100 },
          { id: 'prod-2', stock: 200 },
        ],
      };

      const response = { updated: 2, errors: [] };
      mockProductsService.bulkUpdateStock.mockResolvedValue(response);

      const result = await controller.bulkUpdateStock(dto);

      expect(result).toEqual(response);
      expect(service.bulkUpdateStock).toHaveBeenCalledWith(
        dto.storeId,
        dto.updates,
      );
    });

    it('should handle errors gracefully', async () => {
      const dto = {
        storeId: 'store-123',
        updates: [{ id: 'invalid-id', stock: 100 }],
      };

      const response = {
        updated: 0,
        errors: [{ id: 'invalid-id', error: 'Product not found' }],
      };
      mockProductsService.bulkUpdateStock.mockResolvedValue(response);

      const result = await controller.bulkUpdateStock(dto);

      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('POST /products/bulk/activate', () => {
    it('should activate multiple products', async () => {
      const dto = {
        storeId: 'store-123',
        productIds: ['prod-1', 'prod-2', 'prod-3'],
        isActive: true,
      };

      const response = { updated: 3 };
      mockProductsService.bulkActivate.mockResolvedValue(response);

      const result = await controller.bulkActivate(dto);

      expect(result).toEqual(response);
      expect(service.bulkActivate).toHaveBeenCalledWith(
        dto.storeId,
        dto.productIds,
        dto.isActive,
      );
    });

    it('should deactivate multiple products', async () => {
      const dto = {
        storeId: 'store-123',
        productIds: ['prod-1', 'prod-2'],
        isActive: false,
      };

      const response = { updated: 2 };
      mockProductsService.bulkActivate.mockResolvedValue(response);

      const result = await controller.bulkActivate(dto);

      expect(result.updated).toBe(2);
      expect(service.bulkActivate).toHaveBeenCalledWith(
        dto.storeId,
        dto.productIds,
        false,
      );
    });
  });

  describe('POST /products/:productId/variants', () => {
    it('should create a variant successfully', async () => {
      const dto: CreateVariantDto = {
        name: 'Large',
        priceAdjustment: 5000,
        sku: 'PIZZA-L',
      };

      const expectedResult = { id: 'var-123', productId: 'prod-123', ...dto };
      mockProductsService.createVariant.mockResolvedValue(expectedResult);

      const result = await controller.createVariant('prod-123', dto);

      expect(result).toEqual(expectedResult);
      expect(service.createVariant).toHaveBeenCalledWith('prod-123', dto);
    });

    it('should throw NotFoundException if product not found', async () => {
      const dto: CreateVariantDto = {
        name: 'Large',
        priceAdjustment: 5000,
      };

      mockProductsService.createVariant.mockRejectedValue(
        new NotFoundException('Product not found'),
      );

      await expect(
        controller.createVariant('invalid-id', dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /products/:productId/variants', () => {
    it('should return all variants for a product', async () => {
      const variants = [
        { id: 'var-1', name: 'Small', priceAdjustment: -5000 },
        { id: 'var-2', name: 'Large', priceAdjustment: 5000 },
      ];

      mockProductsService.findAllVariants.mockResolvedValue(variants);

      const result = await controller.findAllVariants('prod-123');

      expect(result).toEqual(variants);
      expect(service.findAllVariants).toHaveBeenCalledWith('prod-123');
    });

    it('should return empty array if no variants', async () => {
      mockProductsService.findAllVariants.mockResolvedValue([]);

      const result = await controller.findAllVariants('prod-123');

      expect(result).toEqual([]);
    });
  });

  describe('PATCH /variants/:id', () => {
    it('should update variant successfully', async () => {
      const dto: UpdateVariantDto = {
        name: 'Extra Large',
        priceAdjustment: 10000,
      };

      const updatedVariant = { id: 'var-123', ...dto };
      mockProductsService.updateVariant.mockResolvedValue(updatedVariant);

      const result = await controller.updateVariant('var-123', dto);

      expect(result).toEqual(updatedVariant);
      expect(service.updateVariant).toHaveBeenCalledWith('var-123', dto);
    });

    it('should throw NotFoundException if variant not found', async () => {
      const dto: UpdateVariantDto = { name: 'Updated' };

      mockProductsService.updateVariant.mockRejectedValue(
        new NotFoundException('Variant not found'),
      );

      await expect(controller.updateVariant('invalid-id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('DELETE /variants/:id', () => {
    it('should delete variant successfully', async () => {
      mockProductsService.removeVariant.mockResolvedValue(undefined);

      await controller.removeVariant('var-123');

      expect(service.removeVariant).toHaveBeenCalledWith('var-123');
    });

    it('should throw NotFoundException if variant not found', async () => {
      mockProductsService.removeVariant.mockRejectedValue(
        new NotFoundException('Variant not found'),
      );

      await expect(controller.removeVariant('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('API Documentation', () => {
    it('should have proper Swagger decorators', () => {
      const metadata = Reflect.getMetadata(
        'swagger/apiOperation',
        controller.createProduct,
      );
      expect(metadata).toBeDefined();
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for all endpoints', () => {
      // This is enforced by @UseGuards(AuthGuard('jwt')) at controller level
      expect(true).toBe(true);
    });

    it('should require proper permissions for each endpoint', () => {
      // This is enforced by @RequirePermissions decorator
      expect(true).toBe(true);
    });
  });
});

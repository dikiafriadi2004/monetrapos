import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product, ProductType } from './product.entity';
import { Category } from './category.entity';
import { ProductVariant } from './product-variant.entity';
import { CreateProductDto, UpdateProductDto } from './dto';

describe('ProductsService - Products', () => {
  let service: ProductsService;
  let productRepo: Repository<Product>;
  let categoryRepo: Repository<Category>;
  let variantRepo: Repository<ProductVariant>;

  const mockProductRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCategoryRepo = {
    findOne: jest.fn(),
  };

  const mockVariantRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepo,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepo,
        },
        {
          provide: getRepositoryToken(ProductVariant),
          useValue: mockVariantRepo,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepo = module.get<Repository<Product>>(getRepositoryToken(Product));
    categoryRepo = module.get<Repository<Category>>(
      getRepositoryToken(Category),
    );
    variantRepo = module.get<Repository<ProductVariant>>(
      getRepositoryToken(ProductVariant),
    );

    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    const companyId = 'company-123';
    const storeId = 'store-123';

    it('should create a product successfully', async () => {
      const dto: CreateProductDto = {
        name: 'Pizza Margherita',
        description: 'Classic pizza',
        sku: 'PIZZA-001',
        barcode: '1234567890',
        price: 50000,
        costPrice: 30000,
        storeId,
        categoryId: 'cat-123',
      };

      const savedProduct = { id: 'prod-123', ...dto };

      mockProductRepo.findOne.mockResolvedValue(null); // No existing SKU/barcode
      mockProductRepo.create.mockReturnValue(dto);
      mockProductRepo.save.mockResolvedValue(savedProduct);

      const result = await service.createProduct(dto);

      expect(result).toEqual(savedProduct);
      expect(mockProductRepo.findOne).toHaveBeenCalledTimes(2); // SKU and barcode checks
      expect(mockProductRepo.create).toHaveBeenCalledWith(dto);
      expect(mockProductRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if SKU already exists', async () => {
      const dto: CreateProductDto = {
        name: 'Pizza',
        sku: 'PIZZA-001',
        price: 50000,
        storeId,
      };

      mockProductRepo.findOne.mockResolvedValue({
        id: 'existing-prod',
        sku: 'PIZZA-001',
      });

      await expect(service.createProduct(dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createProduct(dto)).rejects.toThrow(
        'Product with SKU "PIZZA-001" already exists',
      );
    });

    it('should throw ConflictException if barcode already exists', async () => {
      const dto: CreateProductDto = {
        name: 'Pizza',
        barcode: '1234567890',
        price: 50000,
        storeId,
      };

      // Reset and setup mocks properly
      jest.clearAllMocks();
      mockProductRepo.findOne.mockResolvedValue({ id: 'existing-prod', barcode: '1234567890' });

      await expect(service.createProduct(dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createProduct(dto)).rejects.toThrow(
        'Product with barcode "1234567890" already exists',
      );
    });

    it('should create product without SKU and barcode', async () => {
      const dto: CreateProductDto = {
        name: 'Pizza',
        price: 50000,
        storeId,
      };

      const savedProduct = { id: 'prod-123', ...dto };

      mockProductRepo.create.mockReturnValue(dto);
      mockProductRepo.save.mockResolvedValue(savedProduct);

      const result = await service.createProduct(dto);

      expect(result).toEqual(savedProduct);
      expect(mockProductRepo.findOne).not.toHaveBeenCalled(); // No uniqueness checks
    });

    it('should allow same SKU in different stores', async () => {
      const dto: CreateProductDto = {
        name: 'Pizza',
        sku: 'PIZZA-001',
        price: 50000,
        storeId: 'store-456', // Different store
      };

      jest.clearAllMocks();
      // Mock: No conflict in this store
      mockProductRepo.findOne
        .mockResolvedValueOnce(null) // SKU check - no conflict
        .mockResolvedValueOnce(null); // Barcode check - no barcode in dto

      mockProductRepo.create.mockReturnValue(dto);
      mockProductRepo.save.mockResolvedValue({ id: 'prod-123', ...dto });

      const result = await service.createProduct(dto);

      expect(result).toBeDefined();
      expect(mockProductRepo.findOne).toHaveBeenCalledWith({
        where: { sku: 'PIZZA-001', storeId: 'store-456' },
      });
    });
  });

  describe('findAllProducts', () => {
    const storeId = 'store-123';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return paginated products', async () => {
      const products = [
        { id: 'prod-1', name: 'Pizza', storeId },
        { id: 'prod-2', name: 'Burger', storeId },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([products, 2]),
      };

      mockProductRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAllProducts(storeId, {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        data: products,
        total: 2,
        page: 1,
        limit: 10,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.storeId = :storeId',
        { storeId },
      );
    });

    it('should filter by search term', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockProductRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAllProducts(storeId, { search: 'pizza' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%pizza%' },
      );
    });

    it('should filter by categoryId', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockProductRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAllProducts(storeId, { categoryId: 'cat-123' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.categoryId = :categoryId',
        { categoryId: 'cat-123' },
      );
    });

    it('should filter by isActive status', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockProductRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAllProducts(storeId, { isActive: true });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.isActive = :isActive',
        { isActive: true },
      );
    });

    it('should filter low stock products', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockProductRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAllProducts(storeId, { lowStock: true });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.trackInventory = true',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.stock <= product.lowStockThreshold',
      );
    });

    it('should use default pagination values', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockProductRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAllProducts(storeId);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });
  });

  describe('findOneProduct', () => {
    beforeEach(() => {
      mockProductRepo.findOne.mockReset();
    });

    it('should return product by id', async () => {
      const product = {
        id: 'prod-123',
        name: 'Pizza',
        category: { id: 'cat-123', name: 'Food' },
        variants: [],
      };

      mockProductRepo.findOne.mockResolvedValueOnce(product);

      const result = await service.findOneProduct('prod-123');

      expect(result).toEqual(product);
      expect(mockProductRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
        relations: ['category', 'variants'],
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneProduct('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOneProduct('invalid-id')).rejects.toThrow(
        'Product not found',
      );
    });
  });

  describe('updateProduct', () => {
    const productId = 'prod-123';
    const storeId = 'store-123';

    it('should update product successfully', async () => {
      const existingProduct = {
        id: productId,
        name: 'Pizza',
        sku: 'PIZZA-001',
        barcode: '1234567890',
        storeId,
      };

      const dto: UpdateProductDto = {
        name: 'Updated Pizza',
        price: 60000,
      };

      mockProductRepo.findOne.mockResolvedValue(existingProduct);
      mockProductRepo.save.mockResolvedValue({
        ...existingProduct,
        ...dto,
      });

      const result = await service.updateProduct(productId, dto);

      expect(result.name).toBe('Updated Pizza');
      expect(mockProductRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateProduct('invalid-id', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new SKU already exists', async () => {
      const existingProduct = {
        id: productId,
        name: 'Pizza',
        sku: 'PIZZA-001',
        storeId,
      };

      const dto: UpdateProductDto = {
        sku: 'PIZZA-002',
      };

      mockProductRepo.findOne
        .mockResolvedValueOnce(existingProduct) // findOneProduct
        .mockResolvedValueOnce({ id: 'other-prod', sku: 'PIZZA-002' }); // SKU check

      await expect(service.updateProduct(productId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating to same SKU', async () => {
      const existingProduct = {
        id: productId,
        name: 'Pizza',
        sku: 'PIZZA-001',
        storeId,
      };

      const dto: UpdateProductDto = {
        sku: 'PIZZA-001', // Same SKU
        name: 'Updated Pizza',
      };

      mockProductRepo.findOne.mockResolvedValue(existingProduct);
      mockProductRepo.save.mockResolvedValue({ ...existingProduct, ...dto });

      const result = await service.updateProduct(productId, dto);

      expect(result).toBeDefined();
    });

    it('should throw ConflictException if new barcode already exists', async () => {
      const existingProduct = {
        id: productId,
        name: 'Pizza',
        barcode: '1234567890',
        sku: 'PIZZA-001',
        storeId,
      };

      const dto: UpdateProductDto = {
        barcode: '0987654321',
      };

      jest.clearAllMocks();
      mockProductRepo.findOne
        .mockResolvedValueOnce(existingProduct) // findOneProduct
        .mockResolvedValue({ id: 'other-prod', barcode: '0987654321' }); // Barcode check

      await expect(service.updateProduct(productId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('removeProduct', () => {
    it('should delete product successfully', async () => {
      const product = { id: 'prod-123', name: 'Pizza' };

      mockProductRepo.findOne.mockResolvedValue(product);
      mockProductRepo.remove.mockResolvedValue(product);

      await service.removeProduct('prod-123');

      expect(mockProductRepo.findOne).toHaveBeenCalled();
      expect(mockProductRepo.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductRepo.findOne.mockResolvedValue(null);

      await expect(service.removeProduct('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStock', () => {
    it('should update product stock', async () => {
      const product = { id: 'prod-123', name: 'Pizza', stock: 10 };

      mockProductRepo.findOne.mockResolvedValue(product);
      mockProductRepo.save.mockResolvedValue({ ...product, stock: 20 });

      const result = await service.updateStock('prod-123', 20);

      expect(result.stock).toBe(20);
      expect(mockProductRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductRepo.findOne.mockResolvedValue(null);

      await expect(service.updateStock('invalid-id', 20)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('bulkUpdatePrices', () => {
    const storeId = 'store-123';

    it('should update multiple product prices', async () => {
      const updates = [
        { id: 'prod-1', price: 50000, cost: 30000 },
        { id: 'prod-2', price: 60000 },
      ];

      mockProductRepo.findOne
        .mockResolvedValueOnce({ id: 'prod-1', price: 40000 })
        .mockResolvedValueOnce({ id: 'prod-2', price: 50000 });

      mockProductRepo.save.mockResolvedValue({});

      const result = await service.bulkUpdatePrices(storeId, updates);

      expect(result.updated).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockProductRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should handle errors for non-existent products', async () => {
      const updates = [
        { id: 'prod-1', price: 50000 },
        { id: 'invalid-id', price: 60000 },
      ];

      mockProductRepo.findOne
        .mockResolvedValueOnce({ id: 'prod-1', price: 40000 })
        .mockResolvedValueOnce(null); // Product not found

      mockProductRepo.save.mockResolvedValue({});

      const result = await service.bulkUpdatePrices(storeId, updates);

      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        id: 'invalid-id',
        error: 'Product not found',
      });
    });
  });

  describe('bulkUpdateStock', () => {
    const storeId = 'store-123';

    it('should update multiple product stocks', async () => {
      const updates = [
        { id: 'prod-1', stock: 100 },
        { id: 'prod-2', stock: 200 },
      ];

      mockProductRepo.findOne
        .mockResolvedValueOnce({ id: 'prod-1', stock: 50 })
        .mockResolvedValueOnce({ id: 'prod-2', stock: 100 });

      mockProductRepo.save.mockResolvedValue({});

      const result = await service.bulkUpdateStock(storeId, updates);

      expect(result.updated).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      const updates = [{ id: 'prod-1', stock: 100 }];

      mockProductRepo.findOne.mockResolvedValueOnce({ id: 'prod-1' });
      mockProductRepo.save.mockRejectedValueOnce(
        new Error('Database error'),
      );

      const result = await service.bulkUpdateStock(storeId, updates);

      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Database error');
    });
  });

  describe('bulkActivate', () => {
    const storeId = 'store-123';

    it('should activate multiple products', async () => {
      const productIds = ['prod-1', 'prod-2', 'prod-3'];

      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };

      mockProductRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.bulkActivate(storeId, productIds, true);

      expect(result.updated).toBe(3);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ isActive: true });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'id IN (:...ids)',
        { ids: productIds },
      );
    });

    it('should deactivate multiple products', async () => {
      const productIds = ['prod-1', 'prod-2'];

      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      };

      mockProductRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.bulkActivate(storeId, productIds, false);

      expect(result.updated).toBe(2);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ isActive: false });
    });
  });
});

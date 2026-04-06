import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Category } from './category.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

describe('ProductsService - Categories', () => {
  let service: ProductsService;
  let categoryRepo: Repository<Category>;

  const mockCategoryRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockProductRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockVariantRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepo,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepo,
        },
        {
          provide: getRepositoryToken(ProductVariant),
          useValue: mockVariantRepo,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    categoryRepo = module.get<Repository<Category>>(
      getRepositoryToken(Category),
    );

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    const companyId = 'company-123';
    const storeId = 'store-123';

    it('should create a category successfully', async () => {
      const dto: CreateCategoryDto = {
        name: 'Food',
        slug: 'food',
        description: 'Food items',
        companyId,
        storeId,
      };

      const savedCategory = { id: 'cat-123', ...dto };

      mockCategoryRepo.findOne.mockResolvedValue(null); // No existing slug
      mockCategoryRepo.create.mockReturnValue(dto);
      mockCategoryRepo.save.mockResolvedValue(savedCategory);

      const result = await service.createCategory(dto);

      expect(result).toEqual(savedCategory);
      expect(mockCategoryRepo.findOne).toHaveBeenCalledWith({
        where: { slug: dto.slug, companyId },
      });
      expect(mockCategoryRepo.create).toHaveBeenCalledWith(dto);
      expect(mockCategoryRepo.save).toHaveBeenCalled();
    });

    it('should create a nested category with parent', async () => {
      const parentCategory = {
        id: 'parent-123',
        name: 'Food',
        slug: 'food',
        companyId,
      };

      const dto: CreateCategoryDto = {
        name: 'Beverages',
        slug: 'beverages',
        companyId,
        storeId,
        parentId: 'parent-123',
      };

      mockCategoryRepo.findOne
        .mockResolvedValueOnce(parentCategory) // Parent exists
        .mockResolvedValueOnce(null); // No existing slug

      mockCategoryRepo.create.mockReturnValue(dto);
      mockCategoryRepo.save.mockResolvedValue({ id: 'cat-456', ...dto });

      const result = await service.createCategory(dto);

      expect(result.parentId).toBe('parent-123');
      expect(mockCategoryRepo.findOne).toHaveBeenCalledWith({
        where: { id: dto.parentId, companyId },
      });
    });

    it('should throw NotFoundException if parent does not exist', async () => {
      const dto: CreateCategoryDto = {
        name: 'Beverages',
        slug: 'beverages',
        companyId,
        storeId,
        parentId: 'non-existent-parent',
      };

      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(service.createCategory(dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createCategory(dto)).rejects.toThrow(
        'Parent category not found',
      );
    });

    it('should throw ConflictException if slug already exists', async () => {
      const dto: CreateCategoryDto = {
        name: 'Food',
        slug: 'food',
        companyId,
        storeId,
      };

      const existingCategory = { id: 'existing-123', slug: 'food', companyId };

      // No parent check (parentId is undefined), then slug check finds existing
      mockCategoryRepo.findOne.mockResolvedValueOnce(existingCategory);

      await expect(service.createCategory(dto)).rejects.toThrow(
        'Category with slug "food" already exists',
      );
    });

    it('should allow same slug in different companies', async () => {
      const dto: CreateCategoryDto = {
        name: 'Food',
        slug: 'food',
        companyId: 'company-456',
        storeId,
      };

      // Slug check should not find existing (different company)
      mockCategoryRepo.findOne.mockResolvedValue(null);
      mockCategoryRepo.create.mockReturnValue(dto);
      mockCategoryRepo.save.mockResolvedValue({ id: 'cat-789', ...dto });

      const result = await service.createCategory(dto);

      expect(result.companyId).toBe('company-456');
      expect(mockCategoryRepo.findOne).toHaveBeenCalledWith({
        where: { slug: dto.slug, companyId: 'company-456' },
      });
    });
  });

  describe('findAllCategories', () => {
    const companyId = 'company-123';
    const storeId = 'store-123';

    it('should return all categories for a company', async () => {
      const categories = [
        { id: '1', name: 'Food', companyId, storeId },
        { id: '2', name: 'Drinks', companyId, storeId },
      ];

      mockCategoryRepo.find.mockResolvedValue(categories);

      const result = await service.findAllCategories(companyId);

      expect(result).toEqual(categories);
      expect(mockCategoryRepo.find).toHaveBeenCalledWith({
        where: { companyId },
        relations: ['parent', 'children'],
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    });

    it('should filter by storeId when provided', async () => {
      const categories = [{ id: '1', name: 'Food', companyId, storeId }];

      mockCategoryRepo.find.mockResolvedValue(categories);

      const result = await service.findAllCategories(companyId, storeId);

      expect(result).toEqual(categories);
      expect(mockCategoryRepo.find).toHaveBeenCalledWith({
        where: { companyId, storeId },
        relations: ['parent', 'children'],
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    });

    it('should return categories with parent-child relationships', async () => {
      const parent = {
        id: '1',
        name: 'Food',
        companyId,
        parentId: null,
        children: [],
      };
      const child = {
        id: '2',
        name: 'Beverages',
        companyId,
        parentId: '1',
        parent,
      };
      parent.children = [child];

      mockCategoryRepo.find.mockResolvedValue([parent, child]);

      const result = await service.findAllCategories(companyId);

      expect(result).toHaveLength(2);
      expect(result[0].children).toBeDefined();
    });
  });

  describe('getCategoryTree', () => {
    const companyId = 'company-123';

    it('should return root categories with nested children', async () => {
      const rootCategories = [
        {
          id: '1',
          name: 'Food',
          parentId: null,
          children: [
            {
              id: '2',
              name: 'Beverages',
              parentId: '1',
              children: [],
            },
          ],
        },
      ];

      mockCategoryRepo.find.mockResolvedValue(rootCategories);

      const result = await service.getCategoryTree(companyId);

      expect(result).toEqual(rootCategories);
      expect(mockCategoryRepo.find).toHaveBeenCalledWith({
        where: { companyId, parentId: null },
        relations: ['children', 'children.children'],
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    });

    it('should filter by storeId when provided', async () => {
      const storeId = 'store-123';
      mockCategoryRepo.find.mockResolvedValue([]);

      await service.getCategoryTree(companyId, storeId);

      expect(mockCategoryRepo.find).toHaveBeenCalledWith({
        where: { companyId, storeId, parentId: null },
        relations: ['children', 'children.children'],
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    });
  });

  describe('findOneCategory', () => {
    const companyId = 'company-123';
    const categoryId = 'cat-123';

    it('should return a category by id', async () => {
      const category = {
        id: categoryId,
        name: 'Food',
        companyId,
        products: [],
      };

      mockCategoryRepo.findOne.mockResolvedValue(category);

      const result = await service.findOneCategory(categoryId, companyId);

      expect(result).toEqual(category);
      expect(mockCategoryRepo.findOne).toHaveBeenCalledWith({
        where: { id: categoryId, companyId },
        relations: ['parent', 'children', 'products'],
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOneCategory(categoryId, companyId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findOneCategory(categoryId, companyId),
      ).rejects.toThrow('Category not found');
    });

    it('should enforce tenant isolation', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOneCategory(categoryId, 'different-company'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCategory', () => {
    const companyId = 'company-123';
    const categoryId = 'cat-123';

    it('should update a category successfully', async () => {
      const existingCategory = {
        id: categoryId,
        name: 'Food',
        slug: 'food',
        companyId,
      };

      const dto: UpdateCategoryDto = {
        name: 'Updated Food',
        description: 'Updated description',
      };

      mockCategoryRepo.findOne.mockResolvedValue(existingCategory);
      mockCategoryRepo.save.mockResolvedValue({
        ...existingCategory,
        ...dto,
      });

      const result = await service.updateCategory(categoryId, companyId, dto);

      expect(result.name).toBe('Updated Food');
      expect(mockCategoryRepo.save).toHaveBeenCalled();
    });

    it('should update parent_id successfully', async () => {
      const existingCategory = {
        id: categoryId,
        name: 'Beverages',
        companyId,
        parentId: null,
      };

      const parentCategory = {
        id: 'parent-123',
        name: 'Food',
        companyId,
      };

      const dto: UpdateCategoryDto = {
        parentId: 'parent-123',
      };

      mockCategoryRepo.findOne
        .mockResolvedValueOnce(existingCategory) // Find category
        .mockResolvedValueOnce(parentCategory) // Find parent
        .mockResolvedValueOnce(null); // Check circular (no parent of parent)

      mockCategoryRepo.save.mockResolvedValue({
        ...existingCategory,
        ...dto,
      });

      const result = await service.updateCategory(categoryId, companyId, dto);

      expect(result.parentId).toBe('parent-123');
    });

    it('should throw ConflictException for self-reference', async () => {
      const existingCategory = {
        id: categoryId,
        name: 'Food',
        companyId,
      };

      const dto: UpdateCategoryDto = {
        parentId: categoryId, // Self-reference
      };

      mockCategoryRepo.findOne.mockResolvedValue(existingCategory);

      await expect(
        service.updateCategory(categoryId, companyId, dto),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.updateCategory(categoryId, companyId, dto),
      ).rejects.toThrow('Category cannot be its own parent');
    });

    it('should throw ConflictException for circular reference', async () => {
      const categoryA = { id: 'cat-a', name: 'A', companyId, parentId: null };
      const categoryB = {
        id: 'cat-b',
        name: 'B',
        companyId,
        parentId: 'cat-a',
      };

      const dto: UpdateCategoryDto = {
        parentId: 'cat-b', // A -> B, trying to make B -> A (circular)
      };

      mockCategoryRepo.findOne
        .mockResolvedValueOnce(categoryA) // Find category A (updateCategory)
        .mockResolvedValueOnce(categoryB) // Find parent B (updateCategory)
        .mockResolvedValueOnce(categoryB) // isCircularReference: find 'cat-b'
        .mockResolvedValueOnce(categoryA); // isCircularReference: find parent of 'cat-b' which is 'cat-a' - CIRCULAR!

      await expect(
        service.updateCategory('cat-a', companyId, dto),
      ).rejects.toThrow('Circular reference detected');
    });

    it('should throw ConflictException if slug already exists', async () => {
      const existingCategory = {
        id: categoryId,
        name: 'Food',
        slug: 'food',
        companyId,
      };

      const anotherCategory = {
        id: 'another-123',
        name: 'Drinks',
        slug: 'drinks',
        companyId,
      };

      const dto: UpdateCategoryDto = {
        slug: 'drinks', // Already exists
      };

      // First call: find category by id → returns existingCategory
      // Second call: find by slug → returns anotherCategory (slug conflict)
      mockCategoryRepo.findOne
        .mockResolvedValueOnce(existingCategory)
        .mockResolvedValueOnce(anotherCategory);

      await expect(
        service.updateCategory(categoryId, companyId, dto),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating to same slug', async () => {
      const existingCategory = {
        id: categoryId,
        name: 'Food',
        slug: 'food',
        companyId,
      };

      const dto: UpdateCategoryDto = {
        slug: 'food', // Same slug
        name: 'Updated Food',
      };

      mockCategoryRepo.findOne.mockResolvedValue(existingCategory);
      mockCategoryRepo.save.mockResolvedValue({
        ...existingCategory,
        ...dto,
      });

      const result = await service.updateCategory(categoryId, companyId, dto);

      expect(result.slug).toBe('food');
    });
  });

  describe('removeCategory', () => {
    const companyId = 'company-123';
    const categoryId = 'cat-123';

    it('should delete a category successfully', async () => {
      const category = {
        id: categoryId,
        name: 'Food',
        companyId,
        children: [],
        products: [],
      };

      mockCategoryRepo.findOne.mockResolvedValue(category);
      mockCategoryRepo.remove.mockResolvedValue(category);

      await service.removeCategory(categoryId, companyId);

      expect(mockCategoryRepo.remove).toHaveBeenCalledWith(category);
    });

    it('should throw NotFoundException if category not found', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeCategory(categoryId, companyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if category has children', async () => {
      const category = {
        id: categoryId,
        name: 'Food',
        companyId,
        children: [{ id: 'child-123', name: 'Beverages' }],
        products: [],
      };

      mockCategoryRepo.findOne.mockResolvedValue(category);

      await expect(
        service.removeCategory(categoryId, companyId),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.removeCategory(categoryId, companyId),
      ).rejects.toThrow(
        'Cannot delete category with subcategories. Delete subcategories first.',
      );
    });

    it('should throw ConflictException if category has products', async () => {
      const category = {
        id: categoryId,
        name: 'Food',
        companyId,
        children: [],
        products: [{ id: 'prod-123', name: 'Pizza' }],
      };

      mockCategoryRepo.findOne.mockResolvedValue(category);

      await expect(
        service.removeCategory(categoryId, companyId),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.removeCategory(categoryId, companyId),
      ).rejects.toThrow(
        'Cannot delete category with products. Move or delete products first.',
      );
    });
  });

  describe('Tenant Isolation', () => {
    it('should not allow accessing categories from different company', async () => {
      const companyId = 'company-123';
      const categoryId = 'cat-123';

      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOneCategory(categoryId, 'different-company'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce company_id in all queries', async () => {
      const companyId = 'company-123';

      mockCategoryRepo.find.mockResolvedValue([]);

      await service.findAllCategories(companyId);

      expect(mockCategoryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId }),
        }),
      );
    });
  });

  describe('Sorting and Ordering', () => {
    it('should return categories sorted by sortOrder and name', async () => {
      const companyId = 'company-123';
      const categories = [
        { id: '1', name: 'Zebra', sortOrder: 2 },
        { id: '2', name: 'Apple', sortOrder: 1 },
        { id: '3', name: 'Banana', sortOrder: 1 },
      ];

      mockCategoryRepo.find.mockResolvedValue(categories);

      await service.findAllCategories(companyId);

      expect(mockCategoryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { sortOrder: 'ASC', name: 'ASC' },
        }),
      );
    });
  });
});

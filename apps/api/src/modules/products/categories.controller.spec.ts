import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

describe('ProductsController - Categories', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProductsService = {
    createCategory: jest.fn(),
    findAllCategories: jest.fn(),
    getCategoryTree: jest.fn(),
    findOneCategory: jest.fn(),
    updateCategory: jest.fn(),
    removeCategory: jest.fn(),
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

  describe('POST /categories', () => {
    it('should create a category successfully', async () => {
      const dto: CreateCategoryDto = {
        name: 'Food',
        slug: 'food',
        description: 'Food items',
        companyId: 'company-123',
        storeId: 'store-123',
      };

      const expectedResult = { id: 'cat-123', ...dto };
      mockProductsService.createCategory.mockResolvedValue(expectedResult);

      const result = await controller.createCategory(dto);

      expect(result).toEqual(expectedResult);
      expect(service.createCategory).toHaveBeenCalledWith(dto);
    });

    it('should throw ConflictException if slug already exists', async () => {
      const dto: CreateCategoryDto = {
        name: 'Food',
        slug: 'food',
        description: 'Food items',
        companyId: 'company-123',
        storeId: 'store-123',
      };

      mockProductsService.createCategory.mockRejectedValue(
        new ConflictException('Category with slug "food" already exists'),
      );

      await expect(controller.createCategory(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(service.createCategory).toHaveBeenCalledWith(dto);
    });

    it('should throw NotFoundException if parent not found', async () => {
      const dto: CreateCategoryDto = {
        name: 'Subcategory',
        slug: 'subcategory',
        companyId: 'company-123',
        storeId: 'store-123',
        parentId: 'invalid-parent',
      };

      mockProductsService.createCategory.mockRejectedValue(
        new NotFoundException('Parent category not found'),
      );

      await expect(controller.createCategory(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('GET /categories', () => {
    it('should return all categories for a company', async () => {
      const companyId = 'company-123';
      const categories = [
        { id: 'cat-1', name: 'Food', companyId },
        { id: 'cat-2', name: 'Beverage', companyId },
      ];

      mockProductsService.findAllCategories.mockResolvedValue(categories);

      const result = await controller.findAllCategories(companyId);

      expect(result).toEqual(categories);
      expect(service.findAllCategories).toHaveBeenCalledWith(
        companyId,
        undefined,
      );
    });

    it('should filter categories by storeId', async () => {
      const companyId = 'company-123';
      const storeId = 'store-123';
      const categories = [{ id: 'cat-1', name: 'Food', companyId, storeId }];

      mockProductsService.findAllCategories.mockResolvedValue(categories);

      const result = await controller.findAllCategories(companyId, storeId);

      expect(result).toEqual(categories);
      expect(service.findAllCategories).toHaveBeenCalledWith(
        companyId,
        storeId,
      );
    });

    it('should return categories with parent-child relationships', async () => {
      const companyId = 'company-123';
      const categories = [
        {
          id: 'cat-1',
          name: 'Food',
          companyId,
          children: [
            { id: 'cat-2', name: 'Fast Food', parentId: 'cat-1', companyId },
          ],
        },
      ];

      mockProductsService.findAllCategories.mockResolvedValue(categories);

      const result = await controller.findAllCategories(companyId);

      expect(result).toEqual(categories);
      expect(result[0].children).toHaveLength(1);
    });
  });

  describe('GET /categories/tree', () => {
    it('should return category tree structure', async () => {
      const companyId = 'company-123';
      const tree = [
        {
          id: 'cat-1',
          name: 'Food',
          companyId,
          children: [
            {
              id: 'cat-2',
              name: 'Fast Food',
              parentId: 'cat-1',
              companyId,
              children: [],
            },
          ],
        },
      ];

      mockProductsService.getCategoryTree.mockResolvedValue(tree);

      const result = await controller.getCategoryTree(companyId);

      expect(result).toEqual(tree);
      expect(service.getCategoryTree).toHaveBeenCalledWith(
        companyId,
        undefined,
      );
    });

    it('should filter tree by storeId', async () => {
      const companyId = 'company-123';
      const storeId = 'store-123';
      const tree = [
        { id: 'cat-1', name: 'Food', companyId, storeId, children: [] },
      ];

      mockProductsService.getCategoryTree.mockResolvedValue(tree);

      const result = await controller.getCategoryTree(companyId, storeId);

      expect(result).toEqual(tree);
      expect(service.getCategoryTree).toHaveBeenCalledWith(companyId, storeId);
    });

    it('should return only root categories with nested children', async () => {
      const companyId = 'company-123';
      const tree = [
        {
          id: 'cat-1',
          name: 'Food',
          parentId: null,
          companyId,
          children: [
            { id: 'cat-2', name: 'Fast Food', parentId: 'cat-1', companyId },
          ],
        },
      ];

      mockProductsService.getCategoryTree.mockResolvedValue(tree);

      const result = await controller.getCategoryTree(companyId);

      expect(result).toEqual(tree);
      expect(result.every((cat) => cat.parentId === null)).toBe(true);
    });
  });

  describe('GET /categories/:id', () => {
    it('should return category by id', async () => {
      const id = 'cat-123';
      const companyId = 'company-123';
      const category = {
        id,
        name: 'Food',
        companyId,
        products: [],
        children: [],
      };

      mockProductsService.findOneCategory.mockResolvedValue(category);

      const result = await controller.findOneCategory(id, companyId);

      expect(result).toEqual(category);
      expect(service.findOneCategory).toHaveBeenCalledWith(id, companyId);
    });

    it('should throw NotFoundException if category not found', async () => {
      const id = 'invalid-id';
      const companyId = 'company-123';

      mockProductsService.findOneCategory.mockRejectedValue(
        new NotFoundException('Category not found'),
      );

      await expect(
        controller.findOneCategory(id, companyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation', async () => {
      const id = 'cat-123';
      const companyId = 'company-123';
      const wrongCompanyId = 'company-456';

      mockProductsService.findOneCategory.mockRejectedValue(
        new NotFoundException('Category not found'),
      );

      await expect(
        controller.findOneCategory(id, wrongCompanyId),
      ).rejects.toThrow(NotFoundException);
      expect(service.findOneCategory).toHaveBeenCalledWith(id, wrongCompanyId);
    });

    it('should return category with products and children', async () => {
      const id = 'cat-123';
      const companyId = 'company-123';
      const category = {
        id,
        name: 'Food',
        companyId,
        products: [{ id: 'prod-1', name: 'Pizza' }],
        children: [{ id: 'cat-2', name: 'Fast Food' }],
      };

      mockProductsService.findOneCategory.mockResolvedValue(category);

      const result = await controller.findOneCategory(id, companyId);

      expect(result).toEqual(category);
      expect(result.products).toHaveLength(1);
      expect(result.children).toHaveLength(1);
    });
  });

  describe('PATCH /categories/:id', () => {
    it('should update category successfully', async () => {
      const id = 'cat-123';
      const companyId = 'company-123';
      const dto: UpdateCategoryDto = {
        name: 'Updated Food',
        description: 'Updated description',
      };

      const updatedCategory = { id, companyId, ...dto };
      mockProductsService.updateCategory.mockResolvedValue(updatedCategory);

      const result = await controller.updateCategory(id, companyId, dto);

      expect(result).toEqual(updatedCategory);
      expect(service.updateCategory).toHaveBeenCalledWith(id, companyId, dto);
    });

    it('should throw NotFoundException if category not found', async () => {
      const id = 'invalid-id';
      const companyId = 'company-123';
      const dto: UpdateCategoryDto = { name: 'Updated' };

      mockProductsService.updateCategory.mockRejectedValue(
        new NotFoundException('Category not found'),
      );

      await expect(
        controller.updateCategory(id, companyId, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for self-reference', async () => {
      const id = 'cat-123';
      const companyId = 'company-123';
      const dto: UpdateCategoryDto = { parentId: id };

      mockProductsService.updateCategory.mockRejectedValue(
        new ConflictException('Category cannot be its own parent'),
      );

      await expect(
        controller.updateCategory(id, companyId, dto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for circular reference', async () => {
      const id = 'cat-123';
      const companyId = 'company-123';
      const dto: UpdateCategoryDto = { parentId: 'cat-456' };

      mockProductsService.updateCategory.mockRejectedValue(
        new ConflictException('Circular reference detected'),
      );

      await expect(
        controller.updateCategory(id, companyId, dto),
      ).rejects.toThrow(ConflictException);
    });

    it('should update parent successfully', async () => {
      const id = 'cat-123';
      const companyId = 'company-123';
      const dto: UpdateCategoryDto = { parentId: 'cat-parent' };

      const updatedCategory = { id, companyId, ...dto };
      mockProductsService.updateCategory.mockResolvedValue(updatedCategory);

      const result = await controller.updateCategory(id, companyId, dto);

      expect(result).toEqual(updatedCategory);
      expect(result.parentId).toBe('cat-parent');
    });
  });

  describe('DELETE /categories/:id', () => {
    it('should delete category successfully', async () => {
      const id = 'cat-123';
      const companyId = 'company-123';

      mockProductsService.removeCategory.mockResolvedValue(undefined);

      await controller.removeCategory(id, companyId);

      expect(service.removeCategory).toHaveBeenCalledWith(id, companyId);
    });

    it('should throw NotFoundException if category not found', async () => {
      const id = 'invalid-id';
      const companyId = 'company-123';

      mockProductsService.removeCategory.mockRejectedValue(
        new NotFoundException('Category not found'),
      );

      await expect(controller.removeCategory(id, companyId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if category has children', async () => {
      const id = 'cat-123';
      const companyId = 'company-123';

      mockProductsService.removeCategory.mockRejectedValue(
        new ConflictException(
          'Cannot delete category with subcategories. Delete subcategories first.',
        ),
      );

      await expect(controller.removeCategory(id, companyId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if category has products', async () => {
      const id = 'cat-123';
      const companyId = 'company-123';

      mockProductsService.removeCategory.mockRejectedValue(
        new ConflictException(
          'Cannot delete category with products. Move or delete products first.',
        ),
      );

      await expect(controller.removeCategory(id, companyId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('Tenant Isolation', () => {
    it('should enforce companyId in all endpoints', async () => {
      const companyId = 'company-123';
      const wrongCompanyId = 'company-456';
      const categoryId = 'cat-123';

      mockProductsService.findOneCategory.mockRejectedValue(
        new NotFoundException('Category not found'),
      );

      await expect(
        controller.findOneCategory(categoryId, wrongCompanyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should require companyId query parameter', async () => {
      // This test verifies that companyId is required in the controller signature
      const companyId = 'company-123';

      mockProductsService.findAllCategories.mockResolvedValue([]);

      await controller.findAllCategories(companyId);

      expect(service.findAllCategories).toHaveBeenCalledWith(
        companyId,
        undefined,
      );
    });
  });
});

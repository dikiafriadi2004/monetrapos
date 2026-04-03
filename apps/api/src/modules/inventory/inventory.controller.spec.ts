import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { MovementType } from './stock-movement.entity';
import { CreateStockMovementDto, ReserveStockDto, TransferStockDto } from './dto';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: InventoryService;

  const mockInventoryService = {
    getInventoryByStore: jest.fn(),
    getInventoryByProduct: jest.fn(),
    getAvailableQuantity: jest.fn(),
    getLowStockProducts: jest.fn(),
    sendLowStockAlerts: jest.fn(),
    recordMovement: jest.fn(),
    findMovements: jest.fn(),
    reserveStock: jest.fn(),
    releaseStock: jest.fn(),
    transferStock: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: 'user-123',
      companyId: 'company-123',
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /inventory', () => {
    it('should get inventory by store with filters', async () => {
      const mockInventory = {
        data: [
          {
            id: 'inv-1',
            productId: 'product-1',
            quantity: 100,
            reservedQuantity: 10,
            availableQuantity: 90,
          },
        ],
        total: 1,
      };

      mockInventoryService.getInventoryByStore.mockResolvedValue(mockInventory);

      const result = await controller.getInventory(
        mockRequest,
        'store-123',
        'product-1',
        true,
        1,
        50,
      );

      expect(result).toEqual(mockInventory);
      expect(service.getInventoryByStore).toHaveBeenCalledWith(
        'company-123',
        'store-123',
        {
          productId: 'product-1',
          lowStock: true,
          page: 1,
          limit: 50,
        },
      );
    });

    it('should get inventory without filters', async () => {
      const mockInventory = { data: [], total: 0 };
      mockInventoryService.getInventoryByStore.mockResolvedValue(mockInventory);

      await controller.getInventory(mockRequest, 'store-123');

      expect(service.getInventoryByStore).toHaveBeenCalledWith(
        'company-123',
        'store-123',
        {
          productId: undefined,
          lowStock: undefined,
          page: undefined,
          limit: undefined,
        },
      );
    });
  });

  describe('GET /inventory/by-product/:productId', () => {
    it('should get inventory for a product across all stores', async () => {
      const mockInventory = [
        {
          id: 'inv-1',
          storeId: 'store-1',
          productId: 'product-1',
          quantity: 50,
        },
        {
          id: 'inv-2',
          storeId: 'store-2',
          productId: 'product-1',
          quantity: 30,
        },
      ];

      mockInventoryService.getInventoryByProduct.mockResolvedValue(mockInventory);

      const result = await controller.getInventoryByProduct(
        mockRequest,
        'product-1',
        'variant-1',
      );

      expect(result).toEqual(mockInventory);
      expect(service.getInventoryByProduct).toHaveBeenCalledWith(
        'company-123',
        'product-1',
        'variant-1',
      );
    });

    it('should get inventory without variant', async () => {
      mockInventoryService.getInventoryByProduct.mockResolvedValue([]);

      await controller.getInventoryByProduct(mockRequest, 'product-1');

      expect(service.getInventoryByProduct).toHaveBeenCalledWith(
        'company-123',
        'product-1',
        undefined,
      );
    });
  });

  describe('GET /inventory/available-quantity', () => {
    it('should get available quantity for a product', async () => {
      mockInventoryService.getAvailableQuantity.mockResolvedValue(75);

      const result = await controller.getAvailableQuantity(
        mockRequest,
        'store-123',
        'product-1',
        'variant-1',
      );

      expect(result).toEqual({ availableQuantity: 75 });
      expect(service.getAvailableQuantity).toHaveBeenCalledWith(
        'company-123',
        'store-123',
        'product-1',
        'variant-1',
      );
    });

    it('should return 0 for non-existent inventory', async () => {
      mockInventoryService.getAvailableQuantity.mockResolvedValue(0);

      const result = await controller.getAvailableQuantity(
        mockRequest,
        'store-123',
        'product-999',
      );

      expect(result).toEqual({ availableQuantity: 0 });
    });
  });

  describe('GET /inventory/low-stock', () => {
    it('should get products with low stock', async () => {
      const mockLowStock = [
        {
          id: 'inv-1',
          productId: 'product-1',
          quantity: 5,
          product: { name: 'Product 1', lowStockThreshold: 10 },
        },
      ];

      mockInventoryService.getLowStockProducts.mockResolvedValue(mockLowStock);

      const result = await controller.getLowStock(mockRequest, 'store-123');

      expect(result).toEqual(mockLowStock);
      expect(service.getLowStockProducts).toHaveBeenCalledWith(
        'company-123',
        'store-123',
      );
    });
  });

  describe('POST /inventory/low-stock/alerts', () => {
    it('should send low stock alerts via email', async () => {
      const mockResult = {
        sent: 3,
        products: ['Product A', 'Product B', 'Product C'],
      };

      mockInventoryService.sendLowStockAlerts.mockResolvedValue(mockResult);

      const result = await controller.sendLowStockAlerts(
        mockRequest,
        'store-123',
        'manager@example.com',
      );

      expect(result).toEqual(mockResult);
      expect(service.sendLowStockAlerts).toHaveBeenCalledWith(
        'company-123',
        'store-123',
        'manager@example.com',
      );
    });

    it('should handle no low stock products', async () => {
      mockInventoryService.sendLowStockAlerts.mockResolvedValue({
        sent: 0,
        products: [],
      });

      const result = await controller.sendLowStockAlerts(
        mockRequest,
        'store-123',
        'manager@example.com',
      );

      expect(result.sent).toBe(0);
      expect(result.products).toHaveLength(0);
    });
  });

  describe('POST /inventory/movements', () => {
    it('should record stock IN movement', async () => {
      const dto: CreateStockMovementDto = {
        type: MovementType.IN,
        quantity: 50,
        productId: 'product-1',
        storeId: 'store-123',
        reason: 'Restock from supplier',
        reference: 'PO-001',
      };

      const mockMovement = {
        id: 'movement-1',
        ...dto,
        stockAfter: 150,
        performedBy: 'user-123',
      };

      mockInventoryService.recordMovement.mockResolvedValue(mockMovement);

      const result = await controller.createMovement(mockRequest, dto);

      expect(result).toEqual(mockMovement);
      expect(service.recordMovement).toHaveBeenCalledWith(
        'company-123',
        'user-123',
        dto,
      );
    });

    it('should record stock OUT movement', async () => {
      const dto: CreateStockMovementDto = {
        type: MovementType.OUT,
        quantity: 20,
        productId: 'product-1',
        storeId: 'store-123',
        reason: 'Damaged goods',
      };

      mockInventoryService.recordMovement.mockResolvedValue({
        id: 'movement-2',
        ...dto,
        stockAfter: 80,
      });

      await controller.createMovement(mockRequest, dto);

      expect(service.recordMovement).toHaveBeenCalledWith(
        'company-123',
        'user-123',
        dto,
      );
    });

    it('should record stock ADJUSTMENT', async () => {
      const dto: CreateStockMovementDto = {
        type: MovementType.ADJUSTMENT,
        quantity: 100,
        productId: 'product-1',
        storeId: 'store-123',
        reason: 'Stock opname correction',
      };

      mockInventoryService.recordMovement.mockResolvedValue({
        id: 'movement-3',
        ...dto,
        stockAfter: 100,
      });

      await controller.createMovement(mockRequest, dto);

      expect(service.recordMovement).toHaveBeenCalled();
    });
  });

  describe('GET /inventory/movements', () => {
    it('should get stock movement history with filters', async () => {
      const mockMovements = {
        data: [
          {
            id: 'movement-1',
            type: MovementType.IN,
            quantity: 50,
            stockAfter: 150,
          },
        ],
        total: 1,
      };

      mockInventoryService.findMovements.mockResolvedValue(mockMovements);

      const result = await controller.getMovements(
        mockRequest,
        'store-123',
        'product-1',
        'variant-1',
        MovementType.IN,
        1,
        100,
      );

      expect(result).toEqual(mockMovements);
      expect(service.findMovements).toHaveBeenCalledWith('company-123', {
        storeId: 'store-123',
        productId: 'product-1',
        variantId: 'variant-1',
        type: MovementType.IN,
        page: 1,
        limit: 100,
      });
    });

    it('should get movements without filters', async () => {
      mockInventoryService.findMovements.mockResolvedValue({
        data: [],
        total: 0,
      });

      await controller.getMovements(mockRequest);

      expect(service.findMovements).toHaveBeenCalledWith('company-123', {
        storeId: undefined,
        productId: undefined,
        variantId: undefined,
        type: undefined,
        page: undefined,
        limit: undefined,
      });
    });
  });

  describe('POST /inventory/reserve', () => {
    it('should reserve stock for pending orders', async () => {
      const dto: ReserveStockDto = {
        storeId: 'store-123',
        productId: 'product-1',
        quantity: 10,
        reason: 'Reserved for order #12345',
      };

      const mockInventory = {
        id: 'inv-1',
        quantity: 100,
        reservedQuantity: 20,
        availableQuantity: 80,
      };

      mockInventoryService.reserveStock.mockResolvedValue(mockInventory);

      const result = await controller.reserveStock(mockRequest, dto);

      expect(result).toEqual(mockInventory);
      expect(service.reserveStock).toHaveBeenCalledWith(
        'company-123',
        'user-123',
        dto,
      );
    });
  });

  describe('POST /inventory/release', () => {
    it('should release reserved stock', async () => {
      const dto: ReserveStockDto = {
        storeId: 'store-123',
        productId: 'product-1',
        quantity: 10,
        reason: 'Order cancelled',
      };

      const mockInventory = {
        id: 'inv-1',
        quantity: 100,
        reservedQuantity: 10,
        availableQuantity: 90,
      };

      mockInventoryService.releaseStock.mockResolvedValue(mockInventory);

      const result = await controller.releaseStock(mockRequest, dto);

      expect(result).toEqual(mockInventory);
      expect(service.releaseStock).toHaveBeenCalledWith(
        'company-123',
        'user-123',
        dto,
      );
    });
  });

  describe('POST /inventory/transfer', () => {
    it('should transfer stock between stores', async () => {
      const dto: TransferStockDto = {
        fromStoreId: 'store-1',
        toStoreId: 'store-2',
        productId: 'product-1',
        quantity: 20,
        notes: 'Transfer for new store opening',
      };

      const mockResult = {
        fromInventory: {
          id: 'inv-1',
          storeId: 'store-1',
          quantity: 80,
        },
        toInventory: {
          id: 'inv-2',
          storeId: 'store-2',
          quantity: 20,
        },
      };

      mockInventoryService.transferStock.mockResolvedValue(mockResult);

      const result = await controller.transferStock(mockRequest, dto);

      expect(result).toEqual(mockResult);
      expect(service.transferStock).toHaveBeenCalledWith(
        'company-123',
        'user-123',
        dto,
      );
    });

    it('should transfer stock with variant', async () => {
      const dto: TransferStockDto = {
        fromStoreId: 'store-1',
        toStoreId: 'store-2',
        productId: 'product-1',
        variantId: 'variant-1',
        quantity: 15,
      };

      mockInventoryService.transferStock.mockResolvedValue({
        fromInventory: { quantity: 35 },
        toInventory: { quantity: 15 },
      } as any);

      await controller.transferStock(mockRequest, dto);

      expect(service.transferStock).toHaveBeenCalledWith(
        'company-123',
        'user-123',
        dto,
      );
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', () => {
      const metadata = Reflect.getMetadata(
        '__guards__',
        InventoryController,
      );
      expect(metadata).toBeDefined();
    });

    it('should require MEMBER role for all endpoints', () => {
      const getInventoryMetadata = Reflect.getMetadata(
        'roles',
        controller.getInventory,
      );
      expect(getInventoryMetadata).toContain('member');
    });
  });

  describe('API Documentation', () => {
    it('should have Swagger tags', () => {
      const tags = Reflect.getMetadata('swagger/apiUseTags', InventoryController);
      expect(tags).toContain('Inventory');
    });

    it('should have bearer auth', () => {
      const security = Reflect.getMetadata(
        'swagger/apiSecurity',
        InventoryController,
      );
      expect(security).toBeDefined();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InventoryService } from './inventory.service';
import { Inventory } from './inventory.entity';
import { StockMovement, MovementType } from './stock-movement.entity';
import { Product } from '../products/product.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepo: Repository<Inventory>;
  let movementRepo: Repository<StockMovement>;
  let productRepo: Repository<Product>;
  let dataSource: DataSource;
  let notificationsService: any;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  const mockNotificationsService = {
    sendLowStockAlert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(Inventory),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(StockMovement),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    inventoryRepo = module.get<Repository<Inventory>>(
      getRepositoryToken(Inventory),
    );
    movementRepo = module.get<Repository<StockMovement>>(
      getRepositoryToken(StockMovement),
    );
    productRepo = module.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
    dataSource = module.get<DataSource>(DataSource);
    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordMovement', () => {
    const companyId = 'company-1';
    const userId = 'user-1';
    const storeId = 'store-1';
    const productId = 'product-1';

    it('should increase quantity for IN movement', async () => {
      const product = { id: productId, companyId, name: 'Test Product' };
      const inventory = {
        id: 'inv-1',
        companyId,
        storeId,
        productId,
        variantId: null,
        quantity: 10,
        reservedQuantity: 0,
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(product) // Product lookup
        .mockResolvedValueOnce(inventory); // Inventory lookup

      mockQueryRunner.manager.create.mockReturnValue(inventory);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...inventory, quantity: 20 }) // Updated inventory
        .mockResolvedValueOnce({ id: 'mov-1', type: MovementType.IN }); // Movement

      const result = await service.recordMovement(companyId, userId, {
        type: MovementType.IN,
        quantity: 10,
        productId,
        storeId,
      });

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.type).toBe(MovementType.IN);
    });

    it('should decrease quantity for OUT movement', async () => {
      const product = { id: productId, companyId, name: 'Test Product' };
      const inventory = {
        id: 'inv-1',
        companyId,
        storeId,
        productId,
        variantId: null,
        quantity: 20,
        reservedQuantity: 0,
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(inventory);

      mockQueryRunner.manager.create.mockReturnValue(inventory);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...inventory, quantity: 15 })
        .mockResolvedValueOnce({ id: 'mov-1', type: MovementType.OUT });

      const result = await service.recordMovement(companyId, userId, {
        type: MovementType.OUT,
        quantity: 5,
        productId,
        storeId,
      });

      expect(result.type).toBe(MovementType.OUT);
    });

    it('should throw error for OUT movement with insufficient stock', async () => {
      const product = { id: productId, companyId, name: 'Test Product' };
      const inventory = {
        id: 'inv-1',
        companyId,
        storeId,
        productId,
        variantId: null,
        quantity: 5,
        reservedQuantity: 0,
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(inventory);

      await expect(
        service.recordMovement(companyId, userId, {
          type: MovementType.OUT,
          quantity: 10,
          productId,
          storeId,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should set absolute quantity for ADJUSTMENT movement', async () => {
      const product = { id: productId, companyId, name: 'Test Product' };
      const inventory = {
        id: 'inv-1',
        companyId,
        storeId,
        productId,
        variantId: null,
        quantity: 10,
        reservedQuantity: 0,
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(inventory);

      mockQueryRunner.manager.create.mockReturnValue(inventory);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...inventory, quantity: 50 })
        .mockResolvedValueOnce({ id: 'mov-1', type: MovementType.ADJUSTMENT });

      const result = await service.recordMovement(companyId, userId, {
        type: MovementType.ADJUSTMENT,
        quantity: 50,
        productId,
        storeId,
      });

      expect(result.type).toBe(MovementType.ADJUSTMENT);
    });

    it('should throw error if product not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.recordMovement(companyId, userId, {
          type: MovementType.IN,
          quantity: 10,
          productId,
          storeId,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should create inventory record if not exists', async () => {
      const product = { id: productId, companyId, name: 'Test Product' };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(product) // Product lookup
        .mockResolvedValueOnce(null); // Inventory not found

      const newInventory = {
        id: 'inv-new',
        companyId,
        storeId,
        productId,
        variantId: null,
        quantity: 0,
        reservedQuantity: 0,
      };

      mockQueryRunner.manager.create.mockReturnValue(newInventory);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(newInventory) // Create inventory
        .mockResolvedValueOnce({ ...newInventory, quantity: 10 }) // Update inventory
        .mockResolvedValueOnce({ id: 'mov-1', type: MovementType.IN }); // Movement

      await service.recordMovement(companyId, userId, {
        type: MovementType.IN,
        quantity: 10,
        productId,
        storeId,
      });

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        Inventory,
        expect.objectContaining({
          companyId,
          storeId,
          productId,
          quantity: 0,
          reservedQuantity: 0,
        }),
      );
    });
  });

  describe('reserveStock', () => {
    const companyId = 'company-1';
    const userId = 'user-1';
    const storeId = 'store-1';
    const productId = 'product-1';

    it('should reserve stock successfully', async () => {
      const inventory = {
        id: 'inv-1',
        companyId,
        storeId,
        productId,
        variantId: null,
        quantity: 20,
        reservedQuantity: 5,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(inventory),
      };

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryRunner.manager.create.mockReturnValue({});
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...inventory, reservedQuantity: 15 })
        .mockResolvedValueOnce({ id: 'mov-1' });

      const result = await service.reserveStock(companyId, userId, {
        storeId,
        productId,
        quantity: 10,
      });

      expect(result.reservedQuantity).toBe(15);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw error if insufficient available stock', async () => {
      const inventory = {
        id: 'inv-1',
        companyId,
        storeId,
        productId,
        variantId: null,
        quantity: 20,
        reservedQuantity: 15, // Only 5 available
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(inventory),
      };

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await expect(
        service.reserveStock(companyId, userId, {
          storeId,
          productId,
          quantity: 10, // Requesting more than available
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw error if inventory not found', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await expect(
        service.reserveStock(companyId, userId, {
          storeId,
          productId,
          quantity: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('releaseStock', () => {
    const companyId = 'company-1';
    const userId = 'user-1';
    const storeId = 'store-1';
    const productId = 'product-1';

    it('should release reserved stock successfully', async () => {
      const inventory = {
        id: 'inv-1',
        companyId,
        storeId,
        productId,
        variantId: null,
        quantity: 20,
        reservedQuantity: 10,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(inventory),
      };

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryRunner.manager.create.mockReturnValue({});
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...inventory, reservedQuantity: 5 })
        .mockResolvedValueOnce({ id: 'mov-1' });

      const result = await service.releaseStock(companyId, userId, {
        storeId,
        productId,
        quantity: 5,
      });

      expect(result.reservedQuantity).toBe(5);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw error if releasing more than reserved', async () => {
      const inventory = {
        id: 'inv-1',
        companyId,
        storeId,
        productId,
        variantId: null,
        quantity: 20,
        reservedQuantity: 5,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(inventory),
      };

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await expect(
        service.releaseStock(companyId, userId, {
          storeId,
          productId,
          quantity: 10, // More than reserved
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transferStock', () => {
    const companyId = 'company-1';
    const userId = 'user-1';
    const fromStoreId = 'store-1';
    const toStoreId = 'store-2';
    const productId = 'product-1';

    it('should transfer stock between stores successfully', async () => {
      const product = { id: productId, companyId, name: 'Test Product' };
      const fromInventory = {
        id: 'inv-1',
        companyId,
        storeId: fromStoreId,
        productId,
        variantId: null,
        quantity: 20,
        reservedQuantity: 0,
      };
      const toInventory = {
        id: 'inv-2',
        companyId,
        storeId: toStoreId,
        productId,
        variantId: null,
        quantity: 10,
        reservedQuantity: 0,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(fromInventory),
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(product) // Product lookup
        .mockResolvedValueOnce(toInventory); // Destination inventory

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryRunner.manager.create.mockReturnValue({});
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...fromInventory, quantity: 15 })
        .mockResolvedValueOnce({ ...toInventory, quantity: 15 })
        .mockResolvedValueOnce({ id: 'mov-1' })
        .mockResolvedValueOnce({ id: 'mov-2' });

      const result = await service.transferStock(companyId, userId, {
        fromStoreId,
        toStoreId,
        productId,
        quantity: 5,
      });

      expect(result.fromInventory.quantity).toBe(15);
      expect(result.toInventory.quantity).toBe(15);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw error if insufficient available stock in source', async () => {
      const product = { id: productId, companyId, name: 'Test Product' };
      const fromInventory = {
        id: 'inv-1',
        companyId,
        storeId: fromStoreId,
        productId,
        variantId: null,
        quantity: 10,
        reservedQuantity: 8, // Only 2 available
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(fromInventory),
      };

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(product);
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await expect(
        service.transferStock(companyId, userId, {
          fromStoreId,
          toStoreId,
          productId,
          quantity: 5, // More than available
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create destination inventory if not exists', async () => {
      const product = { id: productId, companyId, name: 'Test Product' };
      const fromInventory = {
        id: 'inv-1',
        companyId,
        storeId: fromStoreId,
        productId,
        variantId: null,
        quantity: 20,
        reservedQuantity: 0,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(fromInventory),
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(null); // Destination inventory not found

      const newToInventory = {
        id: 'inv-new',
        companyId,
        storeId: toStoreId,
        productId,
        variantId: null,
        quantity: 0,
        reservedQuantity: 0,
      };

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryRunner.manager.create.mockReturnValue(newToInventory);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(newToInventory) // Create destination inventory
        .mockResolvedValueOnce({ ...fromInventory, quantity: 15 })
        .mockResolvedValueOnce({ ...newToInventory, quantity: 5 })
        .mockResolvedValueOnce({ id: 'mov-1' })
        .mockResolvedValueOnce({ id: 'mov-2' });

      await service.transferStock(companyId, userId, {
        fromStoreId,
        toStoreId,
        productId,
        quantity: 5,
      });

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        Inventory,
        expect.objectContaining({
          companyId,
          storeId: toStoreId,
          productId,
          quantity: 0,
          reservedQuantity: 0,
        }),
      );
    });

    it('should throw error if product not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.transferStock(companyId, userId, {
          fromStoreId,
          toStoreId,
          productId,
          quantity: 5,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw error if source inventory not found', async () => {
      const product = { id: productId, companyId, name: 'Test Product' };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(product);
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await expect(
        service.transferStock(companyId, userId, {
          fromStoreId,
          toStoreId,
          productId,
          quantity: 5,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should use pessimistic write lock on source inventory', async () => {
      const product = { id: productId, companyId, name: 'Test Product' };
      const fromInventory = {
        id: 'inv-1',
        companyId,
        storeId: fromStoreId,
        productId,
        variantId: null,
        quantity: 20,
        reservedQuantity: 0,
      };
      const toInventory = {
        id: 'inv-2',
        companyId,
        storeId: toStoreId,
        productId,
        variantId: null,
        quantity: 10,
        reservedQuantity: 0,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(fromInventory),
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(toInventory);

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryRunner.manager.create.mockReturnValue({});
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...fromInventory, quantity: 15 })
        .mockResolvedValueOnce({ ...toInventory, quantity: 15 })
        .mockResolvedValueOnce({ id: 'mov-1' })
        .mockResolvedValueOnce({ id: 'mov-2' });

      await service.transferStock(companyId, userId, {
        fromStoreId,
        toStoreId,
        productId,
        quantity: 5,
      });

      expect(mockQueryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('should create movement records for both stores with same reference', async () => {
      const product = { id: productId, companyId, name: 'Test Product' };
      const fromInventory = {
        id: 'inv-1',
        companyId,
        storeId: fromStoreId,
        productId,
        variantId: null,
        quantity: 20,
        reservedQuantity: 0,
      };
      const toInventory = {
        id: 'inv-2',
        companyId,
        storeId: toStoreId,
        productId,
        variantId: null,
        quantity: 10,
        reservedQuantity: 0,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(fromInventory),
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(toInventory);

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const createdMovements: any[] = [];
      mockQueryRunner.manager.create.mockImplementation((entity, data) => {
        if (entity === StockMovement) {
          createdMovements.push(data);
        }
        return data;
      });

      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...fromInventory, quantity: 15 })
        .mockResolvedValueOnce({ ...toInventory, quantity: 15 })
        .mockResolvedValueOnce({ id: 'mov-1' })
        .mockResolvedValueOnce({ id: 'mov-2' });

      await service.transferStock(companyId, userId, {
        fromStoreId,
        toStoreId,
        productId,
        quantity: 5,
      });

      expect(createdMovements).toHaveLength(2);
      expect(createdMovements[0].reference).toBe(createdMovements[1].reference);
      expect(createdMovements[0].reference).toMatch(/^TRANSFER-\d+$/);
      expect(createdMovements[0].type).toBe(MovementType.TRANSFER);
      expect(createdMovements[1].type).toBe(MovementType.TRANSFER);
    });

    it('should update lastRestockDate on destination inventory', async () => {
      const product = { id: productId, companyId, name: 'Test Product' };
      const fromInventory = {
        id: 'inv-1',
        companyId,
        storeId: fromStoreId,
        productId,
        variantId: null,
        quantity: 20,
        reservedQuantity: 0,
      };
      const toInventory = {
        id: 'inv-2',
        companyId,
        storeId: toStoreId,
        productId,
        variantId: null,
        quantity: 10,
        reservedQuantity: 0,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(fromInventory),
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(toInventory);

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryRunner.manager.create.mockReturnValue({});

      const savedInventories: any[] = [];
      mockQueryRunner.manager.save.mockImplementation((entity, data) => {
        if (entity === Inventory) {
          savedInventories.push(data);
        }
        return Promise.resolve(data);
      });

      await service.transferStock(companyId, userId, {
        fromStoreId,
        toStoreId,
        productId,
        quantity: 5,
      });

      const savedToInventory = savedInventories.find(
        (inv) => inv.storeId === toStoreId,
      );
      expect(savedToInventory.lastRestockDate).toBeInstanceOf(Date);
    });

    it('should rollback transaction on error', async () => {
      const product = { id: productId, companyId, name: 'Test Product' };
      const fromInventory = {
        id: 'inv-1',
        companyId,
        storeId: fromStoreId,
        productId,
        variantId: null,
        quantity: 20,
        reservedQuantity: 0,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(fromInventory),
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(null);

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryRunner.manager.create.mockReturnValue({});
      mockQueryRunner.manager.save.mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(
        service.transferStock(companyId, userId, {
          fromStoreId,
          toStoreId,
          productId,
          quantity: 5,
        }),
      ).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle variant transfers correctly', async () => {
      const variantId = 'variant-1';
      const product = { id: productId, companyId, name: 'Test Product' };
      const fromInventory = {
        id: 'inv-1',
        companyId,
        storeId: fromStoreId,
        productId,
        variantId,
        quantity: 20,
        reservedQuantity: 0,
      };
      const toInventory = {
        id: 'inv-2',
        companyId,
        storeId: toStoreId,
        productId,
        variantId,
        quantity: 10,
        reservedQuantity: 0,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(fromInventory),
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(toInventory);

      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryRunner.manager.create.mockReturnValue({});
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...fromInventory, quantity: 15 })
        .mockResolvedValueOnce({ ...toInventory, quantity: 15 })
        .mockResolvedValueOnce({ id: 'mov-1' })
        .mockResolvedValueOnce({ id: 'mov-2' });

      const result = await service.transferStock(companyId, userId, {
        fromStoreId,
        toStoreId,
        productId,
        variantId,
        quantity: 5,
      });

      expect(result.fromInventory.variantId).toBe(variantId);
      expect(result.toInventory.variantId).toBe(variantId);
    });

    it('should respect reserved stock when checking available quantity', async () => {
      const product = { id: productId, companyId, name: 'Test Product' };
      const fromInventory = {
        id: 'inv-1',
        companyId,
        storeId: fromStoreId,
        productId,
        variantId: null,
        quantity: 20,
        reservedQuantity: 15, // Only 5 available
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(fromInventory),
      };

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(product);
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Should succeed with 5 (exactly available)
      const toInventory = {
        id: 'inv-2',
        companyId,
        storeId: toStoreId,
        productId,
        variantId: null,
        quantity: 10,
        reservedQuantity: 0,
      };

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(toInventory);
      mockQueryRunner.manager.create.mockReturnValue({});
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...fromInventory, quantity: 15 })
        .mockResolvedValueOnce({ ...toInventory, quantity: 15 })
        .mockResolvedValueOnce({ id: 'mov-1' })
        .mockResolvedValueOnce({ id: 'mov-2' });

      const result = await service.transferStock(companyId, userId, {
        fromStoreId,
        toStoreId,
        productId,
        quantity: 5,
      });

      expect(result.fromInventory.quantity).toBe(15);
    });
  });

  describe('getAvailableQuantity', () => {
    it('should return available quantity', async () => {
      const inventory = {
        id: 'inv-1',
        companyId: 'company-1',
        storeId: 'store-1',
        productId: 'product-1',
        variantId: null,
        quantity: 20,
        reservedQuantity: 5,
        availableQuantity: 15,
      };

      jest.spyOn(inventoryRepo, 'findOne').mockResolvedValue(inventory as any);

      const result = await service.getAvailableQuantity(
        'company-1',
        'store-1',
        'product-1',
      );

      expect(result).toBe(15);
    });

    it('should return 0 if inventory not found', async () => {
      jest.spyOn(inventoryRepo, 'findOne').mockResolvedValue(null);

      const result = await service.getAvailableQuantity(
        'company-1',
        'store-1',
        'product-1',
      );

      expect(result).toBe(0);
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with low stock', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'inv-1',
            availableQuantity: 5,
            product: { name: 'Product 1', lowStockThreshold: 10 },
          },
        ]),
      };

      jest
        .spyOn(inventoryRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getLowStockProducts('company-1', 'store-1');

      expect(result).toHaveLength(1);
      expect(result[0].availableQuantity).toBe(5);
    });
  });

  describe('sendLowStockAlerts', () => {
    it('should send alerts for all low stock products', async () => {
      const lowStockProducts = [
        {
          id: 'inv-1',
          availableQuantity: 5,
          product: { name: 'Product 1', lowStockThreshold: 10 },
          variant: null,
        },
        {
          id: 'inv-2',
          availableQuantity: 2,
          product: { name: 'Product 2', lowStockThreshold: 10 },
          variant: { name: 'Variant A' },
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(lowStockProducts),
      };

      jest
        .spyOn(inventoryRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      notificationsService.sendLowStockAlert.mockResolvedValue({
        success: true,
      });

      const result = await service.sendLowStockAlerts(
        'company-1',
        'store-1',
        'owner@example.com',
      );

      expect(result.sent).toBe(2);
      expect(result.products).toEqual([
        'Product 1',
        'Product 2 (Variant A)',
      ]);
      expect(notificationsService.sendLowStockAlert).toHaveBeenCalledTimes(2);
      expect(notificationsService.sendLowStockAlert).toHaveBeenCalledWith(
        'owner@example.com',
        'Product 1',
        5,
      );
      expect(notificationsService.sendLowStockAlert).toHaveBeenCalledWith(
        'owner@example.com',
        'Product 2 (Variant A)',
        2,
      );
    });

    it('should return zero sent when no low stock products', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(inventoryRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.sendLowStockAlerts(
        'company-1',
        'store-1',
        'owner@example.com',
      );

      expect(result.sent).toBe(0);
      expect(result.products).toEqual([]);
      expect(notificationsService.sendLowStockAlert).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      jest
        .spyOn(inventoryRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await expect(
        service.sendLowStockAlerts(
          'company-1',
          'store-1',
          'owner@example.com',
        ),
      ).rejects.toThrow('Database error');
    });
  });
});

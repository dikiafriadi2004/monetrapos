import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { StoresService } from './stores.service';
import { Store, StoreType } from './store.entity';
import { User, UserRole } from '../users/user.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

describe('StoresService', () => {
  let service: StoresService;
  let storeRepo: Repository<Store>;
  let userRepo: Repository<User>;

  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';
  const mockStoreId = 'store-123';

  const mockStore: Partial<Store> = {
    id: mockStoreId,
    companyId: mockCompanyId,
    name: 'Test Store',
    code: 'TEST01',
    type: StoreType.RETAIL,
    isActive: true,
    managerId: null,
  };

  const mockUser: Partial<User> = {
    id: mockUserId,
    companyId: mockCompanyId,
    name: 'Test Manager',
    email: 'manager@test.com',
    role: UserRole.MANAGER,
    isActive: true,
  };

  const mockStoreRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoresService,
        {
          provide: getRepositoryToken(Store),
          useValue: mockStoreRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<StoresService>(StoresService);
    storeRepo = module.get<Repository<Store>>(getRepositoryToken(Store));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));

    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default query builder behavior
    mockStoreRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.leftJoinAndSelect.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateStoreDto = {
      name: 'New Store',
      code: 'NEW01',
      type: StoreType.RETAIL,
      address: '123 Test St',
      phone: '08123456789',
    };

    it('should create a store successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null); // No existing store with same code
      mockStoreRepository.create.mockReturnValue(mockStore);
      mockStoreRepository.save.mockResolvedValue(mockStore);

      const result = await service.create(createDto, mockCompanyId);

      expect(mockStoreRepository.create).toHaveBeenCalledWith({
        ...createDto,
        companyId: mockCompanyId,
        type: createDto.type,
      });
      expect(mockStoreRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockStore);
    });

    it('should throw ConflictException if store code already exists', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockStore); // Existing store found

      await expect(service.create(createDto, mockCompanyId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should validate manager if managerId is provided', async () => {
      const dtoWithManager = { ...createDto, managerId: mockUserId };
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockStoreRepository.create.mockReturnValue(mockStore);
      mockStoreRepository.save.mockResolvedValue(mockStore);

      await service.create(dtoWithManager, mockCompanyId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUserId, companyId: mockCompanyId },
      });
    });

    it('should throw BadRequestException if manager not found', async () => {
      const dtoWithManager = { ...createDto, managerId: 'invalid-id' };
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.create(dtoWithManager, mockCompanyId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if manager is not active', async () => {
      const dtoWithManager = { ...createDto, managerId: mockUserId };
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.create(dtoWithManager, mockCompanyId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createDefaultStore', () => {
    it('should create a default store for new company', async () => {
      const companyName = 'Test Company';
      const defaultStore = {
        ...mockStore,
        name: `${companyName} - Main Store`,
        code: 'MAIN',
      };

      mockStoreRepository.create.mockReturnValue(defaultStore);
      mockStoreRepository.save.mockResolvedValue(defaultStore);

      const result = await service.createDefaultStore(mockCompanyId, companyName);

      expect(mockStoreRepository.create).toHaveBeenCalledWith({
        companyId: mockCompanyId,
        name: `${companyName} - Main Store`,
        code: 'MAIN',
        type: StoreType.RETAIL,
        isActive: true,
        receiptHeader: companyName,
        receiptFooter: 'Thank you for your business!',
      });
      expect(result).toEqual(defaultStore);
    });
  });

  describe('findAll', () => {
    it('should return paginated stores with manager relation', async () => {
      const stores = [mockStore, { ...mockStore, id: 'store-456' }];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([stores, 2]);

      const result = await service.findAll(mockCompanyId, { page: 1, limit: 10 });

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('store.manager', 'manager');
      expect(result).toEqual({
        data: stores,
        total: 2,
        page: 1,
        limit: 10,
      });
    });

    it('should filter by isActive', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(mockCompanyId, { isActive: true });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('store.isActive = :isActive', {
        isActive: true,
      });
    });

    it('should filter by type', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(mockCompanyId, { type: StoreType.RETAIL });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('store.type = :type', {
        type: StoreType.RETAIL,
      });
    });

    it('should filter by managerId', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(mockCompanyId, { managerId: mockUserId });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('store.managerId = :managerId', {
        managerId: mockUserId,
      });
    });

    it('should search by name, code, city, or address', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(mockCompanyId, { search: 'test' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('store.name ILIKE :search'),
        { search: '%test%' },
      );
    });
  });

  describe('findOne', () => {
    it('should return a store with manager relation', async () => {
      mockStoreRepository.findOne.mockResolvedValue(mockStore);

      const result = await service.findOne(mockStoreId, mockCompanyId);

      expect(mockStoreRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockStoreId, companyId: mockCompanyId },
        relations: ['manager'],
      });
      expect(result).toEqual(mockStore);
    });

    it('should throw NotFoundException if store not found', async () => {
      mockStoreRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockStoreId, mockCompanyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateStoreDto = {
      name: 'Updated Store',
      isActive: false,
    };

    it('should update a store successfully', async () => {
      mockStoreRepository.findOne.mockResolvedValue(mockStore);
      mockStoreRepository.save.mockResolvedValue({ ...mockStore, ...updateDto });

      const result = await service.update(mockStoreId, updateDto, mockCompanyId);

      expect(mockStoreRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(updateDto.name);
    });

    it('should validate code uniqueness when updating code', async () => {
      const updateDtoWithCode = { ...updateDto, code: 'NEW01' };
      mockStoreRepository.findOne.mockResolvedValue(mockStore);
      mockQueryBuilder.getOne.mockResolvedValue(null); // No conflict
      mockStoreRepository.save.mockResolvedValue({ ...mockStore, ...updateDtoWithCode });

      await service.update(mockStoreId, updateDtoWithCode, mockCompanyId);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('store.id != :excludeStoreId', {
        excludeStoreId: mockStoreId,
      });
    });

    it('should allow removing manager by setting managerId to null', async () => {
      const updateDtoWithNullManager = { managerId: null };
      mockStoreRepository.findOne.mockResolvedValue({ ...mockStore, managerId: mockUserId });
      mockStoreRepository.save.mockResolvedValue({ ...mockStore, managerId: null });

      const result = await service.update(mockStoreId, updateDtoWithNullManager, mockCompanyId);

      expect(result.managerId).toBeNull();
    });

    it('should validate new manager when updating managerId', async () => {
      const updateDtoWithManager = { managerId: mockUserId };
      mockStoreRepository.findOne.mockResolvedValue(mockStore);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockStoreRepository.save.mockResolvedValue({ ...mockStore, managerId: mockUserId });

      await service.update(mockStoreId, updateDtoWithManager, mockCompanyId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUserId, companyId: mockCompanyId },
      });
    });
  });

  describe('remove', () => {
    it('should soft delete a store', async () => {
      mockStoreRepository.findOne.mockResolvedValue(mockStore);
      mockStoreRepository.softRemove.mockResolvedValue(mockStore);

      await service.remove(mockStoreId, mockCompanyId);

      expect(mockStoreRepository.softRemove).toHaveBeenCalledWith(mockStore);
    });

    it('should throw NotFoundException if store not found', async () => {
      mockStoreRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockStoreId, mockCompanyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignManager', () => {
    it('should assign a manager to a store', async () => {
      mockStoreRepository.findOne.mockResolvedValue(mockStore);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockStoreRepository.save.mockResolvedValue({ ...mockStore, managerId: mockUserId });

      const result = await service.assignManager(mockStoreId, mockUserId, mockCompanyId);

      expect(result.managerId).toBe(mockUserId);
      expect(mockStoreRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if manager not found', async () => {
      mockStoreRepository.findOne.mockResolvedValue(mockStore);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignManager(mockStoreId, 'invalid-id', mockCompanyId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeManager', () => {
    it('should remove manager from a store', async () => {
      mockStoreRepository.findOne.mockResolvedValue({ ...mockStore, managerId: mockUserId });
      mockStoreRepository.save.mockResolvedValue({ ...mockStore, managerId: null });

      const result = await service.removeManager(mockStoreId, mockCompanyId);

      expect(result.managerId).toBeNull();
      expect(mockStoreRepository.save).toHaveBeenCalled();
    });
  });

  describe('findByManager', () => {
    it('should return all stores managed by a user', async () => {
      const stores = [
        { ...mockStore, managerId: mockUserId },
        { ...mockStore, id: 'store-456', managerId: mockUserId },
      ];
      mockStoreRepository.find.mockResolvedValue(stores);

      const result = await service.findByManager(mockUserId, mockCompanyId);

      expect(mockStoreRepository.find).toHaveBeenCalledWith({
        where: { managerId: mockUserId, companyId: mockCompanyId, isActive: true },
        relations: ['manager'],
        order: { name: 'ASC' },
      });
      expect(result).toEqual(stores);
    });
  });

  describe('isCodeAvailable', () => {
    it('should return true if code is available', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.isCodeAvailable('NEW01', mockCompanyId);

      expect(result).toBe(true);
    });

    it('should return false if code is already taken', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockStore);

      const result = await service.isCodeAvailable('TEST01', mockCompanyId);

      expect(result).toBe(false);
    });

    it('should exclude current store when checking availability', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.isCodeAvailable('TEST01', mockCompanyId, mockStoreId);

      expect(result).toBe(true);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('store.id != :excludeStoreId', {
        excludeStoreId: mockStoreId,
      });
    });
  });

  describe('getStoreStats', () => {
    it('should return store with stats', async () => {
      mockStoreRepository.findOne.mockResolvedValue(mockStore);

      const result = await service.getStoreStats(mockStoreId, mockCompanyId);

      expect(result).toHaveProperty('store');
      expect(result).toHaveProperty('stats');
      expect(result.stats).toHaveProperty('totalEmployees');
      expect(result.stats).toHaveProperty('totalProducts');
      expect(result.stats).toHaveProperty('todaySales');
      expect(result.stats).toHaveProperty('monthSales');
    });

    it('should throw NotFoundException if store not found', async () => {
      mockStoreRepository.findOne.mockResolvedValue(null);

      await expect(service.getStoreStats(mockStoreId, mockCompanyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

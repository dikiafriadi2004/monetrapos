import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethod, PaymentMethodType } from './payment-method.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;
  let repository: Repository<PaymentMethod>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentMethodsService,
        {
          provide: getRepositoryToken(PaymentMethod),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PaymentMethodsService>(PaymentMethodsService);
    repository = module.get<Repository<PaymentMethod>>(
      getRepositoryToken(PaymentMethod),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByCompany', () => {
    it('should return payment methods for a company', async () => {
      const companyId = 'company-123';
      const mockMethods = [
        { id: '1', name: 'Cash', code: 'cash', companyId },
        { id: '2', name: 'Card', code: 'card', companyId },
      ];

      mockRepository.find.mockResolvedValue(mockMethods);

      const result = await service.findByCompany(companyId);

      expect(result).toEqual(mockMethods);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { companyId },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    });
  });

  describe('create', () => {
    it('should create a new payment method', async () => {
      const dto = {
        companyId: 'company-123',
        name: 'GoPay',
        code: 'gopay',
        type: PaymentMethodType.EWALLET,
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(dto);
      mockRepository.save.mockResolvedValue({ id: '1', ...dto });

      const result = await service.create(dto);

      expect(result).toEqual({ id: '1', ...dto });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { companyId: dto.companyId, code: dto.code },
      });
    });

    it('should throw ConflictException if code already exists', async () => {
      const dto = {
        companyId: 'company-123',
        name: 'Cash',
        code: 'cash',
        type: PaymentMethodType.CASH,
      };

      mockRepository.findOne.mockResolvedValue({ id: '1', ...dto });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a payment method', async () => {
      const id = '1';
      const companyId = 'company-123';
      const dto = { name: 'Updated Name' };
      const existing = {
        id,
        companyId,
        name: 'Old Name',
        code: 'cash',
      };

      mockRepository.findOne.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue({ ...existing, ...dto });

      const result = await service.update(id, companyId, dto);

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if payment method not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('1', 'company-123', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggle', () => {
    it('should toggle payment method active status', async () => {
      const id = '1';
      const companyId = 'company-123';
      const existing = {
        id,
        companyId,
        isActive: true,
      };

      mockRepository.findOne.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue({ ...existing, isActive: false });

      const result = await service.toggle(id, companyId);

      expect(result.isActive).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a payment method', async () => {
      const id = '1';
      const companyId = 'company-123';
      const existing = { id, companyId };

      mockRepository.findOne.mockResolvedValue(existing);
      mockRepository.remove.mockResolvedValue(existing);

      await service.delete(id, companyId);

      expect(mockRepository.remove).toHaveBeenCalledWith(existing);
    });
  });

  describe('seedDefaultPaymentMethods', () => {
    it('should seed default payment methods for a company', async () => {
      const companyId = 'company-123';

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data);
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      await service.seedDefaultPaymentMethods(companyId);

      expect(mockRepository.save).toHaveBeenCalledTimes(4); // Cash, Debit Card, Credit Card, QRIS
    });

    it('should not create duplicate payment methods', async () => {
      const companyId = 'company-123';

      // Mock that all methods already exist
      mockRepository.findOne.mockResolvedValue({ id: '1' });

      await service.seedDefaultPaymentMethods(companyId);

      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});

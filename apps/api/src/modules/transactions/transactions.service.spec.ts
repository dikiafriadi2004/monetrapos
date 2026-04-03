import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { TransactionItem } from './transaction-item.entity';
import { Product } from '../products/product.entity';
import { Customer } from '../customers/customer.entity';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethodType } from '../../common/enums';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let mockTransactionRepo: any;
  let mockTransactionItemRepo: any;
  let mockProductRepo: any;
  let mockCustomerRepo: any;
  let mockDataSource: any;
  let mockQueryRunner: any;

  beforeEach(async () => {
    // Mock QueryBuilder for generateTransactionNumber
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    };

    // Mock QueryRunner
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      },
    };

    // Mock DataSource
    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    // Mock Repositories
    mockTransactionRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockTransactionItemRepo = {
      save: jest.fn(),
    };

    mockProductRepo = {
      findOne: jest.fn(),
    };

    mockCustomerRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepo,
        },
        {
          provide: getRepositoryToken(TransactionItem),
          useValue: mockTransactionItemRepo,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepo,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateTotal', () => {
    it('should calculate totals correctly', () => {
      const dto = {
        items: [
          {
            productName: 'Item 1',
            quantity: 2,
            unitPrice: 10000,
            discountAmount: 1000,
            subtotal: 19000,
          },
          {
            productName: 'Item 2',
            quantity: 1,
            unitPrice: 15000,
            discountAmount: 0,
            subtotal: 15000,
          },
        ],
        discountAmount: 2000,
        taxAmount: 3200,
      } as any;

      const result = service.calculateTotal(dto);

      expect(result.subtotal).toBe(34000); // (2*10000-1000) + (1*15000)
      expect(result.discountAmount).toBe(2000);
      expect(result.taxAmount).toBe(3200);
      expect(result.total).toBe(35200); // 34000 - 2000 + 3200
    });

    it('should handle zero discounts', () => {
      const dto = {
        items: [
          {
            productName: 'Item 1',
            quantity: 1,
            unitPrice: 10000,
            discountAmount: 0,
            subtotal: 10000,
          },
        ],
        discountAmount: 0,
        taxAmount: 1000,
      } as any;

      const result = service.calculateTotal(dto);

      expect(result.subtotal).toBe(10000);
      expect(result.total).toBe(11000); // 10000 + 1000
    });

    it('should round to 2 decimal places', () => {
      const dto = {
        items: [
          {
            productName: 'Item 1',
            quantity: 3,
            unitPrice: 3333.33,
            discountAmount: 0,
            subtotal: 9999.99,
          },
        ],
        discountAmount: 0,
        taxAmount: 999.99,
      } as any;

      const result = service.calculateTotal(dto);

      expect(result.subtotal).toBe(9999.99);
      expect(result.total).toBe(10999.98);
    });
  });

  describe('create', () => {
    it('should throw BadRequestException if calculation mismatch', async () => {
      const dto = {
        storeId: 'store-1',
        items: [
          {
            productId: 'prod-1',
            productName: 'Item 1',
            quantity: 1,
            unitPrice: 10000,
            discountAmount: 0,
            subtotal: 10000,
          },
        ],
        subtotal: 10000,
        discountAmount: 0,
        taxAmount: 1000,
        total: 12000, // Wrong! Should be 11000
        paidAmount: 12000,
        paymentMethod: PaymentMethodType.CASH,
      } as any;

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      const dto = {
        storeId: 'store-1',
        items: [
          {
            productId: 'prod-1',
            productName: 'Item 1',
            quantity: 1,
            unitPrice: 10000,
            discountAmount: 0,
            subtotal: 10000,
          },
        ],
        subtotal: 10000,
        discountAmount: 0,
        taxAmount: 1000,
        total: 11000,
        paidAmount: 11000,
        paymentMethod: PaymentMethodType.CASH,
      } as any;

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce({
        id: 'prod-1',
        name: 'Item 1',
        stock: 0, // No stock
      });

      const dto = {
        storeId: 'store-1',
        items: [
          {
            productId: 'prod-1',
            productName: 'Item 1',
            quantity: 1,
            unitPrice: 10000,
            discountAmount: 0,
            subtotal: 10000,
          },
        ],
        subtotal: 10000,
        discountAmount: 0,
        taxAmount: 1000,
        total: 11000,
        paidAmount: 11000,
        paymentMethod: PaymentMethodType.CASH,
      } as any;

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('voidTransaction', () => {
    it('should throw NotFoundException if transaction not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.voidTransaction('tx-1', { reason: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already voided', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce({
        id: 'tx-1',
        status: 'voided',
        items: [],
      });

      await expect(
        service.voidTransaction('tx-1', { reason: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

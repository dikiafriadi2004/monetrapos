import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import { Employee } from '../employees/employee.entity';
import { EmailVerificationToken } from './email-verification-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import { BillingService } from '../billing/billing.service';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
import { BadRequestException } from '@nestjs/common';

describe('AuthService - Registration with Payment Flow', () => {
  let service: AuthService;
  let companyRepo: any;
  let userRepo: any;
  let subscriptionsService: any;
  let subscriptionPlansService: any;
  let billingService: any;
  let dataSource: any;

  beforeEach(async () => {
    const mockCompanyRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const mockUserRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const mockEmployeeRepo = {
      findOne: jest.fn(),
    };

    const mockEmailTokenRepo = {
      create: jest.fn().mockImplementation((data) => ({
        ...data,
        id: 'email-token-id',
      })),
    };

    const mockPasswordTokenRepo = {
      findOne: jest.fn(),
    };

    const mockSubscriptionsService = {
      create: jest.fn().mockResolvedValue({
        id: 'subscription-id',
        companyId: 'company-id',
        planId: 'plan-id',
        status: 'pending',
      }),
    };

    const mockSubscriptionPlansService = {
      findOne: jest.fn(),
      getDurationsByPlan: jest.fn(),
    };

    const mockBillingService = {
      createInvoice: jest.fn(),
      createPaymentTransaction: jest.fn(),
    };

    const mockPaymentGatewayService = {
      createPaymentUrl: jest.fn().mockResolvedValue({
        token: 'mock-snap-token',
        redirectUrl:
          'https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-snap-token',
      }),
    };

    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn().mockImplementation((entity) => {
          if (!entity.id) {
            entity.id = 'generated-id';
          }
          return Promise.resolve(entity);
        }),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompanyRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepo,
        },
        {
          provide: getRepositoryToken(EmailVerificationToken),
          useValue: mockEmailTokenRepo,
        },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: mockPasswordTokenRepo,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
        {
          provide: SubscriptionPlansService,
          useValue: mockSubscriptionPlansService,
        },
        {
          provide: BillingService,
          useValue: mockBillingService,
        },
        {
          provide: PaymentGatewayService,
          useValue: mockPaymentGatewayService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    companyRepo = module.get(getRepositoryToken(Company));
    userRepo = module.get(getRepositoryToken(User));
    subscriptionsService = module.get(SubscriptionsService);
    subscriptionPlansService = module.get(SubscriptionPlansService);
    billingService = module.get(BillingService);
    dataSource = module.get(DataSource);
  });

  describe('registerCompany with payment flow', () => {
    it('should require planId and durationMonths', async () => {
      const dto = {
        companyName: 'Test Company',
        companyEmail: 'test@company.com',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
        password: 'password123',
        planId: 'plan-123',
        durationMonths: 3,
      };

      companyRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      companyRepo.create.mockImplementation((data) => ({
        ...data,
        id: 'company-id',
      }));
      userRepo.create.mockImplementation((data) => ({
        ...data,
        id: 'user-id',
      }));

      subscriptionPlansService.findOne.mockResolvedValue({
        id: 'plan-123',
        name: 'Professional',
        priceMonthly: 599000,
      });

      subscriptionPlansService.getDurationsByPlan.mockResolvedValue([
        { durationMonths: 1, finalPrice: 599000, discountPercentage: 0 },
        { durationMonths: 3, finalPrice: 1707300, discountPercentage: 5 },
        { durationMonths: 6, finalPrice: 3234600, discountPercentage: 10 },
        { durationMonths: 12, finalPrice: 5750400, discountPercentage: 20 },
      ]);

      billingService.createInvoice.mockResolvedValue({
        id: 'invoice-id',
        invoiceNumber: 'INV-202603-00001',
        total: 1707300,
        dueDate: new Date(),
      });

      const result = await service.registerCompany(dto);

      expect(result).toHaveProperty('invoiceId');
      expect(result).toHaveProperty('invoiceNumber');
      expect(result).toHaveProperty('amount', 1707300);
      expect(result).toHaveProperty('durationMonths', 3);
      expect(result).toHaveProperty('discountPercentage', 5);
      expect(result).toHaveProperty('paymentUrl');
    });

    it('should throw error if plan not found', async () => {
      const dto = {
        companyName: 'Test Company',
        companyEmail: 'test@company.com',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
        password: 'password123',
        planId: 'invalid-plan',
        durationMonths: 3,
      };

      companyRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      subscriptionPlansService.findOne.mockResolvedValue(null);

      await expect(service.registerCompany(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.registerCompany(dto)).rejects.toThrow(
        'Invalid subscription plan',
      );
    });

    it('should throw error if duration not available', async () => {
      const dto = {
        companyName: 'Test Company',
        companyEmail: 'test@company.com',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
        password: 'password123',
        planId: 'plan-123',
        durationMonths: 2, // Invalid duration
      };

      companyRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      subscriptionPlansService.findOne.mockResolvedValue({
        id: 'plan-123',
        name: 'Professional',
      });

      subscriptionPlansService.getDurationsByPlan.mockResolvedValue([
        { durationMonths: 1, finalPrice: 599000 },
        { durationMonths: 3, finalPrice: 1707300 },
      ]);

      await expect(service.registerCompany(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.registerCompany(dto)).rejects.toThrow(
        'Invalid duration selected',
      );
    });

    it('should create invoice with correct pricing for 1 month (0% discount)', async () => {
      const dto = {
        companyName: 'Test Company',
        companyEmail: 'test@company.com',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
        password: 'password123',
        planId: 'plan-123',
        durationMonths: 1,
      };

      companyRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      companyRepo.create.mockImplementation((data) => ({
        ...data,
        id: 'company-id',
      }));
      userRepo.create.mockImplementation((data) => ({
        ...data,
        id: 'user-id',
      }));

      subscriptionPlansService.findOne.mockResolvedValue({
        id: 'plan-123',
        name: 'Starter',
        priceMonthly: 299000,
      });

      subscriptionPlansService.getDurationsByPlan.mockResolvedValue([
        { durationMonths: 1, finalPrice: 299000, discountPercentage: 0 },
      ]);

      billingService.createInvoice.mockResolvedValue({
        id: 'invoice-id',
        invoiceNumber: 'INV-202603-00001',
        total: 299000,
        dueDate: new Date(),
      });

      const result = await service.registerCompany(dto);

      expect(billingService.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 299000,
          discountAmount: 0,
        }),
      );
      expect(result.amount).toBe(299000);
      expect(result.discountPercentage).toBe(0);
    });

    it('should create invoice with correct pricing for 12 months (20% discount)', async () => {
      const dto = {
        companyName: 'Test Company',
        companyEmail: 'test@company.com',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
        password: 'password123',
        planId: 'plan-123',
        durationMonths: 12,
      };

      companyRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      companyRepo.create.mockImplementation((data) => ({
        ...data,
        id: 'company-id',
      }));
      userRepo.create.mockImplementation((data) => ({
        ...data,
        id: 'user-id',
      }));

      subscriptionPlansService.findOne.mockResolvedValue({
        id: 'plan-123',
        name: 'Professional',
        priceMonthly: 599000,
      });

      subscriptionPlansService.getDurationsByPlan.mockResolvedValue([
        { durationMonths: 12, finalPrice: 5750400, discountPercentage: 20 },
      ]);

      billingService.createInvoice.mockResolvedValue({
        id: 'invoice-id',
        invoiceNumber: 'INV-202603-00001',
        total: 5750400,
        dueDate: new Date(),
      });

      const result = await service.registerCompany(dto);

      expect(result.amount).toBe(5750400);
      expect(result.discountPercentage).toBe(20);
      expect(result.durationMonths).toBe(12);
    });

    it('should create pending subscription (not trial)', async () => {
      const dto = {
        companyName: 'Test Company',
        companyEmail: 'test@company.com',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
        password: 'password123',
        planId: 'plan-123',
        durationMonths: 3,
      };

      companyRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      companyRepo.create.mockImplementation((data) => ({
        ...data,
        id: 'company-id',
      }));
      userRepo.create.mockImplementation((data) => ({
        ...data,
        id: 'user-id',
      }));

      subscriptionPlansService.findOne.mockResolvedValue({
        id: 'plan-123',
        name: 'Professional',
        priceMonthly: 599000,
      });

      subscriptionPlansService.getDurationsByPlan.mockResolvedValue([
        { durationMonths: 3, finalPrice: 1707300, discountPercentage: 5 },
      ]);

      billingService.createInvoice.mockResolvedValue({
        id: 'invoice-id',
        invoiceNumber: 'INV-202603-00001',
        total: 1707300,
        dueDate: new Date(),
      });

      await service.registerCompany(dto);

      expect(subscriptionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          startTrial: false,
        }),
      );
    });
  });
});

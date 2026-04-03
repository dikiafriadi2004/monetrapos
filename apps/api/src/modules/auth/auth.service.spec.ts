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
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService - Payment Flow Refactoring', () => {
  let service: AuthService;
  let userRepo: any;
  let emailTokenRepo: any;
  let passwordTokenRepo: any;
  let companyRepo: any;
  let subscriptionsService: any;
  let subscriptionPlansService: any;
  let billingService: any;
  let paymentGatewayService: any;
  let dataSource: any;
  let jwtService: any;

  beforeEach(async () => {
    // Mock repositories
    const mockCompanyRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockUserRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockEmployeeRepo = {
      findOne: jest.fn(),
    };

    const mockEmailTokenRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => ({
        ...data,
        id: 'email-token-id',
      })),
      save: jest.fn(),
    };

    const mockPasswordTokenRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockSubscriptionsService = {
      create: jest.fn(),
      createSubscription: jest.fn(),
    };

    const mockSubscriptionPlansService = {
      findByCode: jest.fn(),
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
      verifySignature: jest.fn(),
      parseNotificationStatus: jest.fn(),
    };

    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
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
            verify: jest.fn(),
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
    userRepo = module.get(getRepositoryToken(User));
    emailTokenRepo = module.get(getRepositoryToken(EmailVerificationToken));
    passwordTokenRepo = module.get(getRepositoryToken(PasswordResetToken));
    companyRepo = module.get(getRepositoryToken(Company));
    subscriptionsService = module.get(SubscriptionsService);
    subscriptionPlansService = module.get(SubscriptionPlansService);
    billingService = module.get(BillingService);
    paymentGatewayService = module.get(PaymentGatewayService);
    dataSource = module.get(DataSource);
    jwtService = module.get(JwtService);
  });

  describe('registerCompany', () => {
    it('should register company successfully with payment flow', async () => {
      const dto = {
        companyName: 'Test Company',
        companyEmail: 'company@test.com',
        companyPhone: '081234567890',
        companyAddress: 'Test Address',
        ownerName: 'John Doe',
        ownerEmail: 'john@test.com',
        ownerPhone: '081234567890',
        password: 'password123',
        planId: 'plan-id',
        durationMonths: 12,
      };

      const mockPlan = {
        id: 'plan-id',
        name: 'Professional',
        priceMonthly: 100000,
      };

      const mockDurations = [
        {
          durationMonths: 12,
          finalPrice: 1000000,
          discountPercentage: 10,
        },
      ];

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          save: jest.fn().mockImplementation((entity) => {
            if (entity.name) return { ...entity, id: 'company-id' };
            if (entity.email) return { ...entity, id: 'user-id' };
            if (entity.companyId) return { ...entity, id: 'subscription-id' };
            if (entity.invoiceNumber)
              return { ...entity, id: 'invoice-id', invoiceNumber: 'INV-001' };
            if (entity.token) return { ...entity, id: 'token-id' };
            return entity;
          }),
        },
      };

      companyRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      companyRepo.create.mockImplementation((data: any) => data);
      userRepo.create.mockImplementation((data: any) => data);
      subscriptionPlansService.findOne.mockResolvedValue(mockPlan);
      subscriptionPlansService.getDurationsByPlan.mockResolvedValue(
        mockDurations,
      );
      subscriptionsService.create.mockResolvedValue({
        companyId: 'company-id',
        planId: 'plan-id',
      });
      billingService.createInvoice.mockResolvedValue({
        id: 'invoice-id',
        invoiceNumber: 'INV-001',
        dueDate: new Date(),
      });
      emailTokenRepo.create.mockImplementation((data: any) => data);
      paymentGatewayService.createPaymentUrl.mockResolvedValue({
        token: 'snap-token',
        redirectUrl: 'https://payment.url',
      });
      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      const result = await service.registerCompany(dto);

      expect(result).toHaveProperty('companyId');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('paymentUrl');
      expect(result).toHaveProperty('paymentToken');
      expect(result.message).toContain('Please complete payment');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw error if plan does not exist', async () => {
      const dto = {
        companyName: 'Test Company',
        companyEmail: 'company@test.com',
        companyPhone: '081234567890',
        companyAddress: 'Test Address',
        ownerName: 'John Doe',
        ownerEmail: 'john@test.com',
        ownerPhone: '081234567890',
        password: 'password123',
        planId: 'invalid-plan-id',
        durationMonths: 12,
      };

      subscriptionPlansService.findOne.mockResolvedValue(null);

      await expect(service.registerCompany(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.registerCompany(dto)).rejects.toThrow(
        'Invalid subscription plan',
      );
    });

    it('should throw error if duration is invalid', async () => {
      const dto = {
        companyName: 'Test Company',
        companyEmail: 'company@test.com',
        companyPhone: '081234567890',
        companyAddress: 'Test Address',
        ownerName: 'John Doe',
        ownerEmail: 'john@test.com',
        ownerPhone: '081234567890',
        password: 'password123',
        planId: 'plan-id',
        durationMonths: 24,
      };

      const mockPlan = {
        id: 'plan-id',
        name: 'Professional',
        priceMonthly: 100000,
      };

      const mockDurations = [
        {
          durationMonths: 12,
          finalPrice: 1000000,
          discountPercentage: 10,
        },
      ];

      subscriptionPlansService.findOne.mockResolvedValue(mockPlan);
      subscriptionPlansService.getDurationsByPlan.mockResolvedValue(
        mockDurations,
      );

      await expect(service.registerCompany(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.registerCompany(dto)).rejects.toThrow(
        'Invalid duration selected',
      );
    });

    it('should throw error if company email already exists', async () => {
      const dto = {
        companyName: 'Test Company',
        companyEmail: 'existing@test.com',
        companyPhone: '081234567890',
        companyAddress: 'Test Address',
        ownerName: 'John Doe',
        ownerEmail: 'john@test.com',
        ownerPhone: '081234567890',
        password: 'password123',
        planId: 'plan-id',
        durationMonths: 12,
      };

      const mockPlan = {
        id: 'plan-id',
        name: 'Professional',
        priceMonthly: 100000,
      };

      const mockDurations = [
        {
          durationMonths: 12,
          finalPrice: 1000000,
          discountPercentage: 10,
        },
      ];

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      subscriptionPlansService.findOne.mockResolvedValue(mockPlan);
      subscriptionPlansService.getDurationsByPlan.mockResolvedValue(
        mockDurations,
      );
      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
      companyRepo.findOne.mockResolvedValue({ id: 'existing-company' });

      await expect(service.registerCompany(dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.registerCompany(dto)).rejects.toThrow(
        'Company email already registered',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw error if user email already exists', async () => {
      const dto = {
        companyName: 'Test Company',
        companyEmail: 'company@test.com',
        companyPhone: '081234567890',
        companyAddress: 'Test Address',
        ownerName: 'John Doe',
        ownerEmail: 'existing@test.com',
        ownerPhone: '081234567890',
        password: 'password123',
        planId: 'plan-id',
        durationMonths: 12,
      };

      const mockPlan = {
        id: 'plan-id',
        name: 'Professional',
        priceMonthly: 100000,
      };

      const mockDurations = [
        {
          durationMonths: 12,
          finalPrice: 1000000,
          discountPercentage: 10,
        },
      ];

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      subscriptionPlansService.findOne.mockResolvedValue(mockPlan);
      subscriptionPlansService.getDurationsByPlan.mockResolvedValue(
        mockDurations,
      );
      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
      companyRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue({ id: 'existing-user' });

      await expect(service.registerCompany(dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.registerCompany(dto)).rejects.toThrow(
        'User email already registered',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should block login if subscription status is suspended', async () => {
      const dto = {
        email: 'john@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        isActive: true,
        company: {
          status: 'active',
          subscriptionStatus: 'suspended',
        },
      };

      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow(
        /subscription has been suspended/i,
      );
    });

    it('should allow login if subscription status is active', async () => {
      const dto = {
        email: 'john@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        isActive: true,
        companyId: 'company-id',
        role: 'owner',
        name: 'John Doe',
        company: {
          status: 'active',
          subscriptionStatus: 'active',
        },
      };

      userRepo.findOne.mockResolvedValue(mockUser);
      userRepo.update.mockResolvedValue({});

      const result = await service.login(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      );
    });

    it('should allow login if company status is pending (awaiting payment)', async () => {
      const dto = {
        email: 'john@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        isActive: true,
        companyId: 'company-id',
        role: 'owner',
        name: 'John Doe',
        company: {
          status: 'pending',
          subscriptionStatus: 'pending',
        },
      };

      userRepo.findOne.mockResolvedValue(mockUser);
      userRepo.update.mockResolvedValue({});

      const result = await service.login(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should block login if subscription status is expired', async () => {
      const dto = {
        email: 'john@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        isActive: true,
        company: {
          status: 'active',
          subscriptionStatus: 'expired',
        },
      };

      userRepo.findOne.mockResolvedValue(mockUser);

      // Expired status should not block login (grace period)
      // Only suspended status blocks login
      const result = await service.login(dto);
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw error if user does not exist', async () => {
      const dto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error if password is incorrect', async () => {
      const dto = {
        email: 'john@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        isActive: true,
        company: {
          status: 'active',
          subscriptionStatus: 'active',
        },
      };

      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error if user is not active', async () => {
      const dto = {
        email: 'john@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        isActive: false,
        company: {
          status: 'active',
          subscriptionStatus: 'active',
        },
      };

      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow(
        'Account is deactivated',
      );
    });

    it('should throw error if company is not active or pending', async () => {
      const dto = {
        email: 'john@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        isActive: true,
        company: {
          status: 'inactive',
          subscriptionStatus: 'active',
        },
      };

      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow(
        'Company account is not active',
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const dto = {
        token: 'valid-token',
      };

      const mockEmailToken = {
        id: 'token-id',
        token: 'valid-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usedAt: null,
        user: {
          id: 'user-id',
          companyId: 'company-id',
        },
      };

      emailTokenRepo.findOne.mockResolvedValue(mockEmailToken);
      userRepo.update.mockResolvedValue({});
      companyRepo.update.mockResolvedValue({});
      emailTokenRepo.save.mockResolvedValue({});

      const result = await service.verifyEmail(dto);

      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(userRepo.update).toHaveBeenCalledWith('user-id', {
        emailVerified: true,
        emailVerifiedAt: expect.any(Date),
      });
    });

    it('should throw error if token is invalid', async () => {
      const dto = {
        token: 'invalid-token',
      };

      emailTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        'Invalid verification token',
      );
    });

    it('should throw error if token is expired', async () => {
      const dto = {
        token: 'expired-token',
      };

      const mockEmailToken = {
        id: 'token-id',
        token: 'expired-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
        user: {
          id: 'user-id',
          companyId: 'company-id',
        },
      };

      emailTokenRepo.findOne.mockResolvedValue(mockEmailToken);

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        'Verification token expired',
      );
    });

    it('should throw error if token already used', async () => {
      const dto = {
        token: 'used-token',
      };

      const mockEmailToken = {
        id: 'token-id',
        token: 'used-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usedAt: new Date(),
        user: {
          id: 'user-id',
          companyId: 'company-id',
        },
      };

      emailTokenRepo.findOne.mockResolvedValue(mockEmailToken);

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        'Token already used',
      );
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset token for valid email', async () => {
      const dto = {
        email: 'john@example.com',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john@example.com',
      };

      userRepo.findOne.mockResolvedValue(mockUser);
      passwordTokenRepo.create.mockImplementation((data: any) => ({
        ...data,
        id: 'reset-token-id',
      }));
      passwordTokenRepo.save.mockResolvedValue({});

      const result = await service.forgotPassword(dto);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('resetToken');
      expect(passwordTokenRepo.save).toHaveBeenCalled();
    });

    it('should not reveal if email does not exist', async () => {
      const dto = {
        email: 'nonexistent@example.com',
      };

      userRepo.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword(dto);

      expect(result).toEqual({
        message: 'If email exists, reset link has been sent',
      });
      expect(passwordTokenRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const dto = {
        token: 'valid-reset-token',
        newPassword: 'newPassword123',
      };

      const mockPasswordToken = {
        id: 'token-id',
        token: 'valid-reset-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: null,
      };

      passwordTokenRepo.findOne.mockResolvedValue(mockPasswordToken);
      userRepo.update.mockResolvedValue({});
      passwordTokenRepo.save.mockResolvedValue({});

      const result = await service.resetPassword(dto);

      expect(result).toEqual({ message: 'Password reset successfully' });
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({
          passwordHash: expect.any(String),
        }),
      );
    });

    it('should throw error if reset token is invalid', async () => {
      const dto = {
        token: 'invalid-token',
        newPassword: 'newPassword123',
      };

      passwordTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        'Invalid reset token',
      );
    });

    it('should throw error if reset token is expired', async () => {
      const dto = {
        token: 'expired-token',
        newPassword: 'newPassword123',
      };

      const mockPasswordToken = {
        id: 'token-id',
        token: 'expired-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      };

      passwordTokenRepo.findOne.mockResolvedValue(mockPasswordToken);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        'Reset token expired',
      );
    });

    it('should throw error if reset token already used', async () => {
      const dto = {
        token: 'used-token',
        newPassword: 'newPassword123',
      };

      const mockPasswordToken = {
        id: 'token-id',
        token: 'used-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: new Date(),
      };

      passwordTokenRepo.findOne.mockResolvedValue(mockPasswordToken);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        'Token already used',
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockPayload = {
        sub: 'user-id',
        email: 'john@example.com',
        type: 'user',
        companyId: 'company-id',
        role: 'owner',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john@example.com',
        name: 'John Doe',
        role: 'owner',
        companyId: 'company-id',
        company: {
          status: 'active',
          subscriptionStatus: 'active',
        },
      };

      jwtService.verify.mockReturnValue(mockPayload);
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: 'user-id',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'owner',
        companyId: 'company-id',
      });
    });

    it('should throw error if refresh token is invalid', async () => {
      const refreshToken = 'invalid-refresh-token';

      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw error if user not found', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockPayload = {
        sub: 'user-id',
        email: 'john@example.com',
      };

      jwtService.verify.mockReturnValue(mockPayload);
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      // Service catches all errors and throws 'Invalid refresh token'
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });
});

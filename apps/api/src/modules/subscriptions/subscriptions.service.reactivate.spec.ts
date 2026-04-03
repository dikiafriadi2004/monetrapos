import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionsService } from './subscriptions.service';
import {
  Subscription,
  SubscriptionStatus,
  BillingCycle,
} from './subscription.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Company } from '../companies/company.entity';
import {
  SubscriptionHistory,
  SubscriptionHistoryAction,
} from './subscription-history.entity';
import { NotFoundException } from '@nestjs/common';

describe('SubscriptionsService - Reactivation', () => {
  let service: SubscriptionsService;
  let subscriptionRepo: Repository<Subscription>;
  let companyRepo: Repository<Company>;
  let historyRepo: Repository<SubscriptionHistory>;

  const mockSubscriptionRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCompanyRepo = {
    update: jest.fn(),
    findOne: jest.fn(),
  };

  const mockHistoryRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockPlanRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepo,
        },
        {
          provide: getRepositoryToken(SubscriptionPlan),
          useValue: mockPlanRepo,
        },
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompanyRepo,
        },
        {
          provide: getRepositoryToken(SubscriptionHistory),
          useValue: mockHistoryRepo,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    subscriptionRepo = module.get<Repository<Subscription>>(
      getRepositoryToken(Subscription),
    );
    companyRepo = module.get<Repository<Company>>(getRepositoryToken(Company));
    historyRepo = module.get<Repository<SubscriptionHistory>>(
      getRepositoryToken(SubscriptionHistory),
    );

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('reactivateSubscription', () => {
    it('should reactivate a suspended subscription with new dates from today', async () => {
      // Arrange
      const subscriptionId = 'sub-123';
      const companyId = 'company-123';
      const planId = 'plan-123';
      const durationMonths = 3;

      const suspendedSubscription: Partial<Subscription> = {
        id: subscriptionId,
        companyId,
        planId,
        status: SubscriptionStatus.SUSPENDED,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-04-01'),
        durationMonths: 3,
        gracePeriodEndDate: new Date('2024-04-04'),
        billingCycle: BillingCycle.MONTHLY,
        price: 100000,
      };

      mockSubscriptionRepo.findOne.mockResolvedValue(suspendedSubscription);
      mockSubscriptionRepo.save.mockResolvedValue({
        ...suspendedSubscription,
        status: SubscriptionStatus.ACTIVE,
      });
      mockCompanyRepo.update.mockResolvedValue({ affected: 1 });
      mockHistoryRepo.create.mockImplementation((data) => data);
      mockHistoryRepo.save.mockResolvedValue({});

      // Act
      const result = await service.reactivateSubscription(
        subscriptionId,
        durationMonths,
      );

      // Assert
      expect(mockSubscriptionRepo.findOne).toHaveBeenCalledWith({
        where: { id: subscriptionId },
        relations: ['plan'],
      });

      expect(mockSubscriptionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          gracePeriodEndDate: null,
          durationMonths,
        }),
      );

      // Verify new dates are calculated from today
      const savedSubscription = mockSubscriptionRepo.save.mock.calls[0][0];
      const today = new Date();
      const expectedEndDate = new Date(today);
      expectedEndDate.setMonth(expectedEndDate.getMonth() + durationMonths);

      expect(savedSubscription.startDate).toBeDefined();
      expect(savedSubscription.endDate).toBeDefined();
      expect(savedSubscription.startDate.toDateString()).toBe(
        today.toDateString(),
      );

      // Verify company status updated
      expect(mockCompanyRepo.update).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({
          subscriptionStatus: SubscriptionStatus.ACTIVE,
        }),
      );

      // Verify history logged
      expect(mockHistoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId,
          companyId,
          planId,
          action: SubscriptionHistoryAction.REACTIVATED,
          oldStatus: SubscriptionStatus.SUSPENDED,
          newStatus: SubscriptionStatus.ACTIVE,
        }),
      );

      expect(mockHistoryRepo.save).toHaveBeenCalled();
    });

    it('should use original duration if not provided', async () => {
      // Arrange
      const subscriptionId = 'sub-123';
      const originalDuration = 6;

      const suspendedSubscription: Partial<Subscription> = {
        id: subscriptionId,
        companyId: 'company-123',
        planId: 'plan-123',
        status: SubscriptionStatus.SUSPENDED,
        durationMonths: originalDuration,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-07-01'),
      };

      mockSubscriptionRepo.findOne.mockResolvedValue(suspendedSubscription);
      mockSubscriptionRepo.save.mockResolvedValue({
        ...suspendedSubscription,
        status: SubscriptionStatus.ACTIVE,
      });
      mockCompanyRepo.update.mockResolvedValue({ affected: 1 });
      mockHistoryRepo.create.mockImplementation((data) => data);
      mockHistoryRepo.save.mockResolvedValue({});

      // Act
      await service.reactivateSubscription(subscriptionId);

      // Assert
      const savedSubscription = mockSubscriptionRepo.save.mock.calls[0][0];
      expect(savedSubscription.durationMonths).toBe(originalDuration);
    });

    it('should default to 1 month if no duration provided and no original duration', async () => {
      // Arrange
      const subscriptionId = 'sub-123';

      const suspendedSubscription: Partial<Subscription> = {
        id: subscriptionId,
        companyId: 'company-123',
        planId: 'plan-123',
        status: SubscriptionStatus.SUSPENDED,
        durationMonths: null,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
      };

      mockSubscriptionRepo.findOne.mockResolvedValue(suspendedSubscription);
      mockSubscriptionRepo.save.mockResolvedValue({
        ...suspendedSubscription,
        status: SubscriptionStatus.ACTIVE,
      });
      mockCompanyRepo.update.mockResolvedValue({ affected: 1 });
      mockHistoryRepo.create.mockImplementation((data) => data);
      mockHistoryRepo.save.mockResolvedValue({});

      // Act
      await service.reactivateSubscription(subscriptionId);

      // Assert
      const savedSubscription = mockSubscriptionRepo.save.mock.calls[0][0];
      expect(savedSubscription.durationMonths).toBe(1);
    });

    it('should throw NotFoundException if subscription not found', async () => {
      // Arrange
      mockSubscriptionRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.reactivateSubscription('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should clear grace period end date', async () => {
      // Arrange
      const subscriptionId = 'sub-123';

      const suspendedSubscription: Partial<Subscription> = {
        id: subscriptionId,
        companyId: 'company-123',
        planId: 'plan-123',
        status: SubscriptionStatus.SUSPENDED,
        gracePeriodEndDate: new Date('2024-04-04'),
        durationMonths: 1,
      };

      mockSubscriptionRepo.findOne.mockResolvedValue(suspendedSubscription);
      mockSubscriptionRepo.save.mockResolvedValue({
        ...suspendedSubscription,
        status: SubscriptionStatus.ACTIVE,
      });
      mockCompanyRepo.update.mockResolvedValue({ affected: 1 });
      mockHistoryRepo.create.mockImplementation((data) => data);
      mockHistoryRepo.save.mockResolvedValue({});

      // Act
      await service.reactivateSubscription(subscriptionId);

      // Assert
      const savedSubscription = mockSubscriptionRepo.save.mock.calls[0][0];
      expect(savedSubscription.gracePeriodEndDate).toBeNull();
    });

    it('should clear cancellation fields', async () => {
      // Arrange
      const subscriptionId = 'sub-123';

      const suspendedSubscription: Partial<Subscription> = {
        id: subscriptionId,
        companyId: 'company-123',
        planId: 'plan-123',
        status: SubscriptionStatus.SUSPENDED,
        cancelAtPeriodEnd: true,
        cancelledAt: new Date('2024-04-01'),
        cancellationReason: 'Test reason',
        durationMonths: 1,
      };

      mockSubscriptionRepo.findOne.mockResolvedValue(suspendedSubscription);
      mockSubscriptionRepo.save.mockResolvedValue({
        ...suspendedSubscription,
        status: SubscriptionStatus.ACTIVE,
      });
      mockCompanyRepo.update.mockResolvedValue({ affected: 1 });
      mockHistoryRepo.create.mockImplementation((data) => data);
      mockHistoryRepo.save.mockResolvedValue({});

      // Act
      await service.reactivateSubscription(subscriptionId);

      // Assert
      const savedSubscription = mockSubscriptionRepo.save.mock.calls[0][0];
      expect(savedSubscription.cancelAtPeriodEnd).toBe(false);
      expect(savedSubscription.cancelledAt).toBeNull();
      expect(savedSubscription.cancellationReason).toBe('');
    });
  });
});

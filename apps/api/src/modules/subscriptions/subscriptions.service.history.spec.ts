import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription, SubscriptionStatus } from './subscription.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Company } from '../companies/company.entity';
import {
  SubscriptionHistory,
  SubscriptionHistoryAction,
} from './subscription-history.entity';

describe('SubscriptionsService - History Tracking', () => {
  let service: SubscriptionsService;
  let subscriptionRepository: Repository<Subscription>;
  let planRepository: Repository<SubscriptionPlan>;
  let companyRepository: Repository<Company>;
  let historyRepository: Repository<SubscriptionHistory>;

  const mockSubscriptionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockPlanRepository = {
    findOne: jest.fn(),
  };

  const mockCompanyRepository = {
    update: jest.fn(),
  };

  const mockHistoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(SubscriptionPlan),
          useValue: mockPlanRepository,
        },
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompanyRepository,
        },
        {
          provide: getRepositoryToken(SubscriptionHistory),
          useValue: mockHistoryRepository,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    subscriptionRepository = module.get<Repository<Subscription>>(
      getRepositoryToken(Subscription),
    );
    planRepository = module.get<Repository<SubscriptionPlan>>(
      getRepositoryToken(SubscriptionPlan),
    );
    companyRepository = module.get<Repository<Company>>(
      getRepositoryToken(Company),
    );
    historyRepository = module.get<Repository<SubscriptionHistory>>(
      getRepositoryToken(SubscriptionHistory),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logHistory', () => {
    it('should log subscription history', async () => {
      const historyData = {
        subscriptionId: 'sub-123',
        companyId: 'company-123',
        planId: 'plan-123',
        action: SubscriptionHistoryAction.CREATED,
        newStatus: SubscriptionStatus.PENDING,
        notes: 'Subscription created',
      };

      const mockHistory = { id: 'history-123', ...historyData };
      mockHistoryRepository.create.mockReturnValue(mockHistory);
      mockHistoryRepository.save.mockResolvedValue(mockHistory);

      const result = await service.logHistory(historyData);

      expect(mockHistoryRepository.create).toHaveBeenCalledWith(historyData);
      expect(mockHistoryRepository.save).toHaveBeenCalledWith(mockHistory);
      expect(result).toEqual(mockHistory);
    });
  });

  describe('getSubscriptionHistory', () => {
    it('should return paginated subscription history', async () => {
      const companyId = 'company-123';
      const mockHistoryData = [
        {
          id: 'history-1',
          subscriptionId: 'sub-123',
          companyId,
          action: SubscriptionHistoryAction.CREATED,
          createdAt: new Date(),
        },
        {
          id: 'history-2',
          subscriptionId: 'sub-123',
          companyId,
          action: SubscriptionHistoryAction.ACTIVATED,
          createdAt: new Date(),
        },
      ];

      mockHistoryRepository.findAndCount.mockResolvedValue([
        mockHistoryData,
        2,
      ]);

      const result = await service.getSubscriptionHistory(companyId);

      expect(result).toEqual({
        data: mockHistoryData,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockHistoryRepository.findAndCount).toHaveBeenCalledWith({
        where: { companyId },
        relations: ['plan', 'subscription'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('should filter by subscription ID', async () => {
      const companyId = 'company-123';
      const subscriptionId = 'sub-123';
      const mockHistoryData = [
        {
          id: 'history-1',
          subscriptionId,
          companyId,
          action: SubscriptionHistoryAction.RENEWED,
          createdAt: new Date(),
        },
      ];

      mockHistoryRepository.findAndCount.mockResolvedValue([
        mockHistoryData,
        1,
      ]);

      const result = await service.getSubscriptionHistory(
        companyId,
        subscriptionId,
      );

      expect(result.data).toEqual(mockHistoryData);
      expect(mockHistoryRepository.findAndCount).toHaveBeenCalledWith({
        where: { companyId, subscriptionId },
        relations: ['plan', 'subscription'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('should support pagination', async () => {
      const companyId = 'company-123';
      const page = 2;
      const limit = 5;

      mockHistoryRepository.findAndCount.mockResolvedValue([[], 15]);

      const result = await service.getSubscriptionHistory(
        companyId,
        undefined,
        page,
        limit,
      );

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(3);
      expect(mockHistoryRepository.findAndCount).toHaveBeenCalledWith({
        where: { companyId },
        relations: ['plan', 'subscription'],
        order: { createdAt: 'DESC' },
        skip: 5, // (page - 1) * limit
        take: 5,
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should log cancellation in history', async () => {
      const subscriptionId = 'sub-123';
      const reason = 'User requested cancellation';
      const mockSubscription = {
        id: subscriptionId,
        companyId: 'company-123',
        planId: 'plan-123',
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date(),
      };

      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.save.mockResolvedValue({
        ...mockSubscription,
        status: SubscriptionStatus.CANCELLED,
      });
      mockCompanyRepository.update.mockResolvedValue({});
      mockHistoryRepository.create.mockReturnValue({});
      mockHistoryRepository.save.mockResolvedValue({});

      await service.cancelSubscription(subscriptionId, reason);

      expect(mockHistoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId,
          companyId: mockSubscription.companyId,
          planId: mockSubscription.planId,
          action: SubscriptionHistoryAction.CANCELLED,
          oldStatus: SubscriptionStatus.ACTIVE,
          newStatus: SubscriptionStatus.CANCELLED,
        }),
      );
      expect(mockHistoryRepository.save).toHaveBeenCalled();
    });
  });
});

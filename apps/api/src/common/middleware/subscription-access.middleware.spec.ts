import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionAccessMiddleware } from './subscription-access.middleware';
import {
  Subscription,
  SubscriptionStatus,
} from '../../modules/subscriptions/subscription.entity';
import { Request, Response, NextFunction } from 'express';

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

describe('SubscriptionAccessMiddleware', () => {
  let middleware: SubscriptionAccessMiddleware;
  let subscriptionRepository: Repository<Subscription>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionAccessMiddleware,
        {
          provide: getRepositoryToken(Subscription),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    middleware = module.get<SubscriptionAccessMiddleware>(
      SubscriptionAccessMiddleware,
    );
    subscriptionRepository = module.get<Repository<Subscription>>(
      getRepositoryToken(Subscription),
    );

    mockRequest = {
      method: 'GET',
      path: '/api/v1/test',
    } as Partial<Request>;

    mockResponse = {} as Partial<Response>;
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('No company context', () => {
    it('should call next() when no companyId is present', async () => {
      mockRequest.path = '/api/v1/test';

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(subscriptionRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('Whitelisted routes', () => {
    it('should bypass check for health endpoint', async () => {
      (mockRequest as any).path = '/api/v1/health';
      (mockRequest as any).companyId = 'company-123';

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(subscriptionRepository.findOne).not.toHaveBeenCalled();
    });

    it('should bypass check for auth endpoints', async () => {
      (mockRequest as any).path = '/api/v1/auth/login';
      (mockRequest as any).companyId = 'company-123';

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(subscriptionRepository.findOne).not.toHaveBeenCalled();
    });

    it('should bypass check for webhook endpoints', async () => {
      (mockRequest as any).path = '/api/v1/billing/webhooks/midtrans';
      (mockRequest as any).companyId = 'company-123';

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(subscriptionRepository.findOne).not.toHaveBeenCalled();
    });

    it('should bypass check for subscription renewal endpoint', async () => {
      (mockRequest as any).path = '/api/v1/subscriptions/renew';
      (mockRequest as any).companyId = 'company-123';

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(subscriptionRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('Active subscription', () => {
    it('should allow all operations for active subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/products';

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.ACTIVE,
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { companyId: 'company-123' },
        order: { createdAt: 'DESC' },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow all operations for trial subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'DELETE';
      mockRequest.path = '/api/v1/products/123';

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.TRIAL,
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow all operations for pending subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'PUT';
      mockRequest.path = '/api/v1/products/123';

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.PENDING,
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Expired subscription (grace period)', () => {
    it('should allow GET requests for expired subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/products';

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.EXPIRED,
        gracePeriodEndDate: new Date('2026-04-10'),
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should block POST requests for expired subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/products';

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.EXPIRED,
        gracePeriodEndDate: new Date('2026-04-10'),
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block PUT requests for expired subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'PUT';
      mockRequest.path = '/api/v1/products/123';

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.EXPIRED,
        gracePeriodEndDate: new Date('2026-04-10'),
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block PATCH requests for expired subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'PATCH';
      mockRequest.path = '/api/v1/products/123';

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.EXPIRED,
        gracePeriodEndDate: new Date('2026-04-10'),
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block DELETE requests for expired subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'DELETE';
      mockRequest.path = '/api/v1/products/123';

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.EXPIRED,
        gracePeriodEndDate: new Date('2026-04-10'),
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Suspended subscription', () => {
    it('should block all requests for suspended subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/products';

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.SUSPENDED,
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block POST requests for suspended subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/products';

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.SUSPENDED,
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Cancelled subscription', () => {
    it('should block all requests for cancelled subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/products';

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.CANCELLED,
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Past due subscription', () => {
    it('should allow GET requests for past due subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/products';

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.PAST_DUE,
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should block write requests for past due subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/products';

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.PAST_DUE,
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('No subscription found', () => {
    it('should block access when no subscription exists', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/products';

      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      await expect(
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error messages', () => {
    it('should provide appropriate error message for expired subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'POST';
      mockRequest.path = '/api/v1/products';

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2); // 2 days from now

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.EXPIRED,
        gracePeriodEndDate: futureDate,
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      try {
        await middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = error.response;
        expect(response.error).toBe('SUBSCRIPTION_EXPIRED_GRACE_PERIOD');
        expect(response.renewalUrl).toBe('/subscriptions/renew');
        expect(response.daysRemaining).toBeGreaterThanOrEqual(1);
        expect(response.message).toContain('grace period');
      }
    });

    it('should provide appropriate error message for suspended subscription', async () => {
      (mockRequest as any).companyId = 'company-123';
      mockRequest.method = 'GET';
      mockRequest.path = '/api/v1/products';

      const mockSubscription = {
        id: 'sub-123',
        companyId: 'company-123',
        status: SubscriptionStatus.SUSPENDED,
      } as Subscription;

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      try {
        await middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = error.response;
        expect(response.error).toBe('SUBSCRIPTION_SUSPENDED');
        expect(response.renewalUrl).toBe('/subscriptions/renew');
      }
    });
  });
});

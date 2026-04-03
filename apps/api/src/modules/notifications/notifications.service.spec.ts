import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationChannel,
  NotificationType,
} from './notification.entity';
import { Subscription, SubscriptionStatus } from '../subscriptions/subscription.entity';
import { QUEUE_NAMES } from '../../common/queue/queues.constants';

describe('NotificationsService - Renewal Notifications', () => {
  let service: NotificationsService;
  let notificationRepository: Repository<Notification>;
  let emailQueue: any;

  const mockNotificationRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEmailQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.EMAIL),
          useValue: mockEmailQueue,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    emailQueue = module.get(getQueueToken(QUEUE_NAMES.EMAIL));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendRenewalReminder', () => {
    it('should send renewal reminder for subscription expiring in 7 days', async () => {
      const subscription: Subscription = {
        id: 'sub-123',
        companyId: 'company-123',
        planId: 'plan-123',
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date('2026-04-15'),
      } as Subscription;

      mockNotificationRepository.findOne.mockResolvedValue(null);
      mockNotificationRepository.create.mockReturnValue({
        id: 'notif-123',
        subscriptionId: subscription.id,
      });
      mockNotificationRepository.save.mockResolvedValue({
        id: 'notif-123',
      });

      await service.sendRenewalReminder(subscription, 7, [
        NotificationChannel.EMAIL,
      ]);

      expect(mockNotificationRepository.findOne).toHaveBeenCalled();
      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: subscription.companyId,
          subscriptionId: subscription.id,
          type: NotificationType.SUBSCRIPTION_EXPIRING,
          channel: NotificationChannel.EMAIL,
        }),
      );
      expect(mockNotificationRepository.save).toHaveBeenCalled();
      expect(mockEmailQueue.add).toHaveBeenCalled();
    });

    it('should not send duplicate notification if already sent today', async () => {
      const subscription: Subscription = {
        id: 'sub-123',
        companyId: 'company-123',
        planId: 'plan-123',
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date('2026-04-15'),
      } as Subscription;

      mockNotificationRepository.findOne.mockResolvedValue({
        id: 'existing-notif',
        subscriptionId: subscription.id,
      });

      await service.sendRenewalReminder(subscription, 7, [
        NotificationChannel.EMAIL,
      ]);

      expect(mockNotificationRepository.findOne).toHaveBeenCalled();
      expect(mockNotificationRepository.create).not.toHaveBeenCalled();
      expect(mockNotificationRepository.save).not.toHaveBeenCalled();
    });

    it('should send notification for expired subscription (day 0)', async () => {
      const subscription: Subscription = {
        id: 'sub-123',
        companyId: 'company-123',
        planId: 'plan-123',
        status: SubscriptionStatus.EXPIRED,
        endDate: new Date('2026-04-08'),
      } as Subscription;

      mockNotificationRepository.findOne.mockResolvedValue(null);
      mockNotificationRepository.create.mockReturnValue({
        id: 'notif-123',
        subscriptionId: subscription.id,
      });
      mockNotificationRepository.save.mockResolvedValue({
        id: 'notif-123',
      });

      await service.sendRenewalReminder(subscription, 0, [
        NotificationChannel.EMAIL,
      ]);

      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.SUBSCRIPTION_EXPIRED,
          title: 'Subscription Anda telah berakhir',
        }),
      );
    });

    it('should send notification for suspended subscription (day -3)', async () => {
      const subscription: Subscription = {
        id: 'sub-123',
        companyId: 'company-123',
        planId: 'plan-123',
        status: SubscriptionStatus.SUSPENDED,
        endDate: new Date('2026-04-05'),
      } as Subscription;

      mockNotificationRepository.findOne.mockResolvedValue(null);
      mockNotificationRepository.create.mockReturnValue({
        id: 'notif-123',
        subscriptionId: subscription.id,
      });
      mockNotificationRepository.save.mockResolvedValue({
        id: 'notif-123',
      });

      await service.sendRenewalReminder(subscription, -3, [
        NotificationChannel.EMAIL,
      ]);

      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.SUBSCRIPTION_SUSPENDED,
          title: 'Akun Anda telah disuspend',
        }),
      );
    });

    it('should support multiple channels', async () => {
      const subscription: Subscription = {
        id: 'sub-123',
        companyId: 'company-123',
        planId: 'plan-123',
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date('2026-04-15'),
      } as Subscription;

      mockNotificationRepository.findOne.mockResolvedValue(null);
      mockNotificationRepository.create.mockReturnValue({
        id: 'notif-123',
        subscriptionId: subscription.id,
      });
      mockNotificationRepository.save.mockResolvedValue({
        id: 'notif-123',
      });

      await service.sendRenewalReminder(subscription, 7, [
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ]);

      expect(mockNotificationRepository.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationRepository.save).toHaveBeenCalledTimes(2);
    });
  });
});

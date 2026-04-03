import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionPlan } from './subscription-plan.entity';
import { SubscriptionDuration } from './subscription-duration.entity';

describe('SubscriptionPlansService', () => {
  let service: SubscriptionPlansService;
  let planRepository: Repository<SubscriptionPlan>;
  let durationRepository: Repository<SubscriptionDuration>;

  const mockPlanRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    count: jest.fn(),
  };

  const mockDurationRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionPlansService,
        {
          provide: getRepositoryToken(SubscriptionPlan),
          useValue: mockPlanRepository,
        },
        {
          provide: getRepositoryToken(SubscriptionDuration),
          useValue: mockDurationRepository,
        },
      ],
    }).compile();

    service = module.get<SubscriptionPlansService>(SubscriptionPlansService);
    planRepository = module.get<Repository<SubscriptionPlan>>(
      getRepositoryToken(SubscriptionPlan),
    );
    durationRepository = module.get<Repository<SubscriptionDuration>>(
      getRepositoryToken(SubscriptionDuration),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDurationPrice', () => {
    it('should calculate price with 0% discount for 1 month', () => {
      const basePrice = 250000;
      const result = service.calculateDurationPrice(basePrice, 1);

      expect(result).toEqual({
        subtotal: 250000,
        discountPercentage: 0,
        discountAmount: 0,
        finalPrice: 250000,
      });
    });

    it('should calculate price with 5% discount for 3 months', () => {
      const basePrice = 250000;
      const result = service.calculateDurationPrice(basePrice, 3);

      expect(result).toEqual({
        subtotal: 750000,
        discountPercentage: 5,
        discountAmount: 37500,
        finalPrice: 712500,
      });
    });

    it('should calculate price with 10% discount for 6 months', () => {
      const basePrice = 250000;
      const result = service.calculateDurationPrice(basePrice, 6);

      expect(result).toEqual({
        subtotal: 1500000,
        discountPercentage: 10,
        discountAmount: 150000,
        finalPrice: 1350000,
      });
    });

    it('should calculate price with 20% discount for 12 months', () => {
      const basePrice = 250000;
      const result = service.calculateDurationPrice(basePrice, 12);

      expect(result).toEqual({
        subtotal: 3000000,
        discountPercentage: 20,
        discountAmount: 600000,
        finalPrice: 2400000,
      });
    });

    it('should handle different base prices correctly', () => {
      const basePrice = 599000;
      const result = service.calculateDurationPrice(basePrice, 6);

      expect(result).toEqual({
        subtotal: 3594000,
        discountPercentage: 10,
        discountAmount: 359400,
        finalPrice: 3234600,
      });
    });

    it('should return 0% discount for unsupported duration', () => {
      const basePrice = 250000;
      const result = service.calculateDurationPrice(basePrice, 2);

      expect(result).toEqual({
        subtotal: 500000,
        discountPercentage: 0,
        discountAmount: 0,
        finalPrice: 500000,
      });
    });
  });

  describe('createOrUpdateDuration', () => {
    it('should create new duration if not exists', async () => {
      const mockPlan = {
        id: 'plan-1',
        priceMonthly: 250000,
      } as SubscriptionPlan;

      const mockDuration = {
        id: 'duration-1',
        planId: 'plan-1',
        durationMonths: 3,
        discountPercentage: 5,
        finalPrice: 712500,
      } as SubscriptionDuration;

      mockPlanRepository.findOne.mockResolvedValue(mockPlan);
      mockDurationRepository.findOne.mockResolvedValue(null);
      mockDurationRepository.create.mockReturnValue(mockDuration);
      mockDurationRepository.save.mockResolvedValue(mockDuration);

      const result = await service.createOrUpdateDuration('plan-1', 3);

      expect(result).toEqual(mockDuration);
      expect(mockDurationRepository.create).toHaveBeenCalledWith({
        planId: 'plan-1',
        durationMonths: 3,
        discountPercentage: 5,
        finalPrice: 712500,
      });
      expect(mockDurationRepository.save).toHaveBeenCalled();
    });

    it('should update existing duration', async () => {
      const mockPlan = {
        id: 'plan-1',
        priceMonthly: 250000,
      } as SubscriptionPlan;

      const existingDuration = {
        id: 'duration-1',
        planId: 'plan-1',
        durationMonths: 3,
        discountPercentage: 3,
        finalPrice: 700000,
      } as SubscriptionDuration;

      const updatedDuration = {
        ...existingDuration,
        discountPercentage: 5,
        finalPrice: 712500,
      };

      mockPlanRepository.findOne.mockResolvedValue(mockPlan);
      mockDurationRepository.findOne.mockResolvedValue(existingDuration);
      mockDurationRepository.save.mockResolvedValue(updatedDuration);

      const result = await service.createOrUpdateDuration('plan-1', 3);

      expect(result.discountPercentage).toBe(5);
      expect(result.finalPrice).toBe(712500);
      expect(mockDurationRepository.save).toHaveBeenCalled();
    });
  });

  describe('getDurationsByPlan', () => {
    it('should return all durations for a plan', async () => {
      const mockDurations = [
        { durationMonths: 1, finalPrice: 250000 },
        { durationMonths: 3, finalPrice: 712500 },
        { durationMonths: 6, finalPrice: 1350000 },
        { durationMonths: 12, finalPrice: 2400000 },
      ] as SubscriptionDuration[];

      mockDurationRepository.find.mockResolvedValue(mockDurations);

      const result = await service.getDurationsByPlan('plan-1');

      expect(result).toEqual(mockDurations);
      expect(mockDurationRepository.find).toHaveBeenCalledWith({
        where: { planId: 'plan-1' },
        order: { durationMonths: 'ASC' },
      });
    });
  });

  describe('findAllActiveWithDurations', () => {
    it('should return active plans with durations', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          name: 'Starter',
          isActive: true,
          durations: [
            { durationMonths: 1, finalPrice: 250000 },
            { durationMonths: 3, finalPrice: 712500 },
          ],
        },
      ] as SubscriptionPlan[];

      mockPlanRepository.find.mockResolvedValue(mockPlans);

      const result = await service.findAllActiveWithDurations();

      expect(result).toEqual(mockPlans);
      expect(mockPlanRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['durations'],
        order: { sortOrder: 'ASC' },
      });
    });
  });
});

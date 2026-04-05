import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { CompaniesService } from './companies.service';
import { Company } from './company.entity';
import { UpdateCompanyDto } from './dto/update-company.dto';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let repository: Repository<Company>;

  const mockCompany: Partial<Company> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Company',
    email: 'test@company.com',
    slug: 'test-company',
    phone: '081234567890',
    businessType: 'retail',
    taxId: '01.234.567.8-901.000',
    logoUrl: 'https://example.com/logo.png',
    status: 'active',
    primaryColor: '#10b981',
    isEmailVerified: false,
  };

  const COMPANY_ID = '123e4567-e89b-12d3-a456-426614174000';

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: getRepositoryToken(Company),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    repository = module.get<Repository<Company>>(getRepositoryToken(Company));

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return company profile with relations', async () => {
      mockRepository.findOne.mockResolvedValue(mockCompany);

      const result = await service.getProfile(COMPANY_ID);

      expect(result).toEqual(mockCompany);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: COMPANY_ID },
        relations: ['currentPlan'],
      });
    });

    it('should throw NotFoundException when company not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfile('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when companyId is empty', async () => {
      await expect(service.getProfile('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateProfile', () => {
    const updateDto: UpdateCompanyDto = {
      name: 'Updated Company',
      phone: '089876543210',
    };

    it('should update company profile successfully', async () => {
      const updatedCompany = { ...mockCompany, ...updateDto };
      mockRepository.findOne.mockResolvedValue(mockCompany);
      mockRepository.save.mockResolvedValue(updatedCompany);

      const result = await service.updateProfile(COMPANY_ID, updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(result.phone).toBe(updateDto.phone);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      const dtoWithEmail: UpdateCompanyDto = {
        email: 'existing@company.com',
      };

      mockRepository.findOne
        .mockResolvedValueOnce(mockCompany) // First call for getProfile
        .mockResolvedValueOnce({ id: 'different-id', email: dtoWithEmail.email }); // Second call for email check

      await expect(
        service.updateProfile(COMPANY_ID, dtoWithEmail),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating to same email', async () => {
      const dtoWithSameEmail: UpdateCompanyDto = {
        email: mockCompany.email,
      };

      mockRepository.findOne.mockResolvedValue(mockCompany);
      mockRepository.save.mockResolvedValue(mockCompany);

      const result = await service.updateProfile(
        COMPANY_ID,
        dtoWithSameEmail,
      );

      expect(result).toBeDefined();
      // Should not check for email uniqueness since it's the same
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid business type', async () => {
      const dtoWithInvalidType: UpdateCompanyDto = {
        businessType: 'invalid-type' as any,
      };

      mockRepository.findOne.mockResolvedValue(mockCompany);

      await expect(
        service.updateProfile(COMPANY_ID, dtoWithInvalidType),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid hex color', async () => {
      const dtoWithInvalidColor: UpdateCompanyDto = {
        primaryColor: 'not-a-color',
      };

      mockRepository.findOne.mockResolvedValue(mockCompany);

      await expect(
        service.updateProfile(COMPANY_ID, dtoWithInvalidColor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid hex color', async () => {
      const dtoWithValidColor: UpdateCompanyDto = {
        primaryColor: '#FF5733',
      };

      const updatedCompany = { ...mockCompany, ...dtoWithValidColor };
      mockRepository.findOne.mockResolvedValue(mockCompany);
      mockRepository.save.mockResolvedValue(updatedCompany);

      const result = await service.updateProfile(
        COMPANY_ID,
        dtoWithValidColor,
      );

      expect(result.primaryColor).toBe('#FF5733');
    });
  });

  describe('findById', () => {
    it('should return company when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockCompany);

      const result = await service.findById(COMPANY_ID);

      expect(result).toEqual(mockCompany);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: COMPANY_ID },
      });
    });

    it('should return null when company not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return company when found by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockCompany);

      const result = await service.findByEmail(mockCompany.email!);

      expect(result).toEqual(mockCompany);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockCompany.email },
      });
    });

    it('should return null when company not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@company.com');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update company status successfully', async () => {
      const newStatus = 'suspended';
      const updatedCompany = { ...mockCompany, status: newStatus };

      mockRepository.findOne.mockResolvedValue(mockCompany);
      mockRepository.save.mockResolvedValue(updatedCompany);

      const result = await service.updateStatus(COMPANY_ID, newStatus);

      expect(result.status).toBe(newStatus);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid status', async () => {
      mockRepository.findOne.mockResolvedValue(mockCompany);

      await expect(
        service.updateStatus(COMPANY_ID, 'invalid-status'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept all valid statuses', async () => {
      const validStatuses = ['pending', 'active', 'suspended', 'cancelled'];

      for (const status of validStatuses) {
        const updatedCompany = { ...mockCompany, status };
        mockRepository.findOne.mockResolvedValue(mockCompany);
        mockRepository.save.mockResolvedValue(updatedCompany);

        const result = await service.updateStatus(COMPANY_ID, status);
        expect(result.status).toBe(status);
      }
    });
  });

  describe('updateSubscriptionInfo', () => {
    it('should update subscription info successfully', async () => {
      const subscriptionData = {
        currentPlanId: 'plan-123',
        subscriptionStatus: 'active',
        subscriptionEndsAt: new Date('2026-12-31'),
      };

      const updatedCompany = { ...mockCompany, ...subscriptionData };
      mockRepository.findOne.mockResolvedValue(mockCompany);
      mockRepository.save.mockResolvedValue(updatedCompany);

      const result = await service.updateSubscriptionInfo(
        COMPANY_ID,
        subscriptionData,
      );

      expect(result.currentPlanId).toBe(subscriptionData.currentPlanId);
      expect(result.subscriptionStatus).toBe(subscriptionData.subscriptionStatus);
      expect(result.subscriptionEndsAt).toBe(subscriptionData.subscriptionEndsAt);
    });

    it('should update only provided fields', async () => {
      const subscriptionData = {
        subscriptionStatus: 'expired',
      };

      const updatedCompany = { ...mockCompany, ...subscriptionData };
      mockRepository.findOne.mockResolvedValue(mockCompany);
      mockRepository.save.mockResolvedValue(updatedCompany);

      const result = await service.updateSubscriptionInfo(
        COMPANY_ID,
        subscriptionData,
      );

      expect(result.subscriptionStatus).toBe('expired');
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const now = new Date();
      const updatedCompany = {
        ...mockCompany,
        isEmailVerified: true,
        emailVerifiedAt: now,
      };

      mockRepository.findOne.mockResolvedValue(mockCompany);
      mockRepository.save.mockResolvedValue(updatedCompany);

      const result = await service.verifyEmail(COMPANY_ID);

      expect(result.isEmailVerified).toBe(true);
      expect(result.emailVerifiedAt).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('getSettings', () => {
    it('should return company settings from metadata', async () => {
      const companyWithSettings = {
        ...mockCompany,
        metadata: {
          taxSettings: { defaultTaxRate: 11 },
          receiptSettings: { showLogo: true },
        },
      };
      mockRepository.findOne.mockResolvedValue(companyWithSettings);

      const result = await service.getSettings(COMPANY_ID);

      expect(result.taxSettings).toEqual({ defaultTaxRate: 11 });
      expect(result.receiptSettings).toEqual({ showLogo: true });
      expect(result.paymentMethodPreferences).toEqual({});
      expect(result.notificationPreferences).toEqual({});
      expect(result.integrationSettings).toEqual({});
      expect(result.autoBackupEnabled).toBe(false);
      expect(result.backupFrequencyDays).toBe(7);
    });

    it('should return default settings when metadata is empty', async () => {
      const companyWithEmptyMetadata = {
        ...mockCompany,
        metadata: {},
      };
      mockRepository.findOne.mockResolvedValue(companyWithEmptyMetadata);

      const result = await service.getSettings(COMPANY_ID);

      expect(result.taxSettings).toEqual({});
      expect(result.receiptSettings).toEqual({});
      expect(result.autoBackupEnabled).toBe(false);
      expect(result.backupFrequencyDays).toBe(7);
    });
  });

  describe('updateSettings', () => {
    it('should update company settings successfully', async () => {
      const companyWithMetadata = {
        ...mockCompany,
        metadata: { existingKey: 'value' },
      };
      mockRepository.findOne.mockResolvedValue(companyWithMetadata);

      const newSettings = {
        taxSettings: { defaultTaxRate: 11 },
        receiptSettings: { showLogo: true },
      };

      const updatedCompany = {
        ...companyWithMetadata,
        metadata: { ...companyWithMetadata.metadata, ...newSettings },
      };
      mockRepository.save.mockResolvedValue(updatedCompany);

      const result = await service.updateSettings(COMPANY_ID, newSettings);

      expect(result.metadata).toEqual({
        existingKey: 'value',
        taxSettings: { defaultTaxRate: 11 },
        receiptSettings: { showLogo: true },
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should merge new settings with existing metadata', async () => {
      const companyWithMetadata = {
        ...mockCompany,
        metadata: {
          taxSettings: { defaultTaxRate: 10 },
          otherSetting: 'keep this',
        },
      };
      mockRepository.findOne.mockResolvedValue(companyWithMetadata);

      const newSettings = {
        taxSettings: { defaultTaxRate: 11 },
      };

      const updatedCompany = {
        ...companyWithMetadata,
        metadata: { ...companyWithMetadata.metadata, ...newSettings },
      };
      mockRepository.save.mockResolvedValue(updatedCompany);

      const result = await service.updateSettings(COMPANY_ID, newSettings);

      expect(result.metadata.otherSetting).toBe('keep this');
      expect(result.metadata.taxSettings.defaultTaxRate).toBe(11);
    });
  });

  /**
   * COMPANY ADMIN METHODS TESTS
   * Testing member management functionality for MonetraPOS administrators
   */

  describe('findAllMembers', () => {
    it('should return paginated list of member companies', async () => {
      const filters = { page: 1, limit: 10 };
      const mockCompanies = [
        { id: '1', name: 'Company 1', email: 'company1@test.com' },
        { id: '2', name: 'Company 2', email: 'company2@test.com' },
      ];

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockCompanies, 2]),
      };

      mockRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.findAllMembers(filters);

      expect(result.data).toEqual(mockCompanies);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by search term', async () => {
      const filters = { page: 1, limit: 10, search: 'test' };

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      await service.findAllMembers(filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('company.name LIKE :search'),
        expect.objectContaining({ search: '%test%' }),
      );
    });

    it('should filter by status', async () => {
      const filters = { page: 1, limit: 10, status: 'active' };

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      await service.findAllMembers(filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'company.status = :status',
        { status: 'active' },
      );
    });
  });

  describe('getMemberDetails', () => {
    it('should return detailed member company information', async () => {
      mockRepository.findOne.mockResolvedValue(mockCompany);

      const result = await service.getMemberDetails(COMPANY_ID);

      expect(result).toHaveProperty('id', COMPANY_ID);
      expect(result).toHaveProperty('statistics');
      expect(result.statistics).toHaveProperty('totalStores');
      expect(result.statistics).toHaveProperty('totalProducts');
      expect(result.statistics).toHaveProperty('totalUsers');
    });

    it('should throw NotFoundException when member not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getMemberDetails('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMemberStatus', () => {
    it('should update member status to suspended', async () => {
      const dto = { status: 'suspended', reason: 'Payment overdue' };
      const updatedCompany = {
        ...mockCompany,
        status: 'suspended',
        metadata: {
          statusChangeReason: 'Payment overdue',
          statusChangedAt: expect.any(String),
        },
      };

      mockRepository.findOne.mockResolvedValue(mockCompany);
      mockRepository.save.mockResolvedValue(updatedCompany);

      const result = await service.updateMemberStatus(COMPANY_ID, dto);

      expect(result.status).toBe('suspended');
      expect(result.metadata.statusChangeReason).toBe('Payment overdue');
    });

    it('should update member status to active', async () => {
      const dto = { status: 'active' };
      const updatedCompany = { ...mockCompany, status: 'active' };

      mockRepository.findOne.mockResolvedValue(mockCompany);
      mockRepository.save.mockResolvedValue(updatedCompany);

      const result = await service.updateMemberStatus(COMPANY_ID, dto);

      expect(result.status).toBe('active');
    });

    it('should throw BadRequestException for invalid status', async () => {
      const dto = { status: 'invalid' };

      mockRepository.findOne.mockResolvedValue(mockCompany);

      await expect(
        service.updateMemberStatus(COMPANY_ID, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when member not found', async () => {
      const dto = { status: 'suspended' };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateMemberStatus('non-existent', dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMemberAnalytics', () => {
    it('should return comprehensive member analytics', async () => {
      mockRepository.count = jest
        .fn()
        .mockResolvedValueOnce(100) // totalMembers
        .mockResolvedValueOnce(85) // activeMembers
        .mockResolvedValueOnce(10) // suspendedMembers
        .mockResolvedValueOnce(5) // cancelledMembers
        .mockResolvedValueOnce(80) // activeSubscriptions
        .mockResolvedValueOnce(5) // expiredSubscriptions
        .mockResolvedValueOnce(15); // recentMembers

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { businessType: 'fnb', count: '40' },
          { businessType: 'retail', count: '35' },
          { businessType: 'laundry', count: '15' },
          { businessType: 'other', count: '10' },
        ]),
      };

      repository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.getMemberAnalytics();

      expect(result.overview).toEqual({
        totalMembers: 100,
        activeMembers: 85,
        suspendedMembers: 10,
        cancelledMembers: 5,
        activeSubscriptions: 80,
        expiredSubscriptions: 5,
        recentMembers: 15,
      });

      expect(result.membersByBusinessType).toEqual({
        fnb: 40,
        retail: 35,
        laundry: 15,
        other: 10,
      });

      expect(result.revenue).toHaveProperty('totalRevenue');
      expect(result.revenue).toHaveProperty('monthlyRecurringRevenue');
      expect(result.revenue).toHaveProperty('averageRevenuePerMember');
    });
  });

  describe('softDeleteMember', () => {
    it('should soft delete a member company', async () => {
      const deletedCompany = {
        ...mockCompany,
        deletedAt: new Date(),
      };

      mockRepository.findOne
        .mockResolvedValueOnce(mockCompany)
        .mockResolvedValueOnce(deletedCompany);
      mockRepository.softDelete = jest.fn().mockResolvedValue({ affected: 1 });

      const result = await service.softDeleteMember(COMPANY_ID);

      expect(result.deletedAt).toBeDefined();
      expect(mockRepository.softDelete).toHaveBeenCalledWith(COMPANY_ID);
    });

    it('should throw NotFoundException when member not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.softDeleteMember('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

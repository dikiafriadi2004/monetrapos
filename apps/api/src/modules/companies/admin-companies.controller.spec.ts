import { Test, TestingModule } from '@nestjs/testing';
import { AdminCompaniesController } from './admin-companies.controller';
import { CompaniesService } from './companies.service';
import { CompanyFilterDto, UpdateCompanyStatusDto } from './dto';

describe('AdminCompaniesController', () => {
  let controller: AdminCompaniesController;
  let service: CompaniesService;

  const mockCompaniesService = {
    findAllMembers: jest.fn(),
    getMemberDetails: jest.fn(),
    updateMemberStatus: jest.fn(),
    getMemberAnalytics: jest.fn(),
    softDeleteMember: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCompaniesController],
      providers: [
        {
          provide: CompaniesService,
          useValue: mockCompaniesService,
        },
      ],
    }).compile();

    controller = module.get<AdminCompaniesController>(AdminCompaniesController);
    service = module.get<CompaniesService>(CompaniesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listMembers', () => {
    it('should return paginated list of member companies', async () => {
      const filters: CompanyFilterDto = {
        page: 1,
        limit: 10,
      };

      const mockResult = {
        data: [
          {
            id: 'company-1',
            name: 'Test Company 1',
            email: 'test1@example.com',
            status: 'active',
            subscriptionStatus: 'active',
          },
          {
            id: 'company-2',
            name: 'Test Company 2',
            email: 'test2@example.com',
            status: 'active',
            subscriptionStatus: 'active',
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      };

      mockCompaniesService.findAllMembers.mockResolvedValue(mockResult);

      const result = await controller.listMembers(filters);

      expect(result).toEqual(mockResult);
      expect(service.findAllMembers).toHaveBeenCalledWith(filters);
    });

    it('should filter by search term', async () => {
      const filters: CompanyFilterDto = {
        page: 1,
        limit: 10,
        search: 'test',
      };

      mockCompaniesService.findAllMembers.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await controller.listMembers(filters);

      expect(service.findAllMembers).toHaveBeenCalledWith(filters);
    });

    it('should filter by status', async () => {
      const filters: CompanyFilterDto = {
        page: 1,
        limit: 10,
        status: 'active',
      };

      mockCompaniesService.findAllMembers.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await controller.listMembers(filters);

      expect(service.findAllMembers).toHaveBeenCalledWith(filters);
    });
  });

  describe('getMemberDetails', () => {
    it('should return member company details', async () => {
      const companyId = 'company-123';
      const mockDetails = {
        id: companyId,
        name: 'Test Company',
        email: 'test@example.com',
        status: 'active',
        subscriptionStatus: 'active',
        statistics: {
          totalStores: 5,
          totalProducts: 100,
          totalUsers: 10,
          totalTransactions: 500,
          totalRevenue: 10000000,
        },
      };

      mockCompaniesService.getMemberDetails.mockResolvedValue(mockDetails);

      const result = await controller.getMemberDetails(companyId);

      expect(result).toEqual(mockDetails);
      expect(service.getMemberDetails).toHaveBeenCalledWith(companyId);
    });
  });

  describe('updateMemberStatus', () => {
    it('should update member company status to suspended', async () => {
      const companyId = 'company-123';
      const dto: UpdateCompanyStatusDto = {
        status: 'suspended',
        reason: 'Payment overdue',
      };

      const mockUpdatedCompany = {
        id: companyId,
        name: 'Test Company',
        status: 'suspended',
      };

      mockCompaniesService.updateMemberStatus.mockResolvedValue(mockUpdatedCompany);

      const result = await controller.updateMemberStatus(companyId, dto);

      expect(result).toEqual(mockUpdatedCompany);
      expect(service.updateMemberStatus).toHaveBeenCalledWith(companyId, dto);
    });

    it('should update member company status to active', async () => {
      const companyId = 'company-123';
      const dto: UpdateCompanyStatusDto = {
        status: 'active',
        reason: 'Payment received',
      };

      const mockUpdatedCompany = {
        id: companyId,
        name: 'Test Company',
        status: 'active',
      };

      mockCompaniesService.updateMemberStatus.mockResolvedValue(mockUpdatedCompany);

      const result = await controller.updateMemberStatus(companyId, dto);

      expect(result).toEqual(mockUpdatedCompany);
      expect(service.updateMemberStatus).toHaveBeenCalledWith(companyId, dto);
    });
  });

  describe('getMemberAnalytics', () => {
    it('should return member analytics overview', async () => {
      const mockAnalytics = {
        overview: {
          totalMembers: 100,
          activeMembers: 85,
          suspendedMembers: 10,
          cancelledMembers: 5,
          activeSubscriptions: 80,
          expiredSubscriptions: 5,
          recentMembers: 15,
        },
        membersByBusinessType: {
          fnb: 40,
          retail: 35,
          laundry: 15,
          other: 10,
        },
        revenue: {
          totalRevenue: 50000000,
          monthlyRecurringRevenue: 5000000,
          averageRevenuePerMember: 500000,
        },
      };

      mockCompaniesService.getMemberAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getMemberAnalytics();

      expect(result).toEqual(mockAnalytics);
      expect(service.getMemberAnalytics).toHaveBeenCalled();
    });
  });

  describe('deleteMember', () => {
    it('should soft delete a member company', async () => {
      const companyId = 'company-123';
      const mockDeletedCompany = {
        id: companyId,
        name: 'Test Company',
        deletedAt: new Date(),
      };

      mockCompaniesService.softDeleteMember.mockResolvedValue(mockDeletedCompany);

      const result = await controller.deleteMember(companyId);

      expect(result).toEqual(mockDeletedCompany);
      expect(service.softDeleteMember).toHaveBeenCalledWith(companyId);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
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

  const mockCompanyAdminRequest = {
    user: {
      id: 'admin-123',
      type: 'company_admin',
      email: 'admin@monetrapos.com',
    },
  };

  const mockMemberRequest = {
    user: {
      id: 'member-123',
      type: 'member',
      companyId: 'company-123',
      email: 'member@example.com',
    },
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

      const result = await controller.listMembers(mockCompanyAdminRequest, filters);

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

      await controller.listMembers(mockCompanyAdminRequest, filters);

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

      await controller.listMembers(mockCompanyAdminRequest, filters);

      expect(service.findAllMembers).toHaveBeenCalledWith(filters);
    });

    it('should throw UnauthorizedException if not company admin', async () => {
      const filters: CompanyFilterDto = { page: 1, limit: 10 };

      await expect(
        controller.listMembers(mockMemberRequest, filters),
      ).rejects.toThrow(UnauthorizedException);

      expect(service.findAllMembers).not.toHaveBeenCalled();
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

      const result = await controller.getMemberDetails(
        mockCompanyAdminRequest,
        companyId,
      );

      expect(result).toEqual(mockDetails);
      expect(service.getMemberDetails).toHaveBeenCalledWith(companyId);
    });

    it('should throw UnauthorizedException if not company admin', async () => {
      await expect(
        controller.getMemberDetails(mockMemberRequest, 'company-123'),
      ).rejects.toThrow(UnauthorizedException);

      expect(service.getMemberDetails).not.toHaveBeenCalled();
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

      mockCompaniesService.updateMemberStatus.mockResolvedValue(
        mockUpdatedCompany,
      );

      const result = await controller.updateMemberStatus(
        mockCompanyAdminRequest,
        companyId,
        dto,
      );

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

      mockCompaniesService.updateMemberStatus.mockResolvedValue(
        mockUpdatedCompany,
      );

      const result = await controller.updateMemberStatus(
        mockCompanyAdminRequest,
        companyId,
        dto,
      );

      expect(result).toEqual(mockUpdatedCompany);
      expect(service.updateMemberStatus).toHaveBeenCalledWith(companyId, dto);
    });

    it('should throw UnauthorizedException if not company admin', async () => {
      const dto: UpdateCompanyStatusDto = {
        status: 'suspended',
      };

      await expect(
        controller.updateMemberStatus(mockMemberRequest, 'company-123', dto),
      ).rejects.toThrow(UnauthorizedException);

      expect(service.updateMemberStatus).not.toHaveBeenCalled();
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

      const result = await controller.getMemberAnalytics(mockCompanyAdminRequest);

      expect(result).toEqual(mockAnalytics);
      expect(service.getMemberAnalytics).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if not company admin', async () => {
      await expect(
        controller.getMemberAnalytics(mockMemberRequest),
      ).rejects.toThrow(UnauthorizedException);

      expect(service.getMemberAnalytics).not.toHaveBeenCalled();
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

      mockCompaniesService.softDeleteMember.mockResolvedValue(
        mockDeletedCompany,
      );

      const result = await controller.deleteMember(
        mockCompanyAdminRequest,
        companyId,
      );

      expect(result).toEqual(mockDeletedCompany);
      expect(service.softDeleteMember).toHaveBeenCalledWith(companyId);
    });

    it('should throw UnauthorizedException if not company admin', async () => {
      await expect(
        controller.deleteMember(mockMemberRequest, 'company-123'),
      ).rejects.toThrow(UnauthorizedException);

      expect(service.softDeleteMember).not.toHaveBeenCalled();
    });
  });
});

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThanOrEqual } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Company } from './company.entity';
import { User, UserRole } from '../users/user.entity';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Get company profile by ID
   * @param companyId - Company UUID
   * @returns Company entity
   * @throws NotFoundException if company not found
   */
  async getProfile(companyId: string): Promise<Company> {
    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: ['currentPlan'],
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  /**
   * Update company profile
   * @param companyId - Company UUID
   * @param dto - Update company DTO
   * @returns Updated company entity
   * @throws NotFoundException if company not found
   * @throws ConflictException if email already exists
   */
  async updateProfile(
    companyId: string,
    dto: UpdateCompanyDto,
  ): Promise<Company> {
    const company = await this.getProfile(companyId);

    // Check email uniqueness if email is being updated
    if (dto.email && dto.email !== company.email) {
      const existingCompany = await this.companyRepo.findOne({
        where: { email: dto.email },
      });

      if (existingCompany) {
        throw new ConflictException('Email already exists');
      }
    }

    // Validate business type if provided
    if (dto.businessType) {
      const validTypes = ['retail', 'fnb', 'laundry', 'service', 'other'];
      if (!validTypes.includes(dto.businessType)) {
        throw new BadRequestException(
          `Invalid business type. Must be one of: ${validTypes.join(', ')}`,
        );
      }
    }

    // Validate color format if provided
    if (dto.primaryColor && !this.isValidHexColor(dto.primaryColor)) {
      throw new BadRequestException(
        'Invalid color format. Must be a valid hex color (e.g., #10b981)',
      );
    }

    // Update company fields
    Object.assign(company, dto);

    return this.companyRepo.save(company);
  }

  /**
   * Find company by ID (internal use)
   * @param companyId - Company UUID
   * @returns Company entity or null
   */
  async findById(companyId: string): Promise<Company | null> {
    return this.companyRepo.findOne({
      where: { id: companyId },
    });
  }

  /**
   * Find company by email
   * @param email - Company email
   * @returns Company entity or null
   */
  async findByEmail(email: string): Promise<Company | null> {
    return this.companyRepo.findOne({
      where: { email },
    });
  }

  /**
   * Update company status
   * @param companyId - Company UUID
   * @param status - New status
   * @returns Updated company entity
   */
  async updateStatus(companyId: string, status: string): Promise<Company> {
    const company = await this.getProfile(companyId);

    const validStatuses = ['pending', 'active', 'suspended', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    company.status = status;
    return this.companyRepo.save(company);
  }

  /**
   * Update company subscription info (denormalized fields)
   * @param companyId - Company UUID
   * @param subscriptionData - Subscription data to update
   * @returns Updated company entity
   */
  async updateSubscriptionInfo(
    companyId: string,
    subscriptionData: {
      currentPlanId?: string;
      subscriptionStatus?: string;
      subscriptionEndsAt?: Date;
    },
  ): Promise<Company> {
    const company = await this.getProfile(companyId);

    if (subscriptionData.currentPlanId !== undefined) {
      company.currentPlanId = subscriptionData.currentPlanId;
    }

    if (subscriptionData.subscriptionStatus !== undefined) {
      company.subscriptionStatus = subscriptionData.subscriptionStatus;
    }

    if (subscriptionData.subscriptionEndsAt !== undefined) {
      company.subscriptionEndsAt = subscriptionData.subscriptionEndsAt;
    }

    return this.companyRepo.save(company);
  }

  /**
   * Verify email for company
   * @param companyId - Company UUID
   * @returns Updated company entity
   */
  async verifyEmail(companyId: string): Promise<Company> {
    const company = await this.getProfile(companyId);

    company.isEmailVerified = true;
    company.emailVerifiedAt = new Date();

    return this.companyRepo.save(company);
  }

  /**
   * Validate hex color format
   * @param color - Hex color string
   * @returns True if valid hex color
   */
  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  }

  /**
   * Get company settings
   * @param companyId - Company UUID
   * @returns Company settings from metadata
   */
  async getSettings(companyId: string): Promise<any> {
    const company = await this.getProfile(companyId);

    return {
      taxSettings: company.metadata?.taxSettings || {},
      receiptSettings: company.metadata?.receiptSettings || {},
      paymentMethodPreferences: company.metadata?.paymentMethodPreferences || {},
      notificationPreferences: company.metadata?.notificationPreferences || {},
      integrationSettings: company.metadata?.integrationSettings || {},
      autoBackupEnabled: company.metadata?.autoBackupEnabled || false,
      backupFrequencyDays: company.metadata?.backupFrequencyDays || 7,
    };
  }

  /**
   * Update company settings
   * @param companyId - Company UUID
   * @param settings - Settings to update
   * @returns Updated company entity
   */
  async updateSettings(companyId: string, settings: any): Promise<Company> {
    const company = await this.getProfile(companyId);

    // Merge new settings with existing metadata
    company.metadata = {
      ...company.metadata,
      ...settings,
    };

    return this.companyRepo.save(company);
  }

  /**
   * COMPANY ADMIN METHODS
   * For MonetRAPOS administrators to manage member companies
   * Requirement: 4.1.1 - Member Management
   */

  /**
   * Find all member companies with filtering and pagination
   * @param filters - Filter and pagination options
   * @returns Paginated list of companies with metadata
   */
  async findAllMembers(filters: any): Promise<any> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      businessType,
      subscriptionStatus,
    } = filters;

    const queryBuilder = this.companyRepo
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.currentPlan', 'plan')
      .select([
        'company.id',
        'company.name',
        'company.email',
        'company.phone',
        'company.businessType',
        'company.status',
        'company.subscriptionStatus',
        'company.subscriptionEndsAt',
        'company.createdAt',
        'company.city',
        'company.province',
        'plan.id',
        'plan.name',
      ]);

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(company.name LIKE :search OR company.email LIKE :search OR company.phone LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Status filter
    if (status) {
      queryBuilder.andWhere('company.status = :status', { status });
    }

    // Business type filter
    if (businessType) {
      queryBuilder.andWhere('company.businessType = :businessType', {
        businessType,
      });
    }

    // Subscription status filter
    if (subscriptionStatus) {
      queryBuilder.andWhere(
        'company.subscriptionStatus = :subscriptionStatus',
        { subscriptionStatus },
      );
    }

    // Exclude soft-deleted companies
    queryBuilder.andWhere('company.deletedAt IS NULL');

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Order by creation date (newest first)
    queryBuilder.orderBy('company.createdAt', 'DESC');

    // Execute query
    const [companies, total] = await queryBuilder.getManyAndCount();

    return {
      data: companies,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get detailed information about a member company
   * @param companyId - Company UUID
   * @returns Detailed company information with subscription and usage data
   */
  async getMemberDetails(companyId: string): Promise<any> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: ['currentPlan'],
    });

    if (!company) {
      throw new NotFoundException('Member company not found');
    }

    // Get additional statistics (you can expand this with actual queries)
    // For now, returning basic structure
    return {
      ...company,
      statistics: {
        totalStores: 0, // TODO: Query from stores table
        totalProducts: 0, // TODO: Query from products table
        totalUsers: 0, // TODO: Query from users table
        totalTransactions: 0, // TODO: Query from transactions table
        totalRevenue: 0, // TODO: Query from transactions table
      },
    };
  }

  /**
   * Update member company status (activate/suspend/cancel)
   * @param companyId - Company UUID
   * @param dto - Status update DTO
   * @returns Updated company entity
   */
  async updateMemberStatus(companyId: string, dto: any): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Member company not found');
    }

    const validStatuses = ['active', 'suspended', 'cancelled'];
    if (!validStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    company.status = dto.status;

    // Store reason in metadata if provided
    if (dto.reason) {
      company.metadata = {
        ...company.metadata,
        statusChangeReason: dto.reason,
        statusChangedAt: new Date().toISOString(),
      };
    }

    return this.companyRepo.save(company);
  }

  /**
   * Get member analytics overview
   * @returns Analytics data including total members, active subscriptions, revenue
   */
  async getMemberAnalytics(): Promise<any> {
    // Total members
    const totalMembers = await this.companyRepo.count({
      where: { deletedAt: IsNull() },
    });

    // Active members
    const activeMembers = await this.companyRepo.count({
      where: { status: 'active', deletedAt: IsNull() },
    });

    // Suspended members
    const suspendedMembers = await this.companyRepo.count({
      where: { status: 'suspended', deletedAt: IsNull() },
    });

    // Cancelled members
    const cancelledMembers = await this.companyRepo.count({
      where: { status: 'cancelled', deletedAt: IsNull() },
    });

    // Active subscriptions
    const activeSubscriptions = await this.companyRepo.count({
      where: { subscriptionStatus: 'active', deletedAt: IsNull() },
    });

    // Expired subscriptions
    const expiredSubscriptions = await this.companyRepo.count({
      where: { subscriptionStatus: 'expired', deletedAt: IsNull() },
    });

    // Members by business type
    const membersByBusinessType = await this.companyRepo
      .createQueryBuilder('company')
      .select('company.businessType', 'businessType')
      .addSelect('COUNT(*)', 'count')
      .where('company.deletedAt IS NULL')
      .groupBy('company.businessType')
      .getRawMany();

    // Recent members (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMembers = await this.companyRepo.count({
      where: {
        createdAt: MoreThanOrEqual(thirtyDaysAgo),
        deletedAt: IsNull(),
      },
    });

    return {
      overview: {
        totalMembers,
        activeMembers,
        suspendedMembers,
        cancelledMembers,
        activeSubscriptions,
        expiredSubscriptions,
        recentMembers,
      },
      membersByBusinessType: membersByBusinessType.reduce((acc, item) => {
        acc[item.businessType || 'other'] = parseInt(item.count);
        return acc;
      }, {}),
      // TODO: Add revenue metrics when payment transactions are available
      revenue: {
        totalRevenue: 0,
        monthlyRecurringRevenue: 0,
        averageRevenuePerMember: 0,
      },
    };
  }

  /**
   * Soft delete a member company
   * @param companyId - Company UUID
   * @returns Deleted company entity
   */
  async softDeleteMember(companyId: string): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Member company not found');
    }

    // Soft delete using TypeORM's soft delete
    await this.companyRepo.softDelete(companyId);

    // Return the company with deletedAt timestamp
    const deletedCompany = await this.companyRepo.findOne({
      where: { id: companyId },
      withDeleted: true,
    });

    if (!deletedCompany) {
      throw new NotFoundException('Failed to retrieve deleted company');
    }

    return deletedCompany;
  }

  async createMemberByAdmin(dto: {
    name: string;
    email: string;
    phone?: string;
    businessName?: string;
    password: string;
  }): Promise<any> {
    // Check if email already exists
    const existing = await this.companyRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const slug = (dto.businessName || dto.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now();

    const company = this.companyRepo.create({
      name: dto.businessName || dto.name,
      slug,
      email: dto.email,
      phone: dto.phone,
      status: 'active',
      subscriptionStatus: 'active',
    });
    await this.companyRepo.save(company);

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      companyId: company.id,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash: hashedPassword,
      role: UserRole.OWNER,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
    await this.userRepo.save(user);

    return { ...company, ownerName: user.name };
  }

  async updateMemberByAdmin(companyId: string, dto: {
    name?: string;
    email?: string;
    phone?: string;
    businessName?: string;
  }): Promise<Company> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Member not found');

    if (dto.businessName) company.name = dto.businessName;
    if (dto.phone) company.phone = dto.phone;

    // Update owner user info
    if (dto.name || dto.email) {
      const user = await this.userRepo.findOne({ where: { companyId, role: UserRole.OWNER } });
      if (user) {
        if (dto.name) user.name = dto.name;
        if (dto.email) user.email = dto.email;
        await this.userRepo.save(user);
      }
    }

    return this.companyRepo.save(company);
  }
}
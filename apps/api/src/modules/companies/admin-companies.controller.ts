import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';
import { CompaniesService } from './companies.service';
import { UpdateCompanyStatusDto, CompanyFilterDto } from './dto';

class CreateMemberDto {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() businessName?: string;
  @IsString() @MinLength(6) password: string;
}

/**
 * Company Admin Controller
 * For MonetraPOS administrators to manage member companies (subscribers)
 */
@ApiTags('Admin - Member Management')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/companies')
export class AdminCompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  /**
   * Create a new member company (admin only, no payment required)
   */
  @Post()
  @ApiOperation({ summary: 'Create member company (admin)' })
  @HttpCode(HttpStatus.CREATED)
  async createMember(@Request() req: any, @Body() dto: CreateMemberDto) {
    this.ensureCompanyAdmin(req);
    return this.companiesService.createMemberByAdmin(dto);
  }

  /**
   * Update member company info
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update member company info' })
  @HttpCode(HttpStatus.OK)
  async updateMember(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateMemberDto>) {
    this.ensureCompanyAdmin(req);
    return this.companiesService.updateMemberByAdmin(id, dto);
  }

  /**
   * List all member companies with filtering and search
   * Requirement: 4.1.1 - Member Management
   */
  @Get()
  @ApiOperation({ 
    summary: 'List all member companies',
    description: 'Get paginated list of member companies with filter and search capabilities'
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'suspended', 'cancelled', 'pending'] })
  @ApiQuery({ name: 'businessType', required: false, type: String })
  @ApiQuery({ name: 'subscriptionStatus', required: false, type: String })
  @HttpCode(HttpStatus.OK)
  async listMembers(@Request() req: any, @Query() filters: CompanyFilterDto) {
    this.ensureCompanyAdmin(req);
    return this.companiesService.findAllMembers(filters);
  }

  /**
   * Get member company details
   * Requirement: 4.1.1 - Member Management
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Get member company details',
    description: 'Get detailed information about a specific member company'
  })
  @HttpCode(HttpStatus.OK)
  async getMemberDetails(@Request() req: any, @Param('id') id: string) {
    this.ensureCompanyAdmin(req);
    return this.companiesService.getMemberDetails(id);
  }

  /**
   * Update member company status (activate/suspend)
   * Requirement: 4.1.1 - Member Management
   */
  @Patch(':id/status')
  @ApiOperation({ 
    summary: 'Update member company status',
    description: 'Activate, suspend, or cancel a member company account'
  })
  @HttpCode(HttpStatus.OK)
  async updateMemberStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyStatusDto,
  ) {
    this.ensureCompanyAdmin(req);
    return this.companiesService.updateMemberStatus(id, dto);
  }

  /**
   * Get member analytics
   * Requirement: 4.1.1 - Member Management (Analytics)
   */
  @Get('analytics/overview')
  @ApiOperation({ 
    summary: 'Get member analytics overview',
    description: 'Get analytics including total members, active subscriptions, revenue metrics'
  })
  @HttpCode(HttpStatus.OK)
  async getMemberAnalytics(@Request() req: any) {
    this.ensureCompanyAdmin(req);
    return this.companiesService.getMemberAnalytics();
  }

  /**
   * Soft delete member company
   * Requirement: 4.1.1 - Member Management
   */
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete member company',
    description: 'Soft delete a member company (data preserved for 30 days)'
  })
  @HttpCode(HttpStatus.OK)
  async deleteMember(@Request() req: any, @Param('id') id: string) {
    this.ensureCompanyAdmin(req);
    return this.companiesService.softDeleteMember(id);
  }

  /**
   * Helper method to ensure user is company admin
   */
  private ensureCompanyAdmin(req: any): void {
    if (req.user.type !== 'company_admin') {
      throw new UnauthorizedException(
        'Only MonetraPOS administrators can access member management',
      );
    }
  }
}


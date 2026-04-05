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
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { deleteOldFile } from '../../common/utils/file.utils';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto, UpdateCompanySettingsDto } from './dto';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current company profile' })
  getProfile(@Request() req: any) {
    // Extract companyId from JWT token (set by tenant middleware)
    const companyId = req.user.companyId || req.user.company_id;
    return this.companiesService.getProfile(companyId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update company profile' })
  updateProfile(@Request() req: any, @Body() dto: UpdateCompanyDto) {
    // Extract companyId from JWT token (set by tenant middleware)
    const companyId = req.user.companyId || req.user.company_id;
    return this.companiesService.updateProfile(companyId, dto);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get company settings' })
  getSettings(@Request() req: any) {
    const companyId = req.user.companyId || req.user.company_id;
    return this.companiesService.getSettings(companyId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update company settings' })
  updateSettings(@Request() req: any, @Body() dto: UpdateCompanySettingsDto) {
    const companyId = req.user.companyId || req.user.company_id;
    return this.companiesService.updateSettings(companyId, dto);
  }

  @Get('notification-settings')
  @ApiOperation({ summary: 'Get notification settings' })
  async getNotificationSettings(@Request() req: any) {
    const companyId = req.user.companyId || req.user.company_id;
    const company = await this.companiesService.getProfile(companyId);
    return company.metadata?.notificationSettings || {};
  }

  @Patch('notification-settings')
  @ApiOperation({ summary: 'Update notification settings' })
  async updateNotificationSettings(@Request() req: any, @Body() dto: Record<string, any>) {
    const companyId = req.user.companyId || req.user.company_id;
    const company = await this.companiesService.getProfile(companyId);
    const updatedMetadata = {
      ...company.metadata,
      notificationSettings: { ...(company.metadata?.notificationSettings || {}), ...dto },
    };
    return this.companiesService.updateProfile(companyId, { metadata: updatedMetadata } as any);
  }

  @Post('upload-logo')
  @ApiOperation({ summary: 'Upload company logo' })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'logos');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `logo-${Date.now()}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
      if (!allowed.includes(extname(file.originalname).toLowerCase())) {
        return cb(new BadRequestException('Only image files allowed'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadLogo(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const companyId = req.user.companyId || req.user.company_id;
    const logoUrl = `/uploads/logos/${file.filename}`;

    // Delete old logo
    const company = await this.companiesService.getProfile(companyId);
    deleteOldFile((company as any).logoUrl);

    await this.companiesService.updateProfile(companyId, { logoUrl } as any);
    return { logoUrl };
  }

  // ============================================
  // COMPANY ADMIN (Super Admin) ENDPOINTS
  // ============================================

  private requireAdmin(req: any) {
    if (req.user?.type !== 'company_admin') {
      throw new ForbiddenException('Only company admins can access this endpoint');
    }
  }

  @Get('analytics')
  @ApiOperation({ summary: '[Admin] Get member analytics overview' })
  async getMemberAnalytics(@Request() req: any) {
    this.requireAdmin(req);
    return this.companiesService.getMemberAnalytics();
  }

  @Get('members')
  @ApiOperation({ summary: '[Admin] List all member companies' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'subscriptionStatus', required: false })
  async findAllMembers(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('subscriptionStatus') subscriptionStatus?: string,
  ) {
    this.requireAdmin(req);
    return this.companiesService.findAllMembers({ page: page ? +page : 1, limit: limit ? +limit : 20, search, status, subscriptionStatus });
  }

  @Post('members')
  @ApiOperation({ summary: '[Admin] Create a new member company' })
  async createMember(@Request() req: any, @Body() dto: any) {
    this.requireAdmin(req);
    return this.companiesService.createMemberByAdmin(dto);
  }

  @Get('members/:id')
  @ApiOperation({ summary: '[Admin] Get member company details' })
  async getMemberDetails(@Request() req: any, @Param('id') id: string) {
    this.requireAdmin(req);
    return this.companiesService.getMemberDetails(id);
  }

  @Patch('members/:id')
  @ApiOperation({ summary: '[Admin] Update member company' })
  async updateMember(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    this.requireAdmin(req);
    return this.companiesService.updateMemberByAdmin(id, dto);
  }

  @Patch('members/:id/status')
  @ApiOperation({ summary: '[Admin] Update member status (activate/suspend/cancel)' })
  async updateMemberStatus(@Request() req: any, @Param('id') id: string, @Body() dto: { status: string; reason?: string }) {
    this.requireAdmin(req);
    return this.companiesService.updateMemberStatus(id, dto);
  }

  @Delete('members/:id')
  @ApiOperation({ summary: '[Admin] Soft delete member company' })
  async deleteMember(@Request() req: any, @Param('id') id: string) {
    this.requireAdmin(req);
    return this.companiesService.softDeleteMember(id);
  }
}

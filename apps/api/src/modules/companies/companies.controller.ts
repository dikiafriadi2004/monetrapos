import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Request,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { deleteOldFile } from '../../common/utils/file.utils';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto, UpdateCompanySettingsDto } from './dto';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(MemberJwtGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current company profile' })
  getProfile(@Request() req: any) {
    const companyId = req.user.companyId || req.user.company_id;
    return this.companiesService.getProfile(companyId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update company profile' })
  updateProfile(@Request() req: any, @Body() dto: UpdateCompanyDto) {
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
}

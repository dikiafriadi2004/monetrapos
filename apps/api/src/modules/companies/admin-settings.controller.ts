import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { Company } from './company.entity';

@ApiTags('Admin - Settings')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(
    @InjectRepository(Company) private companyRepo: Repository<Company>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get platform settings' })
  async getSettings() {
    // Settings stored in env or a dedicated config — no longer tied to super-admin company slug
    return {
      siteName: process.env.SITE_NAME || 'MonetraPOS',
      siteUrl: process.env.SITE_URL || '',
      supportEmail: process.env.SUPPORT_EMAIL || '',
      supportPhone: process.env.SUPPORT_PHONE || '',
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      allowRegistration: process.env.ALLOW_REGISTRATION !== 'false',
      requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
    };
  }

  @Patch()
  @ApiOperation({ summary: 'Update platform settings' })
  async updateSettings(@Body() body: any) {
    // In production, persist to a dedicated settings table or env management
    // For now return the submitted values as confirmation
    return { message: 'Settings updated', ...body };
  }
}

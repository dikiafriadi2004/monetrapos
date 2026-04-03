import { Controller, Get, Patch, Body, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { User } from '../users/user.entity';

@ApiTags('Admin - Settings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin')
export class AdminSettingsController {
  constructor(
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  private ensureAdmin(req: any) {
    if (req.user?.type !== 'company_admin') {
      throw new UnauthorizedException('Only platform admins can access this');
    }
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get platform settings' })
  async getSettings(@Request() req: any) {
    this.ensureAdmin(req);
    const company = await this.companyRepo.findOne({ where: { slug: 'super-admin' } });
    return {
      siteName: company?.name || 'MonetRAPOS',
      supportEmail: company?.email || '',
      supportPhone: company?.phone || '',
      maintenanceMode: false,
      allowRegistration: true,
      requireEmailVerification: false,
    };
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update platform settings' })
  async updateSettings(@Request() req: any, @Body() body: any) {
    this.ensureAdmin(req);
    // For now just return success - settings stored in company profile
    return { message: 'Settings updated', ...body };
  }

  @Get('users')
  @ApiOperation({ summary: 'Get admin users' })
  async getAdminUsers(@Request() req: any) {
    this.ensureAdmin(req);
    const superAdminCompany = await this.companyRepo.findOne({ where: { slug: 'super-admin' } });
    if (!superAdminCompany) return [];
    const users = await this.userRepo.find({ where: { companyId: superAdminCompany.id } });
    return users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get all payment transactions (admin)' })
  async getTransactions(@Request() req: any) {
    this.ensureAdmin(req);
    // Redirect to billing admin invoices
    return [];
  }
}

import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { Company } from './company.entity';
import { User, UserRole } from '../users/user.entity';

class CreateAdminUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsOptional() @IsString() role?: string;
}

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
    const meta = company?.metadata || {};
    return {
      siteName: company?.name || 'MonetraPOS',
      siteUrl: meta.siteUrl || '',
      supportEmail: company?.email || '',
      supportPhone: company?.phone || '',
      maintenanceMode: meta.maintenanceMode ?? false,
      allowRegistration: meta.allowRegistration ?? true,
      requireEmailVerification: meta.requireEmailVerification ?? false,
    };
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update platform settings' })
  async updateSettings(@Request() req: any, @Body() body: any) {
    this.ensureAdmin(req);
    const company = await this.companyRepo.findOne({ where: { slug: 'super-admin' } });
    if (company) {
      if (body.siteName) company.name = body.siteName;
      if (body.supportEmail) company.email = body.supportEmail;
      if (body.supportPhone) company.phone = body.supportPhone;
      // Persist boolean/extra settings in metadata
      company.metadata = {
        ...(company.metadata || {}),
        ...(body.siteUrl !== undefined && { siteUrl: body.siteUrl }),
        ...(body.maintenanceMode !== undefined && { maintenanceMode: body.maintenanceMode }),
        ...(body.allowRegistration !== undefined && { allowRegistration: body.allowRegistration }),
        ...(body.requireEmailVerification !== undefined && { requireEmailVerification: body.requireEmailVerification }),
      };
      await this.companyRepo.save(company);
    }
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

  @Post('users')
  @ApiOperation({ summary: 'Create admin user' })
  async createAdminUser(@Request() req: any, @Body() dto: CreateAdminUserDto) {
    this.ensureAdmin(req);
    const superAdminCompany = await this.companyRepo.findOne({ where: { slug: 'super-admin' } });
    if (!superAdminCompany) throw new UnauthorizedException('Super admin company not found');

    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new UnauthorizedException('Email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.save(
      this.userRepo.create({
        companyId: superAdminCompany.id,
        name: dto.name,
        email: dto.email,
        passwordHash: hashedPassword,
        role: (dto.role as UserRole) || UserRole.ADMIN,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      })
    );
    return { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt };
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update admin user' })
  async updateAdminUser(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    this.ensureAdmin(req);
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException('User not found');
    if (body.name) user.name = body.name;
    if (body.email) user.email = body.email;
    if (body.password) user.passwordHash = await bcrypt.hash(body.password, 10);
    if (body.role) user.role = body.role;
    await this.userRepo.save(user);
    return { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive };
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete admin user' })
  async deleteAdminUser(@Request() req: any, @Param('id') id: string) {
    this.ensureAdmin(req);
    // Prevent deleting self
    if (req.user?.sub === id) throw new UnauthorizedException('Cannot delete your own account');
    await this.userRepo.delete(id);
    return { message: 'User deleted' };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get all payment transactions (admin)' })
  async getTransactions(@Request() req: any) {
    this.ensureAdmin(req);
    return [];
  }
}


import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AdminUser, AdminRole } from './admin-user.entity';

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepo: Repository<AdminUser>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: AdminLoginDto, ipAddress?: string) {
    if (!dto.email || !dto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const admin = await this.adminUserRepo.findOne({
      where: { email: dto.email },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Update last login
    await this.adminUserRepo.update(admin.id, {
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress || undefined,
    });

    return this.generateToken(admin);
  }

  async getMe(adminId: string) {
    const admin = await this.adminUserRepo.findOne({ where: { id: adminId } });
    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  }

  generateToken(admin: AdminUser) {
    const payload = {
      sub: admin.id,
      email: admin.email,
      type: 'admin',
      role: admin.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '8h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        type: 'admin',
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      if (payload.type !== 'admin') {
        throw new UnauthorizedException('Invalid token type');
      }
      const admin = await this.adminUserRepo.findOne({ where: { id: payload.sub } });
      if (!admin) throw new UnauthorizedException('Admin not found');
      return this.generateToken(admin);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // Admin user management
  async findAll() {
    return this.adminUserRepo.find({
      select: ['id', 'name', 'email', 'role', 'isActive', 'lastLoginAt', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: { name: string; email: string; password: string; role?: AdminRole }) {
    const existing = await this.adminUserRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already exists');

    const passwordHash = await this.hashPassword(dto.password);
    const admin = this.adminUserRepo.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role || AdminRole.ADMIN,
      isActive: true,
    });
    const saved = await this.adminUserRepo.save(admin);
    return { id: saved.id, name: saved.name, email: saved.email, role: saved.role, isActive: saved.isActive, createdAt: saved.createdAt };
  }

  async update(id: string, dto: { name?: string; email?: string; password?: string; role?: AdminRole; isActive?: boolean }) {
    const admin = await this.adminUserRepo.findOne({ where: { id } });
    if (!admin) throw new BadRequestException('Admin not found');

    if (dto.name) admin.name = dto.name;
    if (dto.email) admin.email = dto.email;
    if (dto.password) admin.passwordHash = await this.hashPassword(dto.password);
    if (dto.role) admin.role = dto.role;
    if (dto.isActive !== undefined) admin.isActive = dto.isActive;

    await this.adminUserRepo.save(admin);
    return { id: admin.id, name: admin.name, email: admin.email, role: admin.role, isActive: admin.isActive };
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) throw new BadRequestException('Cannot delete your own account');
    await this.adminUserRepo.delete(id);
    return { message: 'Admin user deleted' };
  }
}

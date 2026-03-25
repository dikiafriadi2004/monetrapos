import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Company } from '../companies/company.entity';
import { Member } from '../members/member.entity';
import { Employee } from '../employees/employee.entity';
import { LoginDto, RegisterCompanyDto, RegisterMemberDto, AuthResponseDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(Member) private memberRepo: Repository<Member>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async registerCompany(dto: RegisterCompanyDto): Promise<AuthResponseDto> {
    const exists = await this.companyRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const company = this.companyRepo.create({
      ...dto,
      password: hashedPassword,
    });
    await this.companyRepo.save(company);

    return this.generateTokens(company.id, company.email, 'company_admin', company.name);
  }

  async loginCompany(dto: LoginDto): Promise<AuthResponseDto> {
    const company = await this.companyRepo.findOne({ where: { email: dto.email } });
    if (!company) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(dto.password, company.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    if (!company.isActive) throw new UnauthorizedException('Account is deactivated');

    return this.generateTokens(company.id, company.email, 'company_admin', company.name);
  }

  async registerMember(dto: RegisterMemberDto, companyId: string): Promise<AuthResponseDto> {
    const exists = await this.memberRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const member = this.memberRepo.create({
      ...dto,
      password: hashedPassword,
      companyId,
    });
    await this.memberRepo.save(member);

    return this.generateTokens(member.id, member.email, 'member', member.name);
  }

  async loginMember(dto: LoginDto): Promise<AuthResponseDto> {
    const member = await this.memberRepo.findOne({ where: { email: dto.email } });
    if (!member) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(dto.password, member.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    if (!member.isActive) throw new UnauthorizedException('Account is deactivated');

    return this.generateTokens(member.id, member.email, 'member', member.name);
  }

  async loginEmployee(dto: LoginDto): Promise<AuthResponseDto> {
    const employee = await this.employeeRepo.findOne({
      where: { email: dto.email },
      relations: ['role', 'role.permissions'],
    });
    if (!employee) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(dto.password, employee.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    if (!employee.isActive) throw new UnauthorizedException('Account is deactivated');

    const permissions = employee.role?.permissions?.map((p) => p.code) || [];

    return this.generateTokens(
      employee.id,
      employee.email,
      'employee',
      employee.name,
      employee.storeId,
      permissions,
    );
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      return this.generateTokens(
        payload.sub,
        payload.email,
        payload.type,
        payload.name,
        payload.storeId,
        payload.permissions,
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(
    userId: string,
    email: string,
    type: string,
    name: string,
    storeId?: string,
    permissions?: string[],
  ): AuthResponseDto {
    const payload: JwtPayload & { name?: string; permissions?: string[] } = {
      sub: userId,
      email,
      type: type as JwtPayload['type'],
      storeId,
      name,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'fallback_secret',
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '15m') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'fallback_refresh_secret',
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as any,
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, name, email, type },
    };
  }
}

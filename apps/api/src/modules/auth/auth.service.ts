import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Company } from '../companies/company.entity';
import { User, UserRole } from '../users/user.entity';
import { Employee } from '../employees/employee.entity';
import { EmailVerificationToken } from './email-verification-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import {
  LoginDto,
  RegisterCompanyDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    @InjectRepository(EmailVerificationToken)
    private emailTokenRepo: Repository<EmailVerificationToken>,
    @InjectRepository(PasswordResetToken)
    private passwordTokenRepo: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private dataSource: DataSource,
    private subscriptionsService: SubscriptionsService,
    private subscriptionPlansService: SubscriptionPlansService,
  ) {}

  async registerCompany(dto: RegisterCompanyDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if company email exists
      const existingCompany = await this.companyRepo.findOne({
        where: { email: dto.companyEmail },
      });
      if (existingCompany) {
        throw new ConflictException('Company email already registered');
      }

      // Check if user email exists
      const existingUser = await this.userRepo.findOne({
        where: { email: dto.ownerEmail },
      });
      if (existingUser) {
        throw new ConflictException('User email already registered');
      }

      // Create company
      const slug = dto.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const company = this.companyRepo.create({
        name: dto.companyName,
        slug,
        email: dto.companyEmail,
        phone: dto.companyPhone,
        address: dto.companyAddress,
        status: 'active',
        subscriptionStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
      });
      await queryRunner.manager.save(company);

      // Create owner user
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = this.userRepo.create({
        companyId: company.id,
        name: dto.ownerName,
        email: dto.ownerEmail,
        phone: dto.ownerPhone,
        passwordHash: hashedPassword,
        role: UserRole.OWNER,
        isActive: true,
      });
      await queryRunner.manager.save(user);

      // Create trial subscription
      const trialPlan = await this.subscriptionPlansService.findByCode('trial');
      if (trialPlan) {
        await this.subscriptionsService.createSubscription(
          company.id,
          trialPlan.id,
        );
      }

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const emailToken = this.emailTokenRepo.create({
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
      await queryRunner.manager.save(emailToken);

      await queryRunner.commitTransaction();

      // TODO: Send verification email
      // await this.emailService.sendVerificationEmail(user.email, verificationToken);

      return {
        message: 'Company registered successfully. Please verify your email.',
        companyId: company.id,
        userId: user.id,
        verificationToken, // Remove in production
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const emailToken = await this.emailTokenRepo.findOne({
      where: { token: dto.token },
      relations: ['user'],
    });

    if (!emailToken) {
      throw new BadRequestException('Invalid verification token');
    }

    if (emailToken.expiresAt < new Date()) {
      throw new BadRequestException('Verification token expired');
    }

    if (emailToken.usedAt) {
      throw new BadRequestException('Token already used');
    }

    // Update user
    await this.userRepo.update(emailToken.userId, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    // Update company
    await this.companyRepo.update(emailToken.user.companyId, {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });

    // Mark token as used
    emailToken.usedAt = new Date();
    await this.emailTokenRepo.save(emailToken);

    return { message: 'Email verified successfully' };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['company'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (user.company.status !== 'active') {
      throw new UnauthorizedException('Company account is not active');
    }

    // Update last login
    await this.userRepo.update(user.id, {
      lastLoginAt: new Date(),
    });

    return this.generateTokens(user);
  }

  async loginEmployee(dto: LoginDto) {
    const employee = await this.employeeRepo.findOne({
      where: { email: dto.email },
      relations: ['store', 'store.company'],
    });

    if (!employee) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, employee.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!employee.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // For now, no permissions until Role relation is added
    const permissions: string[] = [];

    return {
      accessToken: this.jwtService.sign({
        sub: employee.id,
        email: employee.email,
        type: 'employee',
        companyId: employee.store.companyId,
        storeId: employee.storeId,
        permissions,
      }),
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        type: 'employee',
        storeId: employee.storeId,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If email exists, reset link has been sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordToken = this.passwordTokenRepo.create({
      userId: user.id,
      token: resetToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });
    await this.passwordTokenRepo.save(passwordToken);

    // TODO: Send reset email
    // await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return {
      message: 'If email exists, reset link has been sent',
      resetToken, // Remove in production
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const passwordToken = await this.passwordTokenRepo.findOne({
      where: { token: dto.token },
    });

    if (!passwordToken) {
      throw new BadRequestException('Invalid reset token');
    }

    if (passwordToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token expired');
    }

    if (passwordToken.usedAt) {
      throw new BadRequestException('Token already used');
    }

    // Update password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(passwordToken.userId, {
      passwordHash: hashedPassword,
    });

    // Mark token as used
    passwordToken.usedAt = new Date();
    await this.passwordTokenRepo.save(passwordToken);

    return { message: 'Password reset successfully' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
        relations: ['company'],
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      type: 'user',
      companyId: user.companyId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }
}

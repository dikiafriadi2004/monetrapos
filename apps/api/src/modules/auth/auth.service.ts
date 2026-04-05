import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
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
import { BillingService } from '../billing/billing.service';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import {
  LoginDto,
  RegisterCompanyDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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
    private billingService: BillingService,
    private paymentGatewayService: PaymentGatewayService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  async registerCompany(dto: RegisterCompanyDto) {
    // Validate plan exists BEFORE starting transaction
    const plan = await this.subscriptionPlansService.findOne(dto.planId);
    if (!plan) {
      throw new BadRequestException('Invalid subscription plan');
    }

    // Get duration pricing BEFORE starting transaction
    const durations = await this.subscriptionPlansService.getDurationsByPlan(
      dto.planId,
    );
    const selectedDuration = durations.find(
      (d) => d.durationMonths === dto.durationMonths,
    );

    if (!selectedDuration) {
      throw new BadRequestException('Invalid duration selected');
    }

    // Check emails BEFORE creating anything
    const existingCompany = await this.companyRepo.findOne({
      where: { email: dto.companyEmail },
      withDeleted: false,
    });
    if (existingCompany) {
      throw new ConflictException('Company email already registered');
    }

    const existingUser = await this.userRepo.findOne({ where: { email: dto.ownerEmail } });
    if (existingUser) {
      const userCompany = await this.companyRepo.findOne({
        where: { id: existingUser.companyId },
        withDeleted: true,
      });
      if (!userCompany?.deletedAt) {
        throw new ConflictException('User email already registered');
      }
      await this.userRepo.delete(existingUser.id);
    }

    // Create company
    const slug = dto.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const company = await this.companyRepo.save(
      this.companyRepo.create({
        name: dto.companyName,
        slug,
        email: dto.companyEmail,
        phone: dto.companyPhone,
        address: dto.companyAddress,
        businessType: dto.businessType || 'retail',
        status: 'pending',
        subscriptionStatus: 'pending',
      })
    );

    // Create owner user
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.save(
      this.userRepo.create({
        companyId: company.id,
        name: dto.ownerName,
        email: dto.ownerEmail,
        phone: dto.ownerPhone,
        passwordHash: hashedPassword,
        role: UserRole.OWNER,
        isActive: true,
      })
    );

    // Create pending subscription (no nested transaction)
    const subscription = await this.subscriptionsService.create({
      companyId: company.id,
      planId: plan.id,
      billingCycle: 'monthly' as any,
      startTrial: false,
      durationMonths: dto.durationMonths,
    });

    // Generate invoice
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const discountAmount = selectedDuration.discountPercentage > 0
      ? (plan.priceMonthly * dto.durationMonths * selectedDuration.discountPercentage) / 100
      : 0;

    const invoice = await this.billingService.createInvoice({
      companyId: company.id,
      subscriptionId: subscription.id,
      subtotal: selectedDuration.finalPrice,
      taxRate: 0,
      taxAmount: 0,
      discountAmount,
      total: selectedDuration.finalPrice,
      dueDate,
      lineItems: [{
        description: `${plan.name} - ${dto.durationMonths} month${dto.durationMonths > 1 ? 's' : ''}`,
        quantity: 1,
        unitPrice: selectedDuration.finalPrice,
        amount: selectedDuration.finalPrice,
        discount: selectedDuration.discountPercentage,
      }],
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.emailTokenRepo.save(
      this.emailTokenRepo.create({
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
    );

    // Send verification email (non-blocking - don't await)
    const frontendUrl = this.configService.get<string>('MEMBER_ADMIN_URL') || 'http://localhost:4403';
    this.emailService.sendVerificationEmail(user.email, user.name, verificationToken, frontendUrl)
      .then(() => this.logger.log(`Verification email sent to ${user.email}`))
      .catch(e => this.logger.warn(`Failed to send verification email: ${e.message}`));

    // Generate payment URL (non-blocking)
    let paymentUrl = '';
    let paymentToken = '';
    let paymentError = '';
    try {
      const frontendUrl = this.configService.get<string>('MEMBER_ADMIN_URL') || 'http://localhost:4403';
      const paymentResponse = await this.paymentGatewayService.createPaymentUrl({
        orderId: invoice.invoiceNumber,
        amount: selectedDuration.finalPrice,
        customerName: dto.ownerName,
        customerEmail: dto.ownerEmail,
        customerPhone: dto.ownerPhone,
        successRedirectUrl: `${frontendUrl}/payment-callback?status=PAID`,
        failureRedirectUrl: `${frontendUrl}/payment-callback?status=FAILED`,
        itemDetails: [{
          id: plan.id,
          name: `${plan.name} - ${dto.durationMonths} month${dto.durationMonths > 1 ? 's' : ''}`,
          price: selectedDuration.finalPrice,
          quantity: 1,
        }],
      });
      paymentUrl = paymentResponse.redirectUrl;
      paymentToken = paymentResponse.token || '';
    } catch (paymentError_: any) {
      this.logger.warn(`Payment URL generation failed: ${paymentError_.message}`);
      // Provide user-friendly error messages
      const rawMsg: string = paymentError_.message || '';
      if (rawMsg.includes('UNAUTHORIZED_SENDER_IP') || rawMsg.includes('IP Allowlist')) {
        paymentError = 'IP server belum terdaftar di Xendit IP Allowlist. Silakan login ke dashboard.xendit.co → Settings → Developers → IP Allowlist dan tambahkan IP server, atau nonaktifkan IP restriction untuk development.';
      } else if (rawMsg.includes('INVALID_API_KEY') || rawMsg.includes('401')) {
        paymentError = 'API Key Xendit tidak valid. Pastikan menggunakan Secret Key (bukan Public Key) dari Xendit Dashboard.';
      } else {
        paymentError = rawMsg;
      }
    }

    return {
      message: 'Company registered successfully. Please complete payment to activate your account.',
      companyId: company.id,
      userId: user.id,
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: selectedDuration.finalPrice,
      durationMonths: dto.durationMonths,
      discountPercentage: selectedDuration.discountPercentage,
      paymentUrl,
      paymentToken,
      paymentError: paymentError || null,
      dueDate: invoice.dueDate,
      verificationToken,
    };
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

    const isCompanyAdmin = (user.company as any)?.slug === 'super-admin';

    // Company admin: no email verification or subscription check needed
    if (!isCompanyAdmin) {
      // Block login if email not verified
      if (!user.emailVerified) {
        throw new UnauthorizedException(
          'Email belum diverifikasi. Silakan cek email Anda dan klik link verifikasi sebelum login.',
        );
      }

      // Block login if company status is not active or pending
      if (user.company.status !== 'active' && user.company.status !== 'pending') {
        throw new UnauthorizedException('Company account is not active');
      }

      // Block login if subscription is still pending (belum bayar)
      if (user.company.subscriptionStatus === 'pending') {
        throw new UnauthorizedException(
          'Subscription belum aktif. Silakan selesaikan pembayaran terlebih dahulu untuk mengaktifkan akun Anda.',
        );
      }

      // Block login if subscription is suspended
      if (user.company.subscriptionStatus === 'suspended') {
        throw new UnauthorizedException(
          'Subscription Anda telah disuspend. Silakan perpanjang subscription untuk melanjutkan.',
        );
      }
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

    const accessToken = this.jwtService.sign({
      sub: employee.id,
      email: employee.email,
      type: 'employee',
      companyId: employee.store.companyId,
      storeId: employee.storeId,
      permissions,
    });

    const refreshToken = this.jwtService.sign({
      sub: employee.id,
      email: employee.email,
      type: 'employee',
      companyId: employee.store.companyId,
      storeId: employee.storeId,
    }, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
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

    // Send reset email via EmailService (non-blocking)
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4403';
    this.emailService.sendPasswordResetEmail(user.email, user.name, resetToken, frontendUrl)
      .catch(e => this.logger.warn('Failed to send reset email:', e.message));

    return {
      message: 'If email exists, reset link has been sent',
      // Only return token in development for testing
      ...(this.configService.get('NODE_ENV') === 'development' && { resetToken }),
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

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['company'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Try to get subscription separately
    let subscription = null;
    if (user.companyId) {
      const subscriptionResult = await this.dataSource.query(
        `SELECT s.*, sp.name as plan_name, sp.slug as plan_slug
         FROM subscriptions s
         LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
         WHERE s.company_id = ? AND s.status IN ('active', 'expired', 'suspended')
         ORDER BY s.created_at DESC
         LIMIT 1`,
        [user.companyId]
      );
      subscription = subscriptionResult[0] || null;
    }

    // Split name into firstName/lastName for frontend compatibility
    const nameParts = (user.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      user: {
        id: user.id,
        name: user.name,
        firstName,
        lastName,
        email: user.email,
        role: user.role,
        type: (user.company as any)?.slug === 'super-admin' ? 'company_admin' : 'member',
        companyId: user.companyId,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        permissions: user.permissions || [],
      },
      company: user.company ? {
        id: user.company.id,
        name: user.company.name,
        slug: user.company.slug,
        email: user.company.email,
        phone: user.company.phone,
        status: user.company.status,
        subscriptionStatus: user.company.subscriptionStatus,
        businessType: (user.company as any).businessType || 'retail',
      } : null,
      subscription,
    };
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
    const isCompanyAdmin = (user.company as any)?.slug === 'super-admin';
    const userType = isCompanyAdmin ? 'company_admin' : 'member';
    const isOwner = user.role === UserRole.OWNER;

    // Owner gets all permissions implicitly (handled by PermissionGuard via role check)
    // Non-owner members include their explicit permissions in JWT for guard checks
    const permissions = isOwner || isCompanyAdmin ? [] : (user.permissions || []);

    const payload = {
      sub: user.id,
      email: user.email,
      type: userType,
      companyId: user.companyId,
      role: user.role,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: isCompanyAdmin ? '8h' : '1d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    // Split name into firstName/lastName for frontend compatibility
    const nameParts = (user.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        firstName,
        lastName,
        email: user.email,
        role: user.role,
        type: userType,
        companyId: user.companyId,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        permissions: user.permissions || [],
      },
      company: user.company ? {
        id: user.company.id,
        name: user.company.name,
        slug: user.company.slug,
        email: user.company.email,
        phone: user.company.phone,
        status: user.company.status,
        subscriptionStatus: user.company.subscriptionStatus,
        businessType: (user.company as any).businessType || 'retail',
      } : null,
    };
  }
}

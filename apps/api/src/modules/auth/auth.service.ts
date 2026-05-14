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
import { RolesService } from '../roles/roles.service';
import { StoresService } from '../stores/stores.service';
import {
  LoginDto,
  RegisterCompanyDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';

// Semua permission codes yang tersedia di sistem
const ALL_PERMISSIONS = [
  'pos.create_transaction', 'pos.void_transaction', 'pos.refund', 'pos.apply_discount', 'pos.view_cart',
  'product.view', 'product.create', 'product.edit', 'product.delete', 'product.manage_stock',
  'inventory.view', 'inventory.adjust', 'inventory.transfer', 'inventory.opname',
  'employee.view', 'employee.create', 'employee.edit', 'employee.delete', 'employee.manage_role', 'employee.clock_in_out',
  'finance.view_reports', 'finance.view_transactions', 'finance.export_data', 'finance.manage_tax', 'finance.manage_discount', 'finance.manage_payment', 'finance.manage_expenses',
  'store.view', 'store.create', 'store.edit', 'store.delete',
  'settings.store_profile', 'settings.receipt_template', 'settings.manage_table', 'settings.manage_printer', 'settings.subscription',
  'customer.view', 'customer.create', 'customer.edit', 'customer.manage_loyalty',
  'kitchen.view_orders', 'kitchen.update_status',
  'laundry.view_orders', 'laundry.update_status',
];

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
    private rolesService: RolesService,
    private storesService: StoresService,
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

    // In development: auto-verify email since SMTP may not be configured
    // DISABLED: Email verification is required even in development
    // Users must click the verification link in their email before logging in
    // if (process.env.NODE_ENV !== 'production') {
    //   await this.userRepo.update(user.id, { emailVerified: true, emailVerifiedAt: new Date() });
    // }

    // Send verification email (non-blocking - don't await)
    const frontendUrl = this.configService.get<string>('MEMBER_ADMIN_URL') || 'http://localhost:4403';
    this.emailService.sendVerificationEmail(user.email, user.name, verificationToken, frontendUrl)
      .then(() => this.logger.log(`Verification email sent to ${user.email}`))
      .catch(e => this.logger.warn(`Failed to send verification email: ${e.message}`));
    // Generate payment URL
    let paymentUrl = '';
    let paymentToken = '';
    let paymentError = '';
    try {
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

      // AUTO-ACTIVATE for development: when payment gateway fails, activate subscription automatically
      // so users can immediately use the app without needing to complete payment
      // Dikontrol oleh flag DEV_AUTO_ACTIVATE_SUBSCRIPTION=true di .env
      // Add-on TIDAK pernah auto-aktif — harus bayar dulu
      if (process.env.DEV_AUTO_ACTIVATE_SUBSCRIPTION === 'true') {
        try {
          this.logger.log(`[DEV] Payment gateway failed — auto-activating subscription for ${company.email}`);

          const now = new Date();
          const endDate = new Date(now);
          endDate.setMonth(endDate.getMonth() + dto.durationMonths);

          // Activate subscription via dataSource
          await this.dataSource.query(
            `UPDATE subscriptions SET status='active', start_date=?, end_date=?, duration_months=? WHERE id=?`,
            [now, endDate, dto.durationMonths, subscription.id]
          );

          // Activate company
          await this.dataSource.query(
            `UPDATE companies SET status='active', subscription_status='active', subscription_ends_at=? WHERE id=?`,
            [endDate, company.id]
          );

          // Auto-verify email
          await this.dataSource.query(
            `UPDATE users SET email_verified=1, email_verified_at=? WHERE id=?`,
            [now, user.id]
          );

          // Mark invoice as paid
          await this.dataSource.query(
            `UPDATE invoices SET status='paid', paid_at=?, payment_method='auto_dev' WHERE id=?`,
            [now, invoice.id]
          );

          paymentError = null as any;
          paymentUrl = `${this.configService.get<string>('MEMBER_ADMIN_URL') || 'http://localhost:4403'}/login`;
          this.logger.log(`[DEV] Auto-activated subscription for ${company.email} — expires ${endDate.toISOString()}`);

          // Setup default store, roles, and payment methods
          await this.setupNewCompany(company.id, company.name);

          // Send welcome email since subscription is auto-activated
          this.emailService.sendWelcomeEmail(dto.ownerEmail, dto.ownerName, company.name)
            .then(() => this.logger.log(`Welcome email sent to ${dto.ownerEmail}`))
            .catch(e => this.logger.warn(`Failed to send welcome email: ${e.message}`));
        } catch (activateErr: any) {
          this.logger.error(`[DEV] Auto-activation failed: ${activateErr.message}`);
        }
      }
    }

    // Send payment invoice email ALWAYS after payment URL is determined
    // Delay 5s to avoid SMTP rate limit (Mailtrap free: 1 email/sec, Gmail: no issue)
    const sendInvoiceEmail = async () => {
      await new Promise(r => setTimeout(r, 5000));
      const emailPaymentUrl = (paymentUrl && !paymentError && !paymentUrl.includes('/login'))
        ? paymentUrl
        : `${this.configService.get<string>('MEMBER_ADMIN_URL') || 'http://localhost:4403'}/billing`;

      // Retry once if first attempt fails (rate limit)
      try {
        await this.emailService.sendPaymentInvoiceEmail(
          dto.ownerEmail,
          dto.ownerName,
          invoice.invoiceNumber,
          selectedDuration.finalPrice,
          emailPaymentUrl,
          invoice.dueDate,
        );
      } catch (firstErr: any) {
        this.logger.warn(`First attempt failed (${firstErr.message}), retrying in 10s...`);
        await new Promise(r => setTimeout(r, 10000));
        await this.emailService.sendPaymentInvoiceEmail(
          dto.ownerEmail,
          dto.ownerName,
          invoice.invoiceNumber,
          selectedDuration.finalPrice,
          emailPaymentUrl,
          invoice.dueDate,
        );
      }
    };

    sendInvoiceEmail()
      .then(() => this.logger.log(`Payment invoice email sent to ${dto.ownerEmail}`))
      .catch(e => this.logger.warn(`Failed to send payment invoice email: ${e.message}`));

    return {
      message: paymentUrl && !paymentError
        ? (process.env.NODE_ENV !== 'production' && paymentUrl.includes('/login')
            ? 'Registrasi berhasil! Akun Anda telah diaktifkan otomatis. Silakan login.'
            : 'Company registered successfully. Please complete payment to activate your account.')
        : 'Company registered successfully. Please complete payment to activate your account.',
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
      // Only expose verificationToken in development for testing
      ...(process.env.NODE_ENV !== 'production' && { verificationToken }),
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

    // All users in users table are members — no super-admin slug check needed
    // Email verification is optional - just log warning if not verified
    if (!user.emailVerified) {
      this.logger.warn(`User ${user.email} login without email verification`);
      // Don't block login - allow trial access
    }

    // Block login if company status is suspended or cancelled
    if (user.company.status === 'suspended' || user.company.status === 'cancelled') {
      throw new UnauthorizedException('Company account is suspended or cancelled');
    }

    // Allow login for trial, active, and expired subscriptions
    // Expired subscriptions will have limited access (handled in frontend/middleware)
    if (user.company.subscriptionStatus === 'suspended' || user.company.subscriptionStatus === 'cancelled') {
      throw new UnauthorizedException(
        'Subscription Anda telah disuspend atau dibatalkan. Silakan perpanjang subscription untuk melanjutkan.',
      );
    }

    // If subscription is expired, allow login but with limited access flag
    const isExpired = user.company.subscriptionStatus === 'expired';
    if (isExpired) {
      this.logger.warn(`User ${user.email} login with expired subscription`);
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

    // Jika employee tidak punya password, coba verifikasi via users table
    let isValid = false;
    if (employee.passwordHash) {
      isValid = await bcrypt.compare(dto.password, employee.passwordHash);
    } else if (employee.userId) {
      // Fallback: cek password di users table via userId
      const linkedUser = await this.userRepo.findOne({ where: { id: employee.userId } });
      if (linkedUser?.passwordHash) {
        isValid = await bcrypt.compare(dto.password, linkedUser.passwordHash);
        // Sync password ke employee agar tidak perlu fallback lagi
        if (isValid) {
          employee.passwordHash = linkedUser.passwordHash;
          await this.employeeRepo.save(employee);
        }
      }
    } else {
      // Fallback: cek password di users table via email
      const linkedUser = await this.userRepo.findOne({ where: { email: dto.email } });
      if (linkedUser?.passwordHash) {
        isValid = await bcrypt.compare(dto.password, linkedUser.passwordHash);
        // Sync password ke employee
        if (isValid) {
          employee.passwordHash = linkedUser.passwordHash;
          await this.employeeRepo.save(employee);
        }
      }
    }

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!employee.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Assign permissions berdasarkan role employee
    // Jika employee punya linked user, ambil permissions dari user tersebut
    // Jika tidak, gunakan default permissions berdasarkan role string
    const EMPLOYEE_ROLE_PERMISSIONS: Record<string, string[]> = {
      owner: ALL_PERMISSIONS,
      admin: ALL_PERMISSIONS,
      manager: [
        'pos.create_transaction', 'pos.void_transaction', 'pos.apply_discount', 'pos.view_cart',
        'product.view', 'product.create', 'product.edit', 'product.manage_stock',
        'inventory.view', 'inventory.adjust', 'inventory.transfer',
        'employee.view', 'employee.clock_in_out',
        'finance.view_reports', 'finance.view_transactions', 'finance.manage_discount',
        'store.view', 'customer.view', 'customer.create', 'customer.edit', 'customer.manage_loyalty',
        'settings.manage_table', 'kitchen.view_orders', 'kitchen.update_status',
        'laundry.view_orders', 'laundry.update_status',
      ],
      cashier: [
        'pos.create_transaction', 'pos.apply_discount', 'pos.view_cart',
        'employee.clock_in_out',
        'product.view', 'customer.view', 'customer.create', 'customer.edit', 'customer.manage_loyalty',
        'kitchen.view_orders', 'laundry.view_orders', 'laundry.update_status',
      ],
      staff: [
        'pos.create_transaction', 'pos.view_cart',
        'employee.clock_in_out',
        'product.view', 'customer.view',
      ],
      kitchen: [
        'kitchen.view_orders', 'kitchen.update_status', 'product.view', 'employee.clock_in_out',
      ],
      laundry: [
        'laundry.view_orders', 'laundry.update_status', 'product.view', 'customer.view', 'employee.clock_in_out',
      ],
      accountant: [
        'finance.view_reports', 'finance.view_transactions', 'finance.export_data',
        'finance.manage_expenses', 'finance.manage_tax', 'product.view', 'inventory.view',
        'customer.view', 'store.view', 'employee.clock_in_out',
      ],
    };

    let permissions: string[] = [];

    // Coba ambil dari linked user dulu
    if (employee.userId) {
      const linkedUser = await this.userRepo.findOne({ where: { id: employee.userId } });
      if (linkedUser?.permissions?.length) {
        permissions = linkedUser.permissions;
      }
    }

    // Fallback ke default permissions berdasarkan role string
    if (!permissions.length) {
      const roleKey = (employee.role || 'cashier').toLowerCase();
      permissions = EMPLOYEE_ROLE_PERMISSIONS[roleKey] || EMPLOYEE_ROLE_PERMISSIONS.cashier;
    }

    const companyId = employee.store?.companyId || employee.companyId;

    const accessToken = this.jwtService.sign({
      sub: employee.id,
      email: employee.email,
      type: 'employee',
      role: employee.role || 'cashier',
      companyId,
      storeId: employee.storeId,
      permissions,
    });

    const refreshToken = this.jwtService.sign({
      sub: employee.id,
      email: employee.email,
      type: 'employee',
      role: employee.role || 'cashier',
      companyId,
      storeId: employee.storeId,
    }, { expiresIn: '7d' });

    const nameParts = (employee.name || '').split(' ');
    return {
      accessToken,
      refreshToken,
      user: {
        id: employee.id,
        name: employee.name,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: employee.email,
        role: employee.role || 'cashier',
        type: 'employee',
        companyId,
        storeId: employee.storeId,
        permissions,
      },
    };
  }

  /**
   * Login employee via PIN (4-6 digit)
   * PIN disimpan di kolom employees.pin
   * Jika storeId diberikan, hanya cari employee di toko tersebut
   */
  async loginByPin(pin: string, storeId?: string) {
    if (!pin || !/^\d{4,6}$/.test(pin)) {
      throw new UnauthorizedException('PIN tidak valid');
    }

    // Cari semua employee aktif di store (tidak bisa filter by PIN langsung karena di-hash)
    const where: any = { isActive: true };
    if (storeId) where.storeId = storeId;

    const employees = await this.employeeRepo.find({
      where,
      relations: ['store', 'store.company'],
    });

    // Cari employee yang PIN-nya cocok
    let employee: typeof employees[0] | null = null;
    for (const emp of employees) {
      if (!emp.pin) continue;
      // Support both hashed PIN (new) and plain text PIN (legacy)
      let match = false;
      if (emp.pin.startsWith('$2b$') || emp.pin.startsWith('$2a$')) {
        match = await bcrypt.compare(pin, emp.pin);
      } else {
        match = emp.pin === pin;
        // Auto-migrate plain text PIN to hashed
        if (match) {
          emp.pin = await bcrypt.hash(pin, 10);
          await this.employeeRepo.save(emp);
        }
      }
      if (match) { employee = emp; break; }
    }

    if (!employee) {
      throw new UnauthorizedException('PIN salah atau akun tidak aktif');
    }

    if (!employee.store) {
      throw new UnauthorizedException('Employee tidak terhubung ke toko');
    }

    // Gunakan logika permissions yang sama dengan loginEmployee
    const EMPLOYEE_ROLE_PERMISSIONS: Record<string, string[]> = {
      owner: ALL_PERMISSIONS,
      admin: ALL_PERMISSIONS,
      manager: [
        'pos.create_transaction', 'pos.void_transaction', 'pos.apply_discount', 'pos.view_cart',
        'product.view', 'inventory.view', 'employee.view', 'employee.clock_in_out',
        'finance.view_reports', 'finance.view_transactions', 'finance.manage_discount',
        'store.view', 'customer.view', 'customer.create', 'customer.edit', 'customer.manage_loyalty',
        'kitchen.view_orders', 'kitchen.update_status', 'laundry.view_orders', 'laundry.update_status',
      ],
      cashier: [
        'pos.create_transaction', 'pos.apply_discount', 'pos.view_cart',
        'employee.clock_in_out',
        'product.view', 'customer.view', 'customer.create', 'customer.edit', 'customer.manage_loyalty',
        'kitchen.view_orders', 'laundry.view_orders', 'laundry.update_status',
      ],
      staff: [
        'pos.create_transaction', 'pos.view_cart',
        'employee.clock_in_out',
        'product.view', 'customer.view',
      ],
    };

    let permissions: string[] = [];
    if (employee.userId) {
      const linkedUser = await this.userRepo.findOne({ where: { id: employee.userId } });
      if (linkedUser?.permissions?.length) permissions = linkedUser.permissions;
    }
    if (!permissions.length) {
      const roleKey = (employee.role || 'cashier').toLowerCase();
      permissions = EMPLOYEE_ROLE_PERMISSIONS[roleKey] || EMPLOYEE_ROLE_PERMISSIONS.cashier;
    }

    const companyId = employee.store.companyId || employee.companyId;
    const nameParts = (employee.name || '').split(' ');

    const accessToken = this.jwtService.sign({
      sub: employee.id,
      email: employee.email,
      type: 'employee',
      role: employee.role || 'cashier',
      companyId,
      storeId: employee.storeId,
      permissions,
    });

    const refreshToken = this.jwtService.sign({
      sub: employee.id,
      email: employee.email,
      type: 'employee',
      role: employee.role || 'cashier',
      companyId,
      storeId: employee.storeId,
    }, { expiresIn: '7d' });

    this.logger.log(`Employee ${employee.name} logged in via PIN`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: employee.id,
        name: employee.name,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: employee.email,
        role: employee.role || 'cashier',
        type: 'employee',
        companyId,
        storeId: employee.storeId,
        permissions,
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
    let subscription: any = null;
    if (user.companyId) {
      const subscriptionResult = await this.dataSource.query(
        `SELECT s.*, sp.name as plan_name, sp.slug as plan_slug,
                sp.max_products, sp.max_transactions_per_month,
                sp.max_employees, sp.max_users, sp.max_stores,
                sp.features
         FROM subscriptions s
         LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
         WHERE s.company_id = ? AND s.status IN ('active', 'trial', 'expired', 'suspended', 'pending')
         ORDER BY s.created_at DESC
         LIMIT 1`,
        [user.companyId]
      );
      subscription = subscriptionResult[0] || null;

      // Calculate trial days remaining
      if (subscription?.status === 'trial' && subscription?.trial_end) {
        const trialEnd = new Date(subscription.trial_end);
        const now = new Date();
        subscription.trial_days_remaining = Math.max(
          0,
          Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        );
        subscription.is_trial_expired = now > trialEnd;
      }
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
        type: 'member',
        companyId: user.companyId,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        permissions: (user.role === UserRole.OWNER || user.role === 'admin' as any)
          ? ALL_PERMISSIONS
          : (user.permissions || []),
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

  async getMeEmployee(employeeId: string) {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      relations: ['store', 'store.company'],
    });

    if (!employee) {
      throw new UnauthorizedException('Employee not found');
    }

    const companyId = employee.store?.companyId || employee.companyId;
    const nameParts = (employee.name || '').split(' ');

    return {
      user: {
        id: employee.id,
        name: employee.name,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: employee.email,
        role: employee.role || 'cashier',
        type: 'employee',
        companyId,
        storeId: employee.storeId,
        isActive: employee.isActive,
        permissions: employee.userId
          ? (await this.userRepo.findOne({ where: { id: employee.userId } }))?.permissions || []
          : [],
      },
    };
  }

  async updateProfile(userId: string, companyId: string, dto: { name?: string; currentPassword?: string; newPassword?: string; pin?: string }) {
    const user = await this.userRepo.findOne({ where: { id: userId, companyId } });
    if (!user) throw new UnauthorizedException('User not found');

    if (dto.name) user.name = dto.name;

    if (dto.newPassword) {
      if (!dto.currentPassword) throw new BadRequestException('Current password is required');
      const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!valid) throw new BadRequestException('Current password is incorrect');
      if (dto.newPassword.length < 8) throw new BadRequestException('New password must be at least 8 characters');
      user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    await this.userRepo.save(user);

    // Update PIN di employee jika user ini terhubung ke employee
    if (dto.pin !== undefined) {
      if (dto.pin && !/^\d{4,6}$/.test(dto.pin)) {
        throw new BadRequestException('PIN harus 4-6 digit angka');
      }
      await this.employeeRepo.update(
        { userId: userId },
        { pin: dto.pin || null as any },
      );
    }

    const nameParts = (user.name || '').split(' ');
    return {
      id: user.id,
      name: user.name,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: user.email,
      role: user.role,
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

  /**
   * Setup default store, roles, and payment methods for a new company.
   * Called after subscription activation (webhook or auto-dev).
   */
  async setupNewCompany(companyId: string, companyName: string): Promise<void> {
    try {
      // 1. Create default store
      const store = await this.storesService.createDefaultStore(companyId, companyName);
      const storeId = (store as any)?.id;
      this.logger.log(`[Setup] Default store created: ${storeId}`);

      // 2. Create default roles for the store
      if (storeId) {
        await this.rolesService.createDefaultRoles(storeId);
        this.logger.log(`[Setup] Default roles created for store: ${storeId}`);
      }

      // 3. Seed default payment methods
      try {
        const { PaymentMethodsService } = await import('../payment-methods/payment-methods.service');
        // Use dataSource to call seedDefaultPaymentMethods via raw query approach
        await this.dataSource.query(
          `INSERT IGNORE INTO payment_methods (id, company_id, name, code, type, is_active, sort_order, created_at, updated_at)
           VALUES
           (UUID(), ?, 'Tunai', 'cash', 'cash', 1, 1, NOW(), NOW()),
           (UUID(), ?, 'QRIS', 'qris', 'qris', 1, 2, NOW(), NOW()),
           (UUID(), ?, 'Transfer Bank', 'bank_transfer', 'bank_transfer', 1, 3, NOW(), NOW()),
           (UUID(), ?, 'EDC / Kartu', 'edc', 'card', 1, 4, NOW(), NOW()),
           (UUID(), ?, 'E-Wallet', 'ewallet', 'ewallet', 1, 5, NOW(), NOW())`,
          [companyId, companyId, companyId, companyId, companyId]
        );
        this.logger.log(`[Setup] Default payment methods seeded for company: ${companyId}`);
      } catch (pmErr: any) {
        this.logger.warn(`[Setup] Payment methods seed skipped: ${pmErr.message}`);
      }
    } catch (err: any) {
      this.logger.error(`[Setup] setupNewCompany failed: ${err.message}`);
    }
  }

  private generateTokens(user: User) {
    // Owner dan admin mendapat semua permissions
    // Role lain mendapat permissions dari DB
    let permissions: string[];
    if (user.role === UserRole.OWNER || user.role === 'admin' as any) {
      permissions = ALL_PERMISSIONS;
    } else {
      permissions = user.permissions || [];
    }

    const payload = {
      sub: user.id,
      email: user.email,
      type: 'member',
      companyId: user.companyId,
      role: user.role,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

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
        type: 'member',
        companyId: user.companyId,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        permissions,
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

  /**
   * Simple registration with automatic trial subscription
   * User can login immediately without email verification
   * Trial period: 14 days with limited features
   */
  async registerSimple(dto: {
    companyName: string;
    companyEmail: string;
    companyPhone?: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone?: string;
    password: string;
    businessType?: string;
  }) {
    // 1. Check if email already exists
    const existingCompany = await this.companyRepo.findOne({
      where: { email: dto.companyEmail },
      withDeleted: false,
    });
    if (existingCompany) {
      throw new ConflictException('Company email already registered');
    }

    const existingUser = await this.userRepo.findOne({
      where: { email: dto.ownerEmail },
    });
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

    // 2. Get Trial plan
    const trialPlan = await this.subscriptionPlansService.findBySlug('trial');
    if (!trialPlan) {
      throw new BadRequestException('Trial plan not configured. Please contact support.');
    }

    // 3. Create company with trial status
    const slug = dto.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const company = await this.companyRepo.save(
      this.companyRepo.create({
        name: dto.companyName,
        slug,
        email: dto.companyEmail,
        phone: dto.companyPhone,
        businessType: dto.businessType || 'retail',
        status: 'trial',
        subscriptionStatus: 'trial',
      })
    );

    // 4. Create owner user (email not verified yet, but can login)
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
        emailVerified: false, // Not verified yet, but can login
      })
    );

    // 5. Create trial subscription
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialPlan.trialDays);

    const subscription = await this.subscriptionsService.create({
      companyId: company.id,
      planId: trialPlan.id,
      billingCycle: 'monthly' as any,
      startTrial: true,
      durationMonths: 1,
    });

    // Update subscription to trial status
    await this.dataSource.query(
      `UPDATE subscriptions 
       SET status = 'trial',
           start_date = NOW(),
           end_date = ?,
           trial_start = NOW(),
           trial_end = ?
       WHERE id = ?`,
      [trialEndDate, trialEndDate, subscription.id]
    );

    // Update company subscription_ends_at
    await this.companyRepo.update(company.id, {
      subscriptionEndsAt: trialEndDate,
    });

    // 6. Setup default store, roles, and payment methods
    await this.setupNewCompany(company.id, company.name);

    // 7. Generate email verification token (optional, background)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.emailTokenRepo.save(
      this.emailTokenRepo.create({
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
    );

    // 8. Send welcome email (non-blocking)
    const frontendUrl = this.configService.get<string>('MEMBER_ADMIN_URL') || 'http://localhost:4403';
    this.emailService.sendWelcomeEmail(dto.ownerEmail, dto.ownerName, company.name)
      .then(() => this.logger.log(`Welcome email sent to ${dto.ownerEmail}`))
      .catch(e => this.logger.warn(`Failed to send welcome email: ${e.message}`));

    // Send verification email (background, optional)
    this.emailService.sendVerificationEmail(user.email, user.name, verificationToken, frontendUrl)
      .then(() => this.logger.log(`Verification email sent to ${user.email}`))
      .catch(e => this.logger.warn(`Failed to send verification email: ${e.message}`));

    // 9. Auto login - generate tokens
    const tokens = await this.generateTokens(user);

    this.logger.log(`Simple registration completed for ${dto.ownerEmail} - Trial ends: ${trialEndDate.toISOString()}`);

    return {
      message: 'Registration successful! Your 14-day trial has started.',
      ...tokens,
      trialEndsAt: trialEndDate,
      companyId: company.id,
      userId: user.id,
      subscriptionId: subscription.id,
    };
  }
}


import { JwtService } from '@nestjs/jwt';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Company } from '../companies/company.entity';
import { User, UserRole } from '../users/user.entity';
import { Employee } from '../employees/employee.entity';
import { EmailVerificationToken } from './email-verification-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import { LoginDto, RegisterCompanyDto, VerifyEmailDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
export declare class AuthService {
    private companyRepo;
    private userRepo;
    private employeeRepo;
    private emailTokenRepo;
    private passwordTokenRepo;
    private jwtService;
    private configService;
    private dataSource;
    private subscriptionsService;
    private subscriptionPlansService;
    constructor(companyRepo: Repository<Company>, userRepo: Repository<User>, employeeRepo: Repository<Employee>, emailTokenRepo: Repository<EmailVerificationToken>, passwordTokenRepo: Repository<PasswordResetToken>, jwtService: JwtService, configService: ConfigService, dataSource: DataSource, subscriptionsService: SubscriptionsService, subscriptionPlansService: SubscriptionPlansService);
    registerCompany(dto: RegisterCompanyDto): Promise<{
        message: string;
        companyId: string;
        userId: string;
        verificationToken: string;
    }>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: UserRole;
            companyId: string;
        };
    }>;
    loginEmployee(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            type: string;
            storeId: string;
        };
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
        resetToken?: undefined;
    } | {
        message: string;
        resetToken: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: UserRole;
            companyId: string;
        };
    }>;
    private generateTokens;
}

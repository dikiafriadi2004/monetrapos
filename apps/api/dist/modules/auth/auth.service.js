"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const company_entity_1 = require("../companies/company.entity");
const user_entity_1 = require("../users/user.entity");
const employee_entity_1 = require("../employees/employee.entity");
const email_verification_token_entity_1 = require("./email-verification-token.entity");
const password_reset_token_entity_1 = require("./password-reset-token.entity");
const subscriptions_service_1 = require("../subscriptions/subscriptions.service");
const subscription_plans_service_1 = require("../subscriptions/subscription-plans.service");
let AuthService = class AuthService {
    companyRepo;
    userRepo;
    employeeRepo;
    emailTokenRepo;
    passwordTokenRepo;
    jwtService;
    configService;
    dataSource;
    subscriptionsService;
    subscriptionPlansService;
    constructor(companyRepo, userRepo, employeeRepo, emailTokenRepo, passwordTokenRepo, jwtService, configService, dataSource, subscriptionsService, subscriptionPlansService) {
        this.companyRepo = companyRepo;
        this.userRepo = userRepo;
        this.employeeRepo = employeeRepo;
        this.emailTokenRepo = emailTokenRepo;
        this.passwordTokenRepo = passwordTokenRepo;
        this.jwtService = jwtService;
        this.configService = configService;
        this.dataSource = dataSource;
        this.subscriptionsService = subscriptionsService;
        this.subscriptionPlansService = subscriptionPlansService;
    }
    async registerCompany(dto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const existingCompany = await this.companyRepo.findOne({
                where: { email: dto.companyEmail },
            });
            if (existingCompany) {
                throw new common_1.ConflictException('Company email already registered');
            }
            const existingUser = await this.userRepo.findOne({
                where: { email: dto.ownerEmail },
            });
            if (existingUser) {
                throw new common_1.ConflictException('User email already registered');
            }
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
                trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            });
            await queryRunner.manager.save(company);
            const hashedPassword = await bcrypt.hash(dto.password, 10);
            const user = this.userRepo.create({
                companyId: company.id,
                name: dto.ownerName,
                email: dto.ownerEmail,
                phone: dto.ownerPhone,
                passwordHash: hashedPassword,
                role: user_entity_1.UserRole.OWNER,
                isActive: true,
            });
            await queryRunner.manager.save(user);
            const trialPlan = await this.subscriptionPlansService.findByCode('trial');
            if (trialPlan) {
                await this.subscriptionsService.createSubscription(company.id, trialPlan.id);
            }
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const emailToken = this.emailTokenRepo.create({
                userId: user.id,
                token: verificationToken,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });
            await queryRunner.manager.save(emailToken);
            await queryRunner.commitTransaction();
            return {
                message: 'Company registered successfully. Please verify your email.',
                companyId: company.id,
                userId: user.id,
                verificationToken,
            };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async verifyEmail(dto) {
        const emailToken = await this.emailTokenRepo.findOne({
            where: { token: dto.token },
            relations: ['user'],
        });
        if (!emailToken) {
            throw new common_1.BadRequestException('Invalid verification token');
        }
        if (emailToken.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Verification token expired');
        }
        if (emailToken.usedAt) {
            throw new common_1.BadRequestException('Token already used');
        }
        await this.userRepo.update(emailToken.userId, {
            emailVerified: true,
            emailVerifiedAt: new Date(),
        });
        await this.companyRepo.update(emailToken.user.companyId, {
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
        });
        emailToken.usedAt = new Date();
        await this.emailTokenRepo.save(emailToken);
        return { message: 'Email verified successfully' };
    }
    async login(dto) {
        const user = await this.userRepo.findOne({
            where: { email: dto.email },
            relations: ['company'],
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account is deactivated');
        }
        if (user.company.status !== 'active') {
            throw new common_1.UnauthorizedException('Company account is not active');
        }
        await this.userRepo.update(user.id, {
            lastLoginAt: new Date(),
        });
        return this.generateTokens(user);
    }
    async loginEmployee(dto) {
        const employee = await this.employeeRepo.findOne({
            where: { email: dto.email },
            relations: ['store', 'store.company'],
        });
        if (!employee) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isValid = await bcrypt.compare(dto.password, employee.passwordHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!employee.isActive) {
            throw new common_1.UnauthorizedException('Account is deactivated');
        }
        const permissions = [];
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
    async forgotPassword(dto) {
        const user = await this.userRepo.findOne({
            where: { email: dto.email },
        });
        if (!user) {
            return { message: 'If email exists, reset link has been sent' };
        }
        const resetToken = crypto.randomBytes(32).toString('hex');
        const passwordToken = this.passwordTokenRepo.create({
            userId: user.id,
            token: resetToken,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });
        await this.passwordTokenRepo.save(passwordToken);
        return {
            message: 'If email exists, reset link has been sent',
            resetToken,
        };
    }
    async resetPassword(dto) {
        const passwordToken = await this.passwordTokenRepo.findOne({
            where: { token: dto.token },
        });
        if (!passwordToken) {
            throw new common_1.BadRequestException('Invalid reset token');
        }
        if (passwordToken.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Reset token expired');
        }
        if (passwordToken.usedAt) {
            throw new common_1.BadRequestException('Token already used');
        }
        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
        await this.userRepo.update(passwordToken.userId, {
            passwordHash: hashedPassword,
        });
        passwordToken.usedAt = new Date();
        await this.passwordTokenRepo.save(passwordToken);
        return { message: 'Password reset successfully' };
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            const user = await this.userRepo.findOne({
                where: { id: payload.sub },
                relations: ['company'],
            });
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            return this.generateTokens(user);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    generateTokens(user) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(employee_entity_1.Employee)),
    __param(3, (0, typeorm_1.InjectRepository)(email_verification_token_entity_1.EmailVerificationToken)),
    __param(4, (0, typeorm_1.InjectRepository)(password_reset_token_entity_1.PasswordResetToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService,
        typeorm_2.DataSource,
        subscriptions_service_1.SubscriptionsService,
        subscription_plans_service_1.SubscriptionPlansService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
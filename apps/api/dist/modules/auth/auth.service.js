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
const company_entity_1 = require("../companies/company.entity");
const member_entity_1 = require("../members/member.entity");
const employee_entity_1 = require("../employees/employee.entity");
let AuthService = class AuthService {
    companyRepo;
    memberRepo;
    employeeRepo;
    jwtService;
    configService;
    constructor(companyRepo, memberRepo, employeeRepo, jwtService, configService) {
        this.companyRepo = companyRepo;
        this.memberRepo = memberRepo;
        this.employeeRepo = employeeRepo;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async registerCompany(dto) {
        const exists = await this.companyRepo.findOne({ where: { email: dto.email } });
        if (exists)
            throw new common_1.ConflictException('Email already registered');
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const company = this.companyRepo.create({
            ...dto,
            password: hashedPassword,
        });
        await this.companyRepo.save(company);
        return this.generateTokens(company.id, company.email, 'company_admin', company.name);
    }
    async loginCompany(dto) {
        const company = await this.companyRepo.findOne({ where: { email: dto.email } });
        if (!company)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const isValid = await bcrypt.compare(dto.password, company.password);
        if (!isValid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (!company.isActive)
            throw new common_1.UnauthorizedException('Account is deactivated');
        return this.generateTokens(company.id, company.email, 'company_admin', company.name);
    }
    async registerMember(dto, companyId) {
        const exists = await this.memberRepo.findOne({ where: { email: dto.email } });
        if (exists)
            throw new common_1.ConflictException('Email already registered');
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const member = this.memberRepo.create({
            ...dto,
            password: hashedPassword,
            companyId,
        });
        await this.memberRepo.save(member);
        return this.generateTokens(member.id, member.email, 'member', member.name);
    }
    async loginMember(dto) {
        const member = await this.memberRepo.findOne({ where: { email: dto.email } });
        if (!member)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const isValid = await bcrypt.compare(dto.password, member.password);
        if (!isValid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (!member.isActive)
            throw new common_1.UnauthorizedException('Account is deactivated');
        return this.generateTokens(member.id, member.email, 'member', member.name);
    }
    async loginEmployee(dto) {
        const employee = await this.employeeRepo.findOne({
            where: { email: dto.email },
            relations: ['role', 'role.permissions'],
        });
        if (!employee)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const isValid = await bcrypt.compare(dto.password, employee.password);
        if (!isValid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (!employee.isActive)
            throw new common_1.UnauthorizedException('Account is deactivated');
        const permissions = employee.role?.permissions?.map((p) => p.code) || [];
        return this.generateTokens(employee.id, employee.email, 'employee', employee.name, employee.storeId, permissions);
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });
            return this.generateTokens(payload.sub, payload.email, payload.type, payload.name, payload.storeId, payload.permissions);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    generateTokens(userId, email, type, name, storeId, permissions) {
        const payload = {
            sub: userId,
            email,
            type: type,
            storeId,
            name,
            permissions,
        };
        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_SECRET') || 'fallback_secret',
            expiresIn: (this.configService.get('JWT_EXPIRES_IN') || '15m'),
        });
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET') || 'fallback_refresh_secret',
            expiresIn: (this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d'),
        });
        return {
            accessToken,
            refreshToken,
            user: { id: userId, name, email, type },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __param(1, (0, typeorm_1.InjectRepository)(member_entity_1.Member)),
    __param(2, (0, typeorm_1.InjectRepository)(employee_entity_1.Employee)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
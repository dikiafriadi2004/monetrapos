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
exports.MembersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const member_entity_1 = require("./member.entity");
const bcrypt = __importStar(require("bcrypt"));
let MembersService = class MembersService {
    memberRepo;
    constructor(memberRepo) {
        this.memberRepo = memberRepo;
    }
    async create(dto) {
        const exists = await this.memberRepo.findOne({ where: { email: dto.email } });
        if (exists) {
            throw new common_1.ConflictException('Email already registered');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const member = this.memberRepo.create({
            ...dto,
            password: hashedPassword,
        });
        return this.memberRepo.save(member);
    }
    async findAllByCompany(companyId) {
        return this.memberRepo.find({ where: { companyId } });
    }
    async findOneByCompany(companyId, memberId) {
        const member = await this.memberRepo.findOne({ where: { id: memberId, companyId } });
        if (!member)
            throw new common_1.NotFoundException('Member not found');
        return member;
    }
    async updateByCompany(companyId, memberId, dto) {
        const member = await this.findOneByCompany(companyId, memberId);
        if (dto.email && dto.email !== member.email) {
            const exists = await this.memberRepo.findOne({ where: { email: dto.email } });
            if (exists) {
                throw new common_1.ConflictException('Email already in use');
            }
        }
        Object.assign(member, dto);
        return this.memberRepo.save(member);
    }
    async removeByCompany(companyId, memberId) {
        const member = await this.findOneByCompany(companyId, memberId);
        await this.memberRepo.remove(member);
    }
    async getProfile(memberId) {
        const member = await this.memberRepo.findOne({ where: { id: memberId } });
        if (!member)
            throw new common_1.NotFoundException('Member not found');
        return member;
    }
    async updateProfile(memberId, dto) {
        const member = await this.getProfile(memberId);
        if (dto.isActive !== undefined) {
            delete dto.isActive;
        }
        if (dto.email && dto.email !== member.email) {
            const exists = await this.memberRepo.findOne({ where: { email: dto.email } });
            if (exists) {
                throw new common_1.ConflictException('Email already in use');
            }
        }
        Object.assign(member, dto);
        return this.memberRepo.save(member);
    }
};
exports.MembersService = MembersService;
exports.MembersService = MembersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(member_entity_1.Member)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MembersService);
//# sourceMappingURL=members.service.js.map
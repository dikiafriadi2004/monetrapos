"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
let MembersService = class MembersService {
    memberRepo;
    constructor(memberRepo) {
        this.memberRepo = memberRepo;
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
        Object.assign(member, dto);
        return this.memberRepo.save(member);
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
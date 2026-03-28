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
exports.MembersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const members_service_1 = require("./members.service");
const dto_1 = require("./dto");
let MembersController = class MembersController {
    membersService;
    constructor(membersService) {
        this.membersService = membersService;
    }
    getProfile(req) {
        if (req.user.type !== 'member') {
            throw new common_1.UnauthorizedException('Only members can access their profile directly');
        }
        return this.membersService.getProfile(req.user.id);
    }
    updateProfile(req, dto) {
        if (req.user.type !== 'member') {
            throw new common_1.UnauthorizedException('Only members can update their own profile');
        }
        return this.membersService.updateProfile(req.user.id, dto);
    }
    create(req, dto) {
        if (req.user.type !== 'company_admin') {
            throw new common_1.UnauthorizedException('Only company admins can create members');
        }
        dto.companyId = req.user.id;
        return this.membersService.create(dto);
    }
    findAll(req) {
        if (req.user.type !== 'company_admin') {
            throw new common_1.UnauthorizedException('Only company admins can access this list');
        }
        return this.membersService.findAllByCompany(req.user.id);
    }
    findOne(req, id) {
        if (req.user.type !== 'company_admin') {
            throw new common_1.UnauthorizedException('Only company admins can get member details');
        }
        return this.membersService.findOneByCompany(req.user.id, id);
    }
    update(req, id, dto) {
        if (req.user.type !== 'company_admin') {
            throw new common_1.UnauthorizedException('Only company admins can update members');
        }
        return this.membersService.updateByCompany(req.user.id, id, dto);
    }
    remove(req, id) {
        if (req.user.type !== 'company_admin') {
            throw new common_1.UnauthorizedException('Only company admins can delete members');
        }
        return this.membersService.removeByCompany(req.user.id, id);
    }
};
exports.MembersController = MembersController;
__decorate([
    (0, common_1.Get)('profile/me'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current member profile' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('profile/me'),
    (0, swagger_1.ApiOperation)({ summary: 'Update member profile' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.UpdateMemberDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new member under this company' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateMemberDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all members under this company' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific member by ID' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a specific member' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateMemberDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a specific member' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "remove", null);
exports.MembersController = MembersController = __decorate([
    (0, swagger_1.ApiTags)('Members'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('members'),
    __metadata("design:paramtypes", [members_service_1.MembersService])
], MembersController);
//# sourceMappingURL=members.controller.js.map
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
exports.FeaturesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const features_service_1 = require("./features.service");
const create_feature_dto_1 = require("./dto/create-feature.dto");
const update_feature_dto_1 = require("./dto/update-feature.dto");
let FeaturesController = class FeaturesController {
    featuresService;
    constructor(featuresService) {
        this.featuresService = featuresService;
    }
    create(req, dto) {
        if (req.user.type !== 'company_admin') {
            throw new common_1.UnauthorizedException('Only company admins can manage features');
        }
        return this.featuresService.create(req.user.id, dto);
    }
    findAll(req) {
        if (req.user.type !== 'company_admin') {
            throw new common_1.UnauthorizedException('Only company admins can manage features');
        }
        return this.featuresService.findAll(req.user.id);
    }
    findOne(req, id) {
        if (req.user.type !== 'company_admin') {
            throw new common_1.UnauthorizedException('Only company admins can manage features');
        }
        return this.featuresService.findOne(req.user.id, id);
    }
    update(req, id, dto) {
        if (req.user.type !== 'company_admin') {
            throw new common_1.UnauthorizedException('Only company admins can manage features');
        }
        return this.featuresService.update(req.user.id, id, dto);
    }
    remove(req, id) {
        if (req.user.type !== 'company_admin') {
            throw new common_1.UnauthorizedException('Only company admins can manage features');
        }
        return this.featuresService.remove(req.user.id, id);
    }
};
exports.FeaturesController = FeaturesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new feature for the marketplace' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_feature_dto_1.CreateFeatureDto]),
    __metadata("design:returntype", void 0)
], FeaturesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all features' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeaturesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific feature' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FeaturesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a feature' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_feature_dto_1.UpdateFeatureDto]),
    __metadata("design:returntype", void 0)
], FeaturesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a feature' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FeaturesController.prototype, "remove", null);
exports.FeaturesController = FeaturesController = __decorate([
    (0, swagger_1.ApiTags)('Marketplace Features'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('features'),
    __metadata("design:paramtypes", [features_service_1.FeaturesService])
], FeaturesController);
//# sourceMappingURL=features.controller.js.map
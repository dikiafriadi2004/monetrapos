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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = void 0;
const typeorm_1 = require("typeorm");
const entities_1 = require("../../common/entities");
const store_entity_1 = require("../stores/store.entity");
const permission_entity_1 = require("./permission.entity");
let Role = class Role extends entities_1.BaseEntity {
    name;
    description;
    isSystemRole;
    storeId;
    store;
    permissions;
};
exports.Role = Role;
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], Role.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Role.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Role.prototype, "isSystemRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'store_id' }),
    __metadata("design:type", String)
], Role.prototype, "storeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => store_entity_1.Store, (store) => store.roles),
    (0, typeorm_1.JoinColumn)({ name: 'store_id' }),
    __metadata("design:type", store_entity_1.Store)
], Role.prototype, "store", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => permission_entity_1.Permission, (permission) => permission.roles, { eager: true }),
    (0, typeorm_1.JoinTable)({
        name: 'role_permissions',
        joinColumn: { name: 'role_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
    }),
    __metadata("design:type", Array)
], Role.prototype, "permissions", void 0);
exports.Role = Role = __decorate([
    (0, typeorm_1.Entity)('roles')
], Role);
//# sourceMappingURL=role.entity.js.map
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
exports.Employee = void 0;
const typeorm_1 = require("typeorm");
const entities_1 = require("../../common/entities");
const company_entity_1 = require("../companies/company.entity");
const store_entity_1 = require("../stores/store.entity");
let Employee = class Employee extends entities_1.BaseEntity {
    companyId;
    company;
    storeId;
    store;
    name;
    email;
    phone;
    passwordHash;
    pin;
    employeeCode;
    position;
    hireDate;
    avatarUrl;
    isActive;
    deletedAt;
};
exports.Employee = Employee;
__decorate([
    (0, typeorm_1.Column)({ name: 'company_id' }),
    __metadata("design:type", String)
], Employee.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company),
    (0, typeorm_1.JoinColumn)({ name: 'company_id' }),
    __metadata("design:type", company_entity_1.Company)
], Employee.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'store_id' }),
    __metadata("design:type", String)
], Employee.prototype, "storeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => store_entity_1.Store, (store) => store.employees),
    (0, typeorm_1.JoinColumn)({ name: 'store_id' }),
    __metadata("design:type", store_entity_1.Store)
], Employee.prototype, "store", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], Employee.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_hash' }),
    __metadata("design:type", String)
], Employee.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 6, nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "pin", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true, name: 'employee_code' }),
    __metadata("design:type", String)
], Employee.prototype, "employeeCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true, name: 'hire_date' }),
    __metadata("design:type", Date)
], Employee.prototype, "hireDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, nullable: true, name: 'avatar_url' }),
    __metadata("design:type", String)
], Employee.prototype, "avatarUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'is_active' }),
    __metadata("design:type", Boolean)
], Employee.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at' }),
    __metadata("design:type", Date)
], Employee.prototype, "deletedAt", void 0);
exports.Employee = Employee = __decorate([
    (0, typeorm_1.Entity)('employees')
], Employee);
//# sourceMappingURL=employee.entity.js.map
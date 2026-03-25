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
exports.Store = void 0;
const typeorm_1 = require("typeorm");
const entities_1 = require("../../common/entities");
const enums_1 = require("../../common/enums");
const member_entity_1 = require("../members/member.entity");
const product_entity_1 = require("../products/product.entity");
const category_entity_1 = require("../products/category.entity");
const employee_entity_1 = require("../employees/employee.entity");
const role_entity_1 = require("../roles/role.entity");
const tax_entity_1 = require("../taxes/tax.entity");
const discount_entity_1 = require("../discounts/discount.entity");
const transaction_entity_1 = require("../transactions/transaction.entity");
const payment_method_entity_1 = require("../payments/payment-method.entity");
const qris_config_entity_1 = require("../payments/qris-config.entity");
let Store = class Store extends entities_1.BaseEntity {
    name;
    type;
    address;
    phone;
    logo;
    operationalHours;
    receiptHeader;
    receiptFooter;
    isActive;
    memberId;
    member;
    products;
    categories;
    employees;
    roles;
    taxes;
    discounts;
    transactions;
    paymentMethods;
    qrisConfigs;
};
exports.Store = Store;
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], Store.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.StoreType, default: enums_1.StoreType.OTHER }),
    __metadata("design:type", String)
], Store.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Store.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true }),
    __metadata("design:type", String)
], Store.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Store.prototype, "logo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Store.prototype, "operationalHours", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Store.prototype, "receiptHeader", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Store.prototype, "receiptFooter", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Store.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'member_id' }),
    __metadata("design:type", String)
], Store.prototype, "memberId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => member_entity_1.Member, (member) => member.stores),
    (0, typeorm_1.JoinColumn)({ name: 'member_id' }),
    __metadata("design:type", member_entity_1.Member)
], Store.prototype, "member", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => product_entity_1.Product, (product) => product.store),
    __metadata("design:type", Array)
], Store.prototype, "products", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => category_entity_1.Category, (category) => category.store),
    __metadata("design:type", Array)
], Store.prototype, "categories", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => employee_entity_1.Employee, (employee) => employee.store),
    __metadata("design:type", Array)
], Store.prototype, "employees", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => role_entity_1.Role, (role) => role.store),
    __metadata("design:type", Array)
], Store.prototype, "roles", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => tax_entity_1.Tax, (tax) => tax.store),
    __metadata("design:type", Array)
], Store.prototype, "taxes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => discount_entity_1.Discount, (discount) => discount.store),
    __metadata("design:type", Array)
], Store.prototype, "discounts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => transaction_entity_1.Transaction, (tx) => tx.store),
    __metadata("design:type", Array)
], Store.prototype, "transactions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => payment_method_entity_1.PaymentMethod, (pm) => pm.store),
    __metadata("design:type", Array)
], Store.prototype, "paymentMethods", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => qris_config_entity_1.QrisConfig, (qris) => qris.store),
    __metadata("design:type", Array)
], Store.prototype, "qrisConfigs", void 0);
exports.Store = Store = __decorate([
    (0, typeorm_1.Entity)('stores')
], Store);
//# sourceMappingURL=store.entity.js.map
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
exports.Store = exports.StoreType = void 0;
const typeorm_1 = require("typeorm");
const entities_1 = require("../../common/entities");
const company_entity_1 = require("../companies/company.entity");
const product_entity_1 = require("../products/product.entity");
const category_entity_1 = require("../products/category.entity");
const employee_entity_1 = require("../employees/employee.entity");
const role_entity_1 = require("../roles/role.entity");
const tax_entity_1 = require("../taxes/tax.entity");
const discount_entity_1 = require("../discounts/discount.entity");
const transaction_entity_1 = require("../transactions/transaction.entity");
const payment_method_entity_1 = require("../payments/payment-method.entity");
const qris_config_entity_1 = require("../payments/qris-config.entity");
var StoreType;
(function (StoreType) {
    StoreType["RETAIL"] = "retail";
    StoreType["FNB"] = "fnb";
    StoreType["WAREHOUSE"] = "warehouse";
    StoreType["SERVICE"] = "service";
})(StoreType || (exports.StoreType = StoreType = {}));
let Store = class Store extends entities_1.BaseEntity {
    companyId;
    company;
    name;
    code;
    type;
    phone;
    email;
    address;
    city;
    province;
    postalCode;
    latitude;
    longitude;
    operationalHours;
    receiptHeader;
    receiptFooter;
    receiptLogoUrl;
    isActive;
    products;
    categories;
    employees;
    roles;
    taxes;
    discounts;
    transactions;
    paymentMethods;
    qrisConfigs;
    deletedAt;
};
exports.Store = Store;
__decorate([
    (0, typeorm_1.Column)({ name: 'company_id' }),
    __metadata("design:type", String)
], Store.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company),
    (0, typeorm_1.JoinColumn)({ name: 'company_id' }),
    __metadata("design:type", company_entity_1.Company)
], Store.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], Store.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true }),
    __metadata("design:type", String)
], Store.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: StoreType, default: StoreType.RETAIL }),
    __metadata("design:type", String)
], Store.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true }),
    __metadata("design:type", String)
], Store.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], Store.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Store.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], Store.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], Store.prototype, "province", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 10, nullable: true, name: 'postal_code' }),
    __metadata("design:type", String)
], Store.prototype, "postalCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], Store.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 11, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], Store.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true, name: 'operational_hours' }),
    __metadata("design:type", Object)
], Store.prototype, "operationalHours", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'receipt_header' }),
    __metadata("design:type", String)
], Store.prototype, "receiptHeader", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'receipt_footer' }),
    __metadata("design:type", String)
], Store.prototype, "receiptFooter", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, nullable: true, name: 'receipt_logo_url' }),
    __metadata("design:type", String)
], Store.prototype, "receiptLogoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'is_active' }),
    __metadata("design:type", Boolean)
], Store.prototype, "isActive", void 0);
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
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at' }),
    __metadata("design:type", Date)
], Store.prototype, "deletedAt", void 0);
exports.Store = Store = __decorate([
    (0, typeorm_1.Entity)('stores')
], Store);
//# sourceMappingURL=store.entity.js.map
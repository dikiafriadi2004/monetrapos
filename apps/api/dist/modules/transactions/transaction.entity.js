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
exports.Transaction = exports.PaymentMethodType = exports.TransactionStatus = void 0;
const typeorm_1 = require("typeorm");
const entities_1 = require("../../common/entities");
const company_entity_1 = require("../companies/company.entity");
const store_entity_1 = require("../stores/store.entity");
const employee_entity_1 = require("../employees/employee.entity");
const customer_entity_1 = require("../customers/customer.entity");
const shift_entity_1 = require("../shifts/shift.entity");
const transaction_item_entity_1 = require("./transaction-item.entity");
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["COMPLETED"] = "completed";
    TransactionStatus["VOIDED"] = "voided";
    TransactionStatus["REFUNDED"] = "refunded";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var PaymentMethodType;
(function (PaymentMethodType) {
    PaymentMethodType["CASH"] = "cash";
    PaymentMethodType["QRIS"] = "qris";
    PaymentMethodType["EDC"] = "edc";
    PaymentMethodType["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethodType["E_WALLET"] = "e_wallet";
})(PaymentMethodType || (exports.PaymentMethodType = PaymentMethodType = {}));
let Transaction = class Transaction extends entities_1.BaseEntity {
    companyId;
    company;
    storeId;
    store;
    shiftId;
    shift;
    employeeId;
    employee;
    customerId;
    customer;
    invoiceNumber;
    subtotal;
    taxAmount;
    discountAmount;
    serviceCharge;
    total;
    paymentMethod;
    paidAmount;
    changeAmount;
    customerName;
    customerPhone;
    status;
    voidedAt;
    voidedBy;
    voidedByEmployee;
    voidReason;
    notes;
    metadata;
    items;
};
exports.Transaction = Transaction;
__decorate([
    (0, typeorm_1.Column)({ name: 'company_id' }),
    __metadata("design:type", String)
], Transaction.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company),
    (0, typeorm_1.JoinColumn)({ name: 'company_id' }),
    __metadata("design:type", company_entity_1.Company)
], Transaction.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'store_id' }),
    __metadata("design:type", String)
], Transaction.prototype, "storeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => store_entity_1.Store, (store) => store.transactions),
    (0, typeorm_1.JoinColumn)({ name: 'store_id' }),
    __metadata("design:type", store_entity_1.Store)
], Transaction.prototype, "store", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'shift_id' }),
    __metadata("design:type", String)
], Transaction.prototype, "shiftId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => shift_entity_1.Shift, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'shift_id' }),
    __metadata("design:type", shift_entity_1.Shift)
], Transaction.prototype, "shift", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'employee_id' }),
    __metadata("design:type", String)
], Transaction.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => employee_entity_1.Employee, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'employee_id' }),
    __metadata("design:type", employee_entity_1.Employee)
], Transaction.prototype, "employee", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'customer_id' }),
    __metadata("design:type", String)
], Transaction.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customer_entity_1.Customer, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'customer_id' }),
    __metadata("design:type", customer_entity_1.Customer)
], Transaction.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 50, name: 'invoice_number' }),
    __metadata("design:type", String)
], Transaction.prototype, "invoiceNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Transaction.prototype, "subtotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'tax_amount' }),
    __metadata("design:type", Number)
], Transaction.prototype, "taxAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'discount_amount' }),
    __metadata("design:type", Number)
], Transaction.prototype, "discountAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'service_charge' }),
    __metadata("design:type", Number)
], Transaction.prototype, "serviceCharge", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Transaction.prototype, "total", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PaymentMethodType, name: 'payment_method' }),
    __metadata("design:type", String)
], Transaction.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'paid_amount' }),
    __metadata("design:type", Number)
], Transaction.prototype, "paidAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'change_amount' }),
    __metadata("design:type", Number)
], Transaction.prototype, "changeAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150, nullable: true, name: 'customer_name' }),
    __metadata("design:type", String)
], Transaction.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true, name: 'customer_phone' }),
    __metadata("design:type", String)
], Transaction.prototype, "customerPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.COMPLETED }),
    __metadata("design:type", String)
], Transaction.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'voided_at' }),
    __metadata("design:type", Date)
], Transaction.prototype, "voidedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'voided_by' }),
    __metadata("design:type", String)
], Transaction.prototype, "voidedBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => employee_entity_1.Employee, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'voided_by' }),
    __metadata("design:type", employee_entity_1.Employee)
], Transaction.prototype, "voidedByEmployee", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'void_reason' }),
    __metadata("design:type", String)
], Transaction.prototype, "voidReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', default: '{}' }),
    __metadata("design:type", Object)
], Transaction.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => transaction_item_entity_1.TransactionItem, (item) => item.transaction, { cascade: true }),
    __metadata("design:type", Array)
], Transaction.prototype, "items", void 0);
exports.Transaction = Transaction = __decorate([
    (0, typeorm_1.Entity)('transactions')
], Transaction);
//# sourceMappingURL=transaction.entity.js.map
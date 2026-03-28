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
exports.Product = exports.ProductType = void 0;
const typeorm_1 = require("typeorm");
const entities_1 = require("../../common/entities");
const company_entity_1 = require("../companies/company.entity");
const store_entity_1 = require("../stores/store.entity");
const category_entity_1 = require("./category.entity");
const product_variant_entity_1 = require("./product-variant.entity");
var ProductType;
(function (ProductType) {
    ProductType["PHYSICAL"] = "physical";
    ProductType["DIGITAL"] = "digital";
    ProductType["SERVICE"] = "service";
})(ProductType || (exports.ProductType = ProductType = {}));
let Product = class Product extends entities_1.BaseEntity {
    companyId;
    company;
    storeId;
    store;
    categoryId;
    category;
    name;
    description;
    sku;
    barcode;
    cost;
    price;
    compareAtPrice;
    trackInventory;
    stock;
    lowStockThreshold;
    type;
    imageUrl;
    images;
    hasVariants;
    variants;
    isTaxable;
    taxRate;
    isActive;
    metadata;
    deletedAt;
};
exports.Product = Product;
__decorate([
    (0, typeorm_1.Column)({ name: 'company_id' }),
    __metadata("design:type", String)
], Product.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company),
    (0, typeorm_1.JoinColumn)({ name: 'company_id' }),
    __metadata("design:type", company_entity_1.Company)
], Product.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'store_id' }),
    __metadata("design:type", String)
], Product.prototype, "storeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => store_entity_1.Store, (store) => store.products),
    (0, typeorm_1.JoinColumn)({ name: 'store_id' }),
    __metadata("design:type", store_entity_1.Store)
], Product.prototype, "store", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'category_id' }),
    __metadata("design:type", String)
], Product.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => category_entity_1.Category, (category) => category.products, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'category_id' }),
    __metadata("design:type", category_entity_1.Category)
], Product.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], Product.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "sku", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "barcode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "cost", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Product.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'compare_at_price' }),
    __metadata("design:type", Number)
], Product.prototype, "compareAtPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'track_inventory' }),
    __metadata("design:type", Boolean)
], Product.prototype, "trackInventory", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "stock", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 10, name: 'low_stock_threshold' }),
    __metadata("design:type", Number)
], Product.prototype, "lowStockThreshold", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ProductType, default: ProductType.PHYSICAL }),
    __metadata("design:type", String)
], Product.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, nullable: true, name: 'image_url' }),
    __metadata("design:type", String)
], Product.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', default: '[]' }),
    __metadata("design:type", Array)
], Product.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'has_variants' }),
    __metadata("design:type", Boolean)
], Product.prototype, "hasVariants", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => product_variant_entity_1.ProductVariant, (variant) => variant.product),
    __metadata("design:type", Array)
], Product.prototype, "variants", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'is_taxable' }),
    __metadata("design:type", Boolean)
], Product.prototype, "isTaxable", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'tax_rate' }),
    __metadata("design:type", Number)
], Product.prototype, "taxRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'is_active' }),
    __metadata("design:type", Boolean)
], Product.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', default: '{}' }),
    __metadata("design:type", Object)
], Product.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at' }),
    __metadata("design:type", Date)
], Product.prototype, "deletedAt", void 0);
exports.Product = Product = __decorate([
    (0, typeorm_1.Entity)('products')
], Product);
//# sourceMappingURL=product.entity.js.map
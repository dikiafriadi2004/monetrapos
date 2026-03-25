"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftStatus = exports.OrderStatus = exports.StoreType = exports.DiscountType = exports.PaymentMethodType = exports.TransactionStatus = exports.SubscriptionStatus = exports.UserType = void 0;
var UserType;
(function (UserType) {
    UserType["COMPANY_ADMIN"] = "company_admin";
    UserType["MEMBER"] = "member";
    UserType["EMPLOYEE"] = "employee";
})(UserType || (exports.UserType = UserType = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["EXPIRED"] = "expired";
    SubscriptionStatus["CANCELLED"] = "cancelled";
    SubscriptionStatus["TRIAL"] = "trial";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
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
    PaymentMethodType["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethodType["EDC"] = "edc";
    PaymentMethodType["EWALLET"] = "ewallet";
})(PaymentMethodType || (exports.PaymentMethodType = PaymentMethodType = {}));
var DiscountType;
(function (DiscountType) {
    DiscountType["PERCENTAGE"] = "percentage";
    DiscountType["FIXED"] = "fixed";
    DiscountType["BUY_X_GET_Y"] = "buy_x_get_y";
    DiscountType["VOUCHER"] = "voucher";
})(DiscountType || (exports.DiscountType = DiscountType = {}));
var StoreType;
(function (StoreType) {
    StoreType["RESTAURANT"] = "restaurant";
    StoreType["LAUNDRY"] = "laundry";
    StoreType["RETAIL"] = "retail";
    StoreType["CAFE"] = "cafe";
    StoreType["OTHER"] = "other";
})(StoreType || (exports.StoreType = StoreType = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["RECEIVED"] = "received";
    OrderStatus["PREPARING"] = "preparing";
    OrderStatus["READY"] = "ready";
    OrderStatus["SERVED"] = "served";
    OrderStatus["PICKED_UP"] = "picked_up";
    OrderStatus["DELIVERED"] = "delivered";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var ShiftStatus;
(function (ShiftStatus) {
    ShiftStatus["OPEN"] = "open";
    ShiftStatus["CLOSED"] = "closed";
})(ShiftStatus || (exports.ShiftStatus = ShiftStatus = {}));
//# sourceMappingURL=index.js.map
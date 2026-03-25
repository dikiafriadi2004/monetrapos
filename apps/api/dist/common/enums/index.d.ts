export declare enum UserType {
    COMPANY_ADMIN = "company_admin",
    MEMBER = "member",
    EMPLOYEE = "employee"
}
export declare enum SubscriptionStatus {
    ACTIVE = "active",
    EXPIRED = "expired",
    CANCELLED = "cancelled",
    TRIAL = "trial"
}
export declare enum TransactionStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    VOIDED = "voided",
    REFUNDED = "refunded"
}
export declare enum PaymentMethodType {
    CASH = "cash",
    QRIS = "qris",
    BANK_TRANSFER = "bank_transfer",
    EDC = "edc",
    EWALLET = "ewallet"
}
export declare enum DiscountType {
    PERCENTAGE = "percentage",
    FIXED = "fixed",
    BUY_X_GET_Y = "buy_x_get_y",
    VOUCHER = "voucher"
}
export declare enum StoreType {
    RESTAURANT = "restaurant",
    LAUNDRY = "laundry",
    RETAIL = "retail",
    CAFE = "cafe",
    OTHER = "other"
}
export declare enum OrderStatus {
    RECEIVED = "received",
    PREPARING = "preparing",
    READY = "ready",
    SERVED = "served",
    PICKED_UP = "picked_up",
    DELIVERED = "delivered"
}
export declare enum ShiftStatus {
    OPEN = "open",
    CLOSED = "closed"
}

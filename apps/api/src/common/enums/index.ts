export enum UserType {
  MEMBER = 'member',
  EMPLOYEE = 'employee',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  TRIAL = 'trial',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  VOIDED = 'voided',
  REFUNDED = 'refunded',
}

export enum PaymentMethodType {
  CASH = 'cash',
  QRIS = 'qris',
  BANK_TRANSFER = 'bank_transfer',
  EDC = 'edc',
  EWALLET = 'ewallet',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  BUY_X_GET_Y = 'buy_x_get_y',
  VOUCHER = 'voucher',
}

export enum StoreType {
  RESTAURANT = 'restaurant',
  LAUNDRY = 'laundry',
  RETAIL = 'retail',
  CAFE = 'cafe',
  OTHER = 'other',
}

export enum OrderStatus {
  RECEIVED = 'received',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  PICKED_UP = 'picked_up',
  DELIVERED = 'delivered',
}

export enum ShiftStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

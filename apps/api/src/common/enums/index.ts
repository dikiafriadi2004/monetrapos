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
  // Note: transactions table uses 'e_wallet', payment_methods table uses 'ewallet'
  EWALLET = 'ewallet',
  E_WALLET = 'e_wallet',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  BUY_X_GET_Y = 'buy_x_get_y',
  VOUCHER = 'voucher',
}

export enum StoreType {
  RETAIL = 'retail',
  FNB = 'fnb',
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  LAUNDRY = 'laundry',
  WAREHOUSE = 'warehouse',
  SERVICE = 'service',
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

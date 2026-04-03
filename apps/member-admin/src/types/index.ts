// Export all types
export * from './auth.types';
export * from './subscription.types';
export * from './api.types';
export * from './payment-method.types';

// Legacy Payment Method Type (for backward compatibility)
export type PaymentMethodType = 'cash' | 'card' | 'transfer' | 'qris';

// Product Types
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  isActive: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  companyId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Customer Types
export interface Customer {
  id: string;
  customerNumber: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  companyId: string;
  storeId: string;
  loyaltyPoints: number;
  loyaltyTier: 'regular' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  totalOrders: number;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  notes?: string;
  firstPurchaseAt?: string;
  lastPurchaseAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Transaction Types
export interface Transaction {
  id: string;
  transactionNumber: string;
  companyId: string;
  customerId?: string;
  userId: string;
  shiftId?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'qris';
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: TransactionItem[];
  customer?: Customer;
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
  discount: number;
  total: number;
  product?: Product;
}

// Shift Types
export interface Shift {
  id: string;
  companyId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  startingCash: number;
  endingCash?: number;
  expectedCash?: number;
  cashDifference?: number;
  totalSales?: number;
  totalTransactions?: number;
  status: 'open' | 'closed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Cart Types
export interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string;
}

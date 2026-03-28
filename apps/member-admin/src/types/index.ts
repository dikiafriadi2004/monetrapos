// User Types
export enum UserType {
  COMPANY_ADMIN = 'company_admin',
  MEMBER = 'member',
  EMPLOYEE = 'employee',
}

export interface User {
  id: string;
  email: string;
  name: string;
  userType: UserType;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  price: number;
  cost?: number;
  stock: number;
  lowStockAlert?: number;
  categoryId?: string;
  category?: Category;
  storeId: string;
  isActive: boolean;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  storeId: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  stock: number;
}

// Transaction Types
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

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  storeId: string;
  paymentMethod: PaymentMethodType;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  status: TransactionStatus;
  customerName?: string;
  customerId?: string;
  employeeId?: string;
  employeeName?: string;
  notes?: string;
  items: TransactionItem[];
  createdAt: string;
}

// Customer Types
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  loyaltyPoints: number;
  storeId: string;
  memberId: string;
  createdAt: string;
}

// Shift Types
export enum ShiftStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export interface Shift {
  id: string;
  memberId: string;
  employeeId: string;
  storeId: string;
  startingCash: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  openTime: string;
  closeTime?: string;
  status: ShiftStatus;
  notes?: string;
}

// Cart Types
export interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

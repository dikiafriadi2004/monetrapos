export type UserType = 'member' | 'employee';
export type UserRole = 'owner' | 'admin' | 'manager' | 'accountant';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string;
  // UserRole — level akses dalam company (owner/admin/manager/accountant)
  role: UserRole | string;
  // UserType — jenis akun (member/employee)
  type?: UserType;
  companyId: string;
  // Permissions dari role employee (hanya untuk type=employee)
  permissions?: string[];
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  taxId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  company: Company;
}

export interface RegisterCompanyRequest {
  // Company Info
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  companyAddress?: string;

  // Owner Account
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  password: string;

  // Subscription
  planId: string;
  durationMonths: number;
}

export interface RegisterResponse {
  message: string;
  companyId: string;
  userId: string;
  subscriptionId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  durationMonths: number;
  discountPercentage: number;
  paymentUrl: string;
  paymentToken: string;
  dueDate: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

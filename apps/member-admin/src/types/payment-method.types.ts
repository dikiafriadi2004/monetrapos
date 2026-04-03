// Payment Method Types

export enum PaymentMethodType {
  CASH = 'cash',
  CARD = 'card',
  EWALLET = 'ewallet',
  BANK_TRANSFER = 'bank_transfer',
  QRIS = 'qris',
  OTHER = 'other',
}

export interface PaymentMethod {
  id: string;
  companyId: string;
  name: string;
  code: string;
  type: PaymentMethodType;
  iconUrl?: string;
  color?: string;
  description?: string;
  isActive: boolean;
  requiresReference: boolean;
  sortOrder: number;
  accountCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentMethodDto {
  name: string;
  code: string;
  type: PaymentMethodType;
  iconUrl?: string;
  color?: string;
  description?: string;
  isActive?: boolean;
  requiresReference?: boolean;
  sortOrder?: number;
  accountCode?: string;
}

export interface UpdatePaymentMethodDto {
  name?: string;
  code?: string;
  type?: PaymentMethodType;
  iconUrl?: string;
  color?: string;
  description?: string;
  isActive?: boolean;
  requiresReference?: boolean;
  sortOrder?: number;
  accountCode?: string;
}

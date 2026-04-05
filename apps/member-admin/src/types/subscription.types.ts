export type SubscriptionStatus = 
  | 'trial' 
  | 'active' 
  | 'past_due' 
  | 'suspended' 
  | 'cancelled' 
  | 'expired';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug?: string;
  description: string;
  features: string[] | Record<string, boolean>; // Support both formats
  priceMonthly?: number; // For backward compatibility
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionDuration {
  id: string;
  planId: string;
  durationMonths: number;
  price: number;
  discountPercentage: number;
  finalPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  companyId: string;
  planId: string;
  durationId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string;
  trialEndDate?: string;
  gracePeriodEndDate?: string;
  autoRenew: boolean;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  plan?: SubscriptionPlan;
  duration?: SubscriptionDuration;
  // For backward compatibility
  billingCycle?: string;
  durationMonths?: number;
  price?: number;
  currency?: string;
}

export interface SubscriptionHistory {
  id: string;
  subscriptionId: string;
  action: 'created' | 'renewed' | 'cancelled' | 'reactivated' | 'suspended' | 'expired';
  previousStatus?: SubscriptionStatus;
  newStatus: SubscriptionStatus;
  oldStatus?: string; // For backward compatibility
  oldEndDate?: string; // For backward compatibility
  newEndDate?: string; // For backward compatibility
  performedAt?: string; // For backward compatibility
  reason?: string;
  performedBy?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface RenewSubscriptionRequest {
  durationId: string;
}

export interface CancelSubscriptionRequest {
  reason?: string;
}

// Plan with durations for registration
export interface SubscriptionPlanWithDurations extends SubscriptionPlan {
  durations: SubscriptionDuration[];
}

// Payment response from registration
export interface PaymentResponse {
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

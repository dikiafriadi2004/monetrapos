import apiClient from '@/lib/api-client';

export interface AddOn {
  id: string;
  slug: string;
  name: string;
  description: string;
  long_description: string;
  category: 'integration' | 'feature' | 'support' | 'capacity';
  pricing_type: 'one_time' | 'recurring';
  price: number;
  status: 'active' | 'inactive' | 'coming_soon';
  icon_url?: string;
  features: string[];
  available_for_plans: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CompanyAddOn {
  id: string;
  company_id: string;
  add_on_id: string;
  add_on: AddOn;
  status: 'active' | 'pending_payment' | 'expired' | 'cancelled';
  purchase_price: number;
  invoice_id?: string;
  payment_transaction_id?: string;
  activated_at?: string;
  expires_at?: string;
  cancelled_at?: string;
  auto_renew: boolean;
  configuration?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PurchaseResponse {
  companyAddOn: CompanyAddOn;
  paymentUrl: string;
}

class AddOnsService {
  async getAvailableAddOns(category?: string): Promise<AddOn[]> {
    const q = category ? `?category=${category}` : '';
    const res = await apiClient.get(`/add-ons${q}`);
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  }

  async getAddOn(id: string): Promise<AddOn> {
    const res = await apiClient.get(`/add-ons/${id}`);
    return res.data;
  }

  async getPurchasedAddOns(): Promise<CompanyAddOn[]> {
    const res = await apiClient.get('/add-ons/purchased/list');
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  }

  async getActiveAddOns(): Promise<CompanyAddOn[]> {
    const res = await apiClient.get('/add-ons/purchased/active');
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  }

  async purchaseAddOn(addOnId: string, configuration?: Record<string, any>): Promise<PurchaseResponse> {
    const res = await apiClient.post('/add-ons/purchase', { add_on_id: addOnId, configuration });
    return res.data;
  }

  async cancelAddOn(companyAddOnId: string): Promise<CompanyAddOn> {
    const res = await apiClient.post(`/add-ons/${companyAddOnId}/cancel`);
    return res.data;
  }

  async hasAddOn(slug: string): Promise<boolean> {
    const res = await apiClient.get(`/add-ons/check/${slug}`);
    return res.data.hasAddOn;
  }
}

export const addOnsService = new AddOnsService();

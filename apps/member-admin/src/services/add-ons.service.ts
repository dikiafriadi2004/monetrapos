import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

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
  private getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  /**
   * Get all available add-ons
   */
  async getAvailableAddOns(category?: string): Promise<AddOn[]> {
    const params = category ? { category } : {};
    const response = await axios.get(`${API_URL}/add-ons`, {
      params,
      ...this.getAuthHeader(),
    });
    return response.data;
  }

  /**
   * Get add-on by ID
   */
  async getAddOn(id: string): Promise<AddOn> {
    const response = await axios.get(`${API_URL}/add-ons/${id}`, this.getAuthHeader());
    return response.data;
  }

  /**
   * Get purchased add-ons
   */
  async getPurchasedAddOns(): Promise<CompanyAddOn[]> {
    const response = await axios.get(
      `${API_URL}/add-ons/purchased/list`,
      this.getAuthHeader(),
    );
    return response.data;
  }

  /**
   * Get active add-ons
   */
  async getActiveAddOns(): Promise<CompanyAddOn[]> {
    const response = await axios.get(
      `${API_URL}/add-ons/purchased/active`,
      this.getAuthHeader(),
    );
    return response.data;
  }

  /**
   * Purchase an add-on
   */
  async purchaseAddOn(
    addOnId: string,
    configuration?: Record<string, any>,
  ): Promise<PurchaseResponse> {
    const response = await axios.post(
      `${API_URL}/add-ons/purchase`,
      {
        add_on_id: addOnId,
        configuration,
      },
      this.getAuthHeader(),
    );
    return response.data;
  }

  /**
   * Cancel add-on subscription
   */
  async cancelAddOn(companyAddOnId: string): Promise<CompanyAddOn> {
    const response = await axios.post(
      `${API_URL}/add-ons/${companyAddOnId}/cancel`,
      {},
      this.getAuthHeader(),
    );
    return response.data;
  }

  /**
   * Check if company has specific add-on
   */
  async hasAddOn(slug: string): Promise<boolean> {
    const response = await axios.get(
      `${API_URL}/add-ons/check/${slug}`,
      this.getAuthHeader(),
    );
    return response.data.hasAddOn;
  }
}

export const addOnsService = new AddOnsService();

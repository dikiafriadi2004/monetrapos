'use client';

import { useState, useEffect } from 'react';
import { Save, Building2, Receipt, Bell, CreditCard, Settings as SettingsIcon } from 'lucide-react';
import apiClient from '../../../lib/api-client';
import { API_ENDPOINTS } from '../../../lib/api-endpoints';

// Types
interface CompanyProfile {
  name: string;
  businessType: string;
  taxId: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  logoUrl: string;
}

interface CompanySettings {
  taxSettings?: {
    defaultTaxRate?: number;
    taxInclusive?: boolean;
    taxLabel?: string;
    taxNumber?: string;
  };
  receiptSettings?: {
    showLogo?: boolean;
    showTaxNumber?: boolean;
    footerText?: string;
    headerText?: string;
  };
  paymentMethodPreferences?: {
    enableCash?: boolean;
    enableCard?: boolean;
    enableEWallet?: boolean;
    enableQRIS?: boolean;
    enableBankTransfer?: boolean;
  };
  notificationPreferences?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    whatsappNotifications?: boolean;
    lowStockAlerts?: boolean;
    expiryReminders?: boolean;
  };
}

type ActiveTab = 'profile' | 'tax' | 'receipt' | 'notifications' | 'payments';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Profile state
  const [profile, setProfile] = useState<CompanyProfile>({
    name: '',
    businessType: 'retail',
    taxId: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    phone: '',
    email: '',
    logoUrl: '',
  });

  // Settings state
  const [settings, setSettings] = useState<CompanySettings>({
    taxSettings: {
      defaultTaxRate: 11,
      taxInclusive: true,
      taxLabel: 'PPN',
      taxNumber: '',
    },
    receiptSettings: {
      showLogo: true,
      showTaxNumber: true,
      footerText: '',
      headerText: '',
    },
    paymentMethodPreferences: {
      enableCash: true,
      enableCard: true,
      enableEWallet: true,
      enableQRIS: true,
      enableBankTransfer: false,
    },
    notificationPreferences: {
      emailNotifications: true,
      smsNotifications: false,
      whatsappNotifications: false,
      lowStockAlerts: true,
      expiryReminders: true,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, settingsRes]: any = await Promise.all([
        apiClient.get(API_ENDPOINTS.COMPANIES.PROFILE),
        apiClient.get(API_ENDPOINTS.COMPANIES.SETTINGS),
      ]);
      
      if (profileRes.data) {
        setProfile({
          name: profileRes.data.name || '',
          businessType: profileRes.data.businessType || 'retail',
          taxId: profileRes.data.taxId || '',
          address: profileRes.data.address || '',
          city: profileRes.data.city || '',
          province: profileRes.data.province || '',
          postalCode: profileRes.data.postalCode || '',
          phone: profileRes.data.phone || '',
          email: profileRes.data.email || '',
          logoUrl: profileRes.data.logoUrl || '',
        });
      }

      if (settingsRes.data) {
        setSettings({
          taxSettings: settingsRes.data.taxSettings || settings.taxSettings,
          receiptSettings: settingsRes.data.receiptSettings || settings.receiptSettings,
          paymentMethodPreferences: settingsRes.data.paymentMethodPreferences || settings.paymentMethodPreferences,
          notificationPreferences: settingsRes.data.notificationPreferences || settings.notificationPreferences,
        });
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setErrorMessage('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage('');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.patch(API_ENDPOINTS.COMPANIES.PROFILE, profile);
      showSuccess('Business profile updated successfully');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.patch(API_ENDPOINTS.COMPANIES.SETTINGS, settings);
      showSuccess('Settings updated successfully');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-tertiary)' }}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage your business profile, tax settings, and preferences.
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="glass-panel animate-fade-in" style={{ 
          padding: 'var(--space-md)', 
          marginBottom: 'var(--space-lg)', 
          background: 'rgba(34, 197, 94, 0.2)', 
          border: '1px solid rgba(34, 197, 94, 0.3)' 
        }}>
          <p style={{ color: '#22c55e', margin: 0 }}>✓ {successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="glass-panel animate-fade-in" style={{ 
          padding: 'var(--space-md)', 
          marginBottom: 'var(--space-lg)', 
          background: 'rgba(239, 68, 68, 0.2)', 
          border: '1px solid rgba(239, 68, 68, 0.3)' 
        }}>
          <p style={{ color: '#ef4444', margin: 0 }}>✗ {errorMessage}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="glass-panel" style={{ padding: 0, marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              flex: 1,
              padding: 'var(--space-md)',
              background: activeTab === 'profile' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'profile' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)',
              fontWeight: 500,
            }}
          >
            <Building2 size={18} />
            Business Profile
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            style={{
              flex: 1,
              padding: 'var(--space-md)',
              background: activeTab === 'tax' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'tax' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'tax' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)',
              fontWeight: 500,
            }}
          >
            <SettingsIcon size={18} />
            Tax Settings
          </button>
          <button
            onClick={() => setActiveTab('receipt')}
            style={{
              flex: 1,
              padding: 'var(--space-md)',
              background: activeTab === 'receipt' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'receipt' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'receipt' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)',
              fontWeight: 500,
            }}
          >
            <Receipt size={18} />
            Receipt
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            style={{
              flex: 1,
              padding: 'var(--space-md)',
              background: activeTab === 'notifications' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'notifications' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'notifications' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)',
              fontWeight: 500,
            }}
          >
            <Bell size={18} />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            style={{
              flex: 1,
              padding: 'var(--space-md)',
              background: activeTab === 'payments' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'payments' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'payments' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)',
              fontWeight: 500,
            }}
          >
            <CreditCard size={18} />
            Payment Methods
          </button>
        </div>
      </div>

      {/* Business Profile Tab */}
      {activeTab === 'profile' && (
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>Business Profile</h2>
          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  required
                  placeholder="Enter company name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Business Type *</label>
                <select
                  className="form-input"
                  value={profile.businessType}
                  onChange={(e) => setProfile({ ...profile, businessType: e.target.value })}
                  required
                >
                  <option value="retail">Retail</option>
                  <option value="fnb">Food & Beverage</option>
                  <option value="service">Service</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tax ID / NPWP</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.taxId}
                  onChange={(e) => setProfile({ ...profile, taxId: e.target.value })}
                  placeholder="01.234.567.8-901.000"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Address</label>
                <textarea
                  className="form-input"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="Street address"
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="City"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Province</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.province}
                  onChange={(e) => setProfile({ ...profile, province: e.target.value })}
                  placeholder="Province"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Postal Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.postalCode}
                  onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
                  placeholder="12345"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="08123456789"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="business@example.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Logo URL</label>
                <input
                  type="url"
                  className="form-input"
                  value={profile.logoUrl}
                  onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={16} style={{ marginRight: '6px' }} />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tax Settings Tab */}
      {activeTab === 'tax' && (
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>Tax Settings</h2>
          <form onSubmit={handleSaveSettings}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Tax Rate (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.taxSettings?.defaultTaxRate || 0}
                  onChange={(e) => setSettings({
                    ...settings,
                    taxSettings: {
                      ...settings.taxSettings,
                      defaultTaxRate: parseFloat(e.target.value) || 0,
                    },
                  })}
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="11"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tax Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.taxSettings?.taxLabel || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    taxSettings: {
                      ...settings.taxSettings,
                      taxLabel: e.target.value,
                    },
                  })}
                  placeholder="PPN, VAT, etc."
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Tax Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.taxSettings?.taxNumber || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    taxSettings: {
                      ...settings.taxSettings,
                      taxNumber: e.target.value,
                    },
                  })}
                  placeholder="01.234.567.8-901.000"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.taxSettings?.taxInclusive || false}
                    onChange={(e) => setSettings({
                      ...settings,
                      taxSettings: {
                        ...settings.taxSettings,
                        taxInclusive: e.target.checked,
                      },
                    })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Include tax in price (tax-inclusive pricing)</span>
                </label>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-xs)', marginLeft: '26px' }}>
                  When enabled, displayed prices include tax. When disabled, tax is added at checkout.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={16} style={{ marginRight: '6px' }} />
                {saving ? 'Saving...' : 'Save Tax Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Receipt Customization Tab */}
      {activeTab === 'receipt' && (
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>Receipt Customization</h2>
          <form onSubmit={handleSaveSettings}>
            <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Receipt Header Text</label>
                <textarea
                  className="form-input"
                  value={settings.receiptSettings?.headerText || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    receiptSettings: {
                      ...settings.receiptSettings,
                      headerText: e.target.value,
                    },
                  })}
                  placeholder="Welcome! Thank you for shopping with us."
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Receipt Footer Text</label>
                <textarea
                  className="form-input"
                  value={settings.receiptSettings?.footerText || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    receiptSettings: {
                      ...settings.receiptSettings,
                      footerText: e.target.value,
                    },
                  })}
                  placeholder="Thank you for your business! Please come again."
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.receiptSettings?.showLogo || false}
                    onChange={(e) => setSettings({
                      ...settings,
                      receiptSettings: {
                        ...settings.receiptSettings,
                        showLogo: e.target.checked,
                      },
                    })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Show company logo on receipt</span>
                </label>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.receiptSettings?.showTaxNumber || false}
                    onChange={(e) => setSettings({
                      ...settings,
                      receiptSettings: {
                        ...settings.receiptSettings,
                        showTaxNumber: e.target.checked,
                      },
                    })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Show tax number on receipt</span>
                </label>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={16} style={{ marginRight: '6px' }} />
                {saving ? 'Saving...' : 'Save Receipt Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notification Preferences Tab */}
      {activeTab === 'notifications' && (
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>Notification Preferences</h2>
          <form onSubmit={handleSaveSettings}>
            <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                  Notification Channels
                </h3>
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.notificationPreferences?.emailNotifications || false}
                        onChange={(e) => setSettings({
                          ...settings,
                          notificationPreferences: {
                            ...settings.notificationPreferences,
                            emailNotifications: e.target.checked,
                          },
                        })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span>Email Notifications</span>
                    </label>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-xs)', marginLeft: '26px' }}>
                      Receive notifications via email
                    </p>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.notificationPreferences?.smsNotifications || false}
                        onChange={(e) => setSettings({
                          ...settings,
                          notificationPreferences: {
                            ...settings.notificationPreferences,
                            smsNotifications: e.target.checked,
                          },
                        })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span>SMS Notifications</span>
                    </label>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-xs)', marginLeft: '26px' }}>
                      Receive notifications via SMS
                    </p>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.notificationPreferences?.whatsappNotifications || false}
                        onChange={(e) => setSettings({
                          ...settings,
                          notificationPreferences: {
                            ...settings.notificationPreferences,
                            whatsappNotifications: e.target.checked,
                          },
                        })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span>WhatsApp Notifications</span>
                    </label>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-xs)', marginLeft: '26px' }}>
                      Receive notifications via WhatsApp
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                  Alert Types
                </h3>
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.notificationPreferences?.lowStockAlerts || false}
                        onChange={(e) => setSettings({
                          ...settings,
                          notificationPreferences: {
                            ...settings.notificationPreferences,
                            lowStockAlerts: e.target.checked,
                          },
                        })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span>Low Stock Alerts</span>
                    </label>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-xs)', marginLeft: '26px' }}>
                      Get notified when product stock is running low
                    </p>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.notificationPreferences?.expiryReminders || false}
                        onChange={(e) => setSettings({
                          ...settings,
                          notificationPreferences: {
                            ...settings.notificationPreferences,
                            expiryReminders: e.target.checked,
                          },
                        })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span>Daily Sales Summary</span>
                    </label>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-xs)', marginLeft: '26px' }}>
                      Receive daily summary of sales and transactions
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={16} style={{ marginRight: '6px' }} />
                {saving ? 'Saving...' : 'Save Notification Preferences'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'payments' && (
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>Payment Settings</h2>
          
          {/* Payment Gateway Settings */}
          <div style={{ marginBottom: 'var(--space-2xl)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>Payment Gateway</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
              Choose your preferred payment gateway for subscription payments and renewals (Midtrans or Xendit).
            </p>
            
            <div style={{ 
              padding: 'var(--space-xl)', 
              background: 'rgba(99, 102, 241, 0.05)', 
              borderRadius: '8px',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              textAlign: 'center'
            }}>
              <CreditCard size={48} style={{ margin: '0 auto var(--space-md)', color: '#6366f1' }} />
              <h4 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-sm)' }}>
                Payment Gateway Configuration
              </h4>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', maxWidth: '600px', margin: '0 auto var(--space-lg)' }}>
                Select between Midtrans and Xendit for processing subscription payments. Both gateways are secure and PCI-DSS compliant.
              </p>
              <button
                onClick={() => window.location.href = '/dashboard/settings/payment-gateway'}
                className="btn btn-primary"
                style={{ fontSize: '1rem', padding: '12px 24px' }}
              >
                <CreditCard size={18} style={{ marginRight: '8px' }} />
                Configure Payment Gateway
              </button>
            </div>
          </div>

          {/* Payment Methods Settings */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>POS Payment Methods</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
              Configure which payment methods your cashiers can accept at POS. You can add custom payment methods, set colors and icons, and manage active/inactive status.
            </p>
            
            <div style={{ 
              padding: 'var(--space-xl)', 
              background: 'rgba(59, 130, 246, 0.05)', 
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              textAlign: 'center'
            }}>
              <CreditCard size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--primary)' }} />
              <h4 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-sm)' }}>
                Advanced Payment Methods Management
              </h4>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', maxWidth: '600px', margin: '0 auto var(--space-lg)' }}>
                Manage your payment methods with full control over names, types, colors, icons, and more. Configure which methods appear in your POS terminal.
              </p>
              <button
                onClick={() => window.location.href = '/dashboard/settings/payment-methods'}
                className="btn btn-primary"
                style={{ fontSize: '1rem', padding: '12px 24px' }}
              >
                <CreditCard size={18} style={{ marginRight: '8px' }} />
                Manage Payment Methods
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

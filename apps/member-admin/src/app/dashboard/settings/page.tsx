'use client';

import { useState, useEffect } from 'react';
import { Save, Building2, Receipt, Bell, CreditCard, Settings as SettingsIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import apiClient from '../../../lib/api-client';
import { API_ENDPOINTS } from '../../../lib/api-endpoints';
import ImageUpload from '@/components/ImageUpload';
import Link from 'next/link';

interface CompanyProfile { name: string; businessType: string; taxId: string; address: string; city: string; province: string; postalCode: string; phone: string; email: string; logoUrl: string; }
interface CompanySettings {
  taxSettings?: { defaultTaxRate?: number; taxInclusive?: boolean; taxLabel?: string; taxNumber?: string; };
  receiptSettings?: { showLogo?: boolean; showTaxNumber?: boolean; footerText?: string; headerText?: string; };
  notificationPreferences?: { emailNotifications?: boolean; smsNotifications?: boolean; whatsappNotifications?: boolean; lowStockAlerts?: boolean; expiryReminders?: boolean; };
}
type ActiveTab = 'profile' | 'tax' | 'receipt' | 'notifications' | 'payments';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [profile, setProfile] = useState<CompanyProfile>({ name: '', businessType: 'retail', taxId: '', address: '', city: '', province: '', postalCode: '', phone: '', email: '', logoUrl: '' });
  const [settings, setSettings] = useState<CompanySettings>({ taxSettings: { defaultTaxRate: 0, taxInclusive: true, taxLabel: 'PPN', taxNumber: '' }, receiptSettings: { showLogo: true, showTaxNumber: true, footerText: '', headerText: '' }, notificationPreferences: { emailNotifications: true, smsNotifications: false, whatsappNotifications: false, lowStockAlerts: true, expiryReminders: true } });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, settingsRes]: any = await Promise.all([apiClient.get(API_ENDPOINTS.COMPANIES.PROFILE), apiClient.get(API_ENDPOINTS.COMPANIES.SETTINGS)]);
      if (profileRes.data) setProfile({ name: profileRes.data.name||'', businessType: profileRes.data.businessType||'retail', taxId: profileRes.data.taxId||'', address: profileRes.data.address||'', city: profileRes.data.city||'', province: profileRes.data.province||'', postalCode: profileRes.data.postalCode||'', phone: profileRes.data.phone||'', email: profileRes.data.email||'', logoUrl: profileRes.data.logoUrl||'' });
      if (settingsRes.data) setSettings({ taxSettings: settingsRes.data.taxSettings || settings.taxSettings, receiptSettings: settingsRes.data.receiptSettings || settings.receiptSettings, notificationPreferences: settingsRes.data.notificationPreferences || settings.notificationPreferences });
    } catch (err) { console.error('Failed to fetch data:', err); setErrorMessage('Failed to load settings'); }
    finally { setLoading(false); }
  };

  const showSuccess = (msg: string) => { setSuccessMessage(msg); setErrorMessage(''); setTimeout(() => setSuccessMessage(''), 3000); };
  const showError = (msg: string) => { setErrorMessage(msg); setSuccessMessage(''); };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await apiClient.patch(API_ENDPOINTS.COMPANIES.PROFILE, profile); showSuccess('Business profile updated successfully'); }
    catch (err: any) { showError(err.response?.data?.message || 'Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await apiClient.patch(API_ENDPOINTS.COMPANIES.SETTINGS, settings); showSuccess('Settings updated successfully'); }
    catch (err: any) { showError(err.response?.data?.message || 'Failed to update settings'); }
    finally { setSaving(false); }
  };

  const TABS = [
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'tax', label: 'Tax Settings', icon: SettingsIcon },
    { id: 'receipt', label: 'Receipt', icon: Receipt },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payments', label: 'Payment Methods', icon: CreditCard },
  ];

  if (loading) return <div className="flex items-center justify-center min-h-[300px]"><Loader2 size={32} className="animate-spin text-indigo-600"/></div>;

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Settings</h1><p className="text-sm text-gray-500 mt-1">Manage your business profile, tax settings, and preferences.</p></div>

      {successMessage && <div className="flex items-center gap-2 p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm"><CheckCircle size={16}/>{successMessage}</div>}
      {errorMessage && <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircle size={16}/>{errorMessage}</div>}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <tab.icon size={14}/>{tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card animate-fade-in">
          <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Business Profile</h3></div>
          <div className="card-body">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group col-span-2"><label className="form-label">Company Name *</label><input className="form-input" value={profile.name} onChange={e => setProfile({...profile,name:e.target.value})} required placeholder="Enter company name"/></div>
                <div className="form-group"><label className="form-label">Business Type *</label><select className="form-input" value={profile.businessType} onChange={e => setProfile({...profile,businessType:e.target.value})} required><option value="retail">Retail</option><option value="fnb">Food & Beverage</option><option value="service">Service</option><option value="other">Other</option></select></div>
                <div className="form-group"><label className="form-label">Tax ID / NPWP</label><input className="form-input" value={profile.taxId} onChange={e => setProfile({...profile,taxId:e.target.value})} placeholder="01.234.567.8-901.000"/></div>
                <div className="form-group col-span-2"><label className="form-label">Address</label><textarea className="form-input" value={profile.address} onChange={e => setProfile({...profile,address:e.target.value})} rows={2} placeholder="Street address"/></div>
                <div className="form-group"><label className="form-label">City</label><input className="form-input" value={profile.city} onChange={e => setProfile({...profile,city:e.target.value})} placeholder="City"/></div>
                <div className="form-group"><label className="form-label">Province</label><input className="form-input" value={profile.province} onChange={e => setProfile({...profile,province:e.target.value})} placeholder="Province"/></div>
                <div className="form-group"><label className="form-label">Postal Code</label><input className="form-input" value={profile.postalCode} onChange={e => setProfile({...profile,postalCode:e.target.value})} placeholder="12345"/></div>
                <div className="form-group"><label className="form-label">Phone</label><input type="tel" className="form-input" value={profile.phone} onChange={e => setProfile({...profile,phone:e.target.value})} placeholder="08123456789"/></div>
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={profile.email} onChange={e => setProfile({...profile,email:e.target.value})} placeholder="business@example.com"/></div>
                <div className="form-group"><label className="form-label">Logo URL</label><ImageUpload value={profile.logoUrl} onChange={url => setProfile({...profile, logoUrl: url})} uploadEndpoint="/companies/upload-logo" label="Upload Logo Perusahaan" /></div>
              </div>
              <div className="flex justify-end pt-2"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}Save Profile</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Tab */}
      {activeTab === 'tax' && (
        <div className="card animate-fade-in">
          <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Tax Settings</h3></div>
          <div className="card-body">
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group"><label className="form-label">Tax Rate (%)</label><input type="number" className="form-input" value={settings.taxSettings?.defaultTaxRate||0} onChange={e => setSettings({...settings,taxSettings:{...settings.taxSettings,defaultTaxRate:parseFloat(e.target.value)||0}})} min="0" max="100" step="0.01" placeholder="11"/></div>
                <div className="form-group"><label className="form-label">Tax Name</label><input className="form-input" value={settings.taxSettings?.taxLabel||''} onChange={e => setSettings({...settings,taxSettings:{...settings.taxSettings,taxLabel:e.target.value}})} placeholder="PPN, VAT, etc."/></div>
                <div className="form-group col-span-2"><label className="form-label">Tax Number</label><input className="form-input" value={settings.taxSettings?.taxNumber||''} onChange={e => setSettings({...settings,taxSettings:{...settings.taxSettings,taxNumber:e.target.value}})} placeholder="01.234.567.8-901.000"/></div>
                <div className="form-group col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={settings.taxSettings?.taxInclusive||false} onChange={e => setSettings({...settings,taxSettings:{...settings.taxSettings,taxInclusive:e.target.checked}})} className="w-4 h-4 rounded text-indigo-600"/>
                    <span className="text-sm font-medium text-gray-700">Include tax in price (tax-inclusive pricing)</span>
                  </label>
                  <p className="text-xs text-gray-400 mt-1 ml-6">When enabled, displayed prices include tax.</p>
                </div>
              </div>
              <div className="flex justify-end pt-2"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}Save Tax Settings</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Tab */}
      {activeTab === 'receipt' && (
        <div className="card animate-fade-in">
          <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Receipt Customization</h3></div>
          <div className="card-body">
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="form-group"><label className="form-label">Receipt Header Text</label><textarea className="form-input" value={settings.receiptSettings?.headerText||''} onChange={e => setSettings({...settings,receiptSettings:{...settings.receiptSettings,headerText:e.target.value}})} rows={2} placeholder="Welcome! Thank you for shopping with us."/></div>
              <div className="form-group"><label className="form-label">Receipt Footer Text</label><textarea className="form-input" value={settings.receiptSettings?.footerText||''} onChange={e => setSettings({...settings,receiptSettings:{...settings.receiptSettings,footerText:e.target.value}})} rows={2} placeholder="Thank you for your business!"/></div>
              <div className="space-y-3">
                {[['showLogo', 'Show company logo on receipt'], ['showTaxNumber', 'Show tax number on receipt']].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={(settings.receiptSettings as any)?.[key]||false} onChange={e => setSettings({...settings,receiptSettings:{...settings.receiptSettings,[key]:e.target.checked}})} className="w-4 h-4 rounded text-indigo-600"/>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end pt-2"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}Save Receipt Settings</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card animate-fade-in">
          <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Notification Preferences</h3></div>
          <div className="card-body">
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Notification Channels</p>
                <div className="space-y-3">
                  {[['emailNotifications','Email Notifications','Receive notifications via email'], ['smsNotifications','SMS Notifications','Receive notifications via SMS'], ['whatsappNotifications','WhatsApp Notifications','Receive notifications via WhatsApp']].map(([key, label, desc]) => (
                    <label key={key} className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={(settings.notificationPreferences as any)?.[key]||false} onChange={e => setSettings({...settings,notificationPreferences:{...settings.notificationPreferences,[key]:e.target.checked}})} className="w-4 h-4 rounded text-indigo-600 mt-0.5"/>
                      <div><p className="text-sm font-medium text-gray-700">{label}</p><p className="text-xs text-gray-400">{desc}</p></div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Alert Types</p>
                <div className="space-y-3">
                  {[['lowStockAlerts','Low Stock Alerts','Get notified when product stock is running low'], ['expiryReminders','Daily Sales Summary','Receive daily sales summary']].map(([key, label, desc]) => (
                    <label key={key} className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={(settings.notificationPreferences as any)?.[key]||false} onChange={e => setSettings({...settings,notificationPreferences:{...settings.notificationPreferences,[key]:e.target.checked}})} className="w-4 h-4 rounded text-indigo-600 mt-0.5"/>
                      <div><p className="text-sm font-medium text-gray-700">{label}</p><p className="text-xs text-gray-400">{desc}</p></div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-2"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}Save Notification Settings</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="card animate-fade-in">
          <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Payment Methods</h3></div>
          <div className="card-body">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 text-center">
              <CreditCard size={40} className="mx-auto text-indigo-400 mb-3"/>
              <h4 className="font-semibold text-gray-900 mb-1">Advanced Payment Methods Management</h4>
              <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">Manage your payment methods with full control over names, types, and more.</p>
              <Link href="/dashboard/settings/payment-methods" className="btn btn-primary"><CreditCard size={14}/> Manage Payment Methods</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

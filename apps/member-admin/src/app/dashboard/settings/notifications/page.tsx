'use client';

import { useState, useEffect } from 'react';
import { Bell, MessageCircle, Mail, Phone, Save, Loader2, CheckCircle } from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

interface NotificationSettings {
  whatsapp_enabled: boolean;
  whatsapp_number: string;
  email_enabled: boolean;
  email_address: string;
  sms_enabled: boolean;
  sms_number: string;
  // Notification types
  notify_subscription_renewal: boolean;
  notify_low_stock: boolean;
  notify_new_order: boolean;
  notify_order_status: boolean;
  notify_payment_received: boolean;
  notify_birthday_reminder: boolean;
}

const defaultSettings: NotificationSettings = {
  whatsapp_enabled: false, whatsapp_number: '',
  email_enabled: true, email_address: '',
  sms_enabled: false, sms_number: '',
  notify_subscription_renewal: true,
  notify_low_stock: true,
  notify_new_order: true,
  notify_order_status: true,
  notify_payment_received: true,
  notify_birthday_reminder: false,
};

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/companies/notification-settings');
      const data = res?.data || res;
      if (data) setSettings({ ...defaultSettings, ...data });
    } catch {
      // Use defaults if not found
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/companies/notification-settings', settings);
      toast.success('Notification settings saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testWhatsApp = async () => {
    if (!settings.whatsapp_number) { toast.error('Enter WhatsApp number first'); return; }
    setTestingWa(true);
    try {
      await apiClient.post('/notifications/whatsapp', {
        phone: settings.whatsapp_number,
        message: '✅ Test notification from MonetraPOS. Your WhatsApp notifications are working!',
      });
      toast.success('Test WhatsApp sent!');
    } catch { toast.error('Failed to send test WhatsApp'); }
    finally { setTestingWa(false); }
  };

  const testEmail = async () => {
    if (!settings.email_address) { toast.error('Enter email address first'); return; }
    setTestingEmail(true);
    try {
      await apiClient.post('/notifications/email', {
        to: settings.email_address,
        subject: 'Test Notification - MonetraPOS',
        body: 'This is a test notification from MonetraPOS. Your email notifications are working!',
      });
      toast.success('Test email sent!');
    } catch { toast.error('Failed to send test email'); }
    finally { setTestingEmail(false); }
  };

  const toggle = (key: keyof NotificationSettings) =>
    setSettings(p => ({ ...p, [key]: !p[key] }));

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Notification Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure how and when you receive notifications</p>
      </div>

      {/* Channels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>

        {/* WhatsApp */}
        <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(37,211,102,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={20} style={{ color: '#25d366' }} />
              </div>
              <div>
                <h3 style={{ fontWeight: 600 }}>WhatsApp</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Send notifications via WhatsApp Business</p>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div
                onClick={() => toggle('whatsapp_enabled')}
                style={{
                  width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
                  background: settings.whatsapp_enabled ? 'var(--success)' : 'var(--border)',
                  position: 'relative',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 3, transition: 'left 0.2s',
                  left: settings.whatsapp_enabled ? 23 : 3,
                }} />
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{settings.whatsapp_enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          {settings.whatsapp_enabled && (
            <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">WhatsApp Number</label>
                <input
                  className="form-input"
                  value={settings.whatsapp_number}
                  onChange={e => setSettings(p => ({ ...p, whatsapp_number: e.target.value }))}
                  placeholder="+628123456789"
                />
              </div>
              <button onClick={testWhatsApp} disabled={testingWa} className="btn btn-outline" style={{ height: 40, whiteSpace: 'nowrap' }}>
                {testingWa ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                Test
              </button>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={20} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <h3 style={{ fontWeight: 600 }}>Email</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Send notifications via email</p>
              </div>
            </div>
            <div
              onClick={() => toggle('email_enabled')}
              style={{
                width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
                background: settings.email_enabled ? 'var(--success)' : 'var(--border)',
                position: 'relative',
              }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, transition: 'left 0.2s', left: settings.email_enabled ? 23 : 3 }} />
            </div>
          </div>
          {settings.email_enabled && (
            <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" value={settings.email_address} onChange={e => setSettings(p => ({ ...p, email_address: e.target.value }))} placeholder="owner@business.com" />
              </div>
              <button onClick={testEmail} disabled={testingEmail} className="btn btn-outline" style={{ height: 40, whiteSpace: 'nowrap' }}>
                {testingEmail ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                Test
              </button>
            </div>
          )}
        </div>

        {/* SMS */}
        <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={20} style={{ color: 'var(--warning)' }} />
              </div>
              <div>
                <h3 style={{ fontWeight: 600 }}>SMS</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Send notifications via SMS</p>
              </div>
            </div>
            <div
              onClick={() => toggle('sms_enabled')}
              style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s', background: settings.sms_enabled ? 'var(--success)' : 'var(--border)', position: 'relative' }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, transition: 'left 0.2s', left: settings.sms_enabled ? 23 : 3 }} />
            </div>
          </div>
          {settings.sms_enabled && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Phone Number</label>
              <input className="form-input" value={settings.sms_number} onChange={e => setSettings(p => ({ ...p, sms_number: e.target.value }))} placeholder="+628123456789" />
            </div>
          )}
        </div>
      </div>

      {/* Notification Types */}
      <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={18} /> Notification Types
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
          {[
            { key: 'notify_subscription_renewal', label: 'Subscription Renewal', desc: 'Reminders before subscription expires' },
            { key: 'notify_low_stock', label: 'Low Stock Alert', desc: 'When product stock falls below threshold' },
            { key: 'notify_new_order', label: 'New Order', desc: 'When a new order is placed' },
            { key: 'notify_order_status', label: 'Order Status Update', desc: 'When order status changes' },
            { key: 'notify_payment_received', label: 'Payment Received', desc: 'When payment is confirmed' },
            { key: 'notify_birthday_reminder', label: 'Customer Birthday', desc: 'Remind about customer birthdays' },
          ].map(({ key, label, desc }) => (
            <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)', cursor: 'pointer', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <input
                type="checkbox"
                checked={settings[key as keyof NotificationSettings] as boolean}
                onChange={() => toggle(key as keyof NotificationSettings)}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
        Save Settings
      </button>
    </div>
  );
}


"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react';
import { api } from '../../../../lib/api';

interface XenditConfig {
  isEnabled: boolean;
  isProduction: boolean;
  webhookUrl: string;
  hasSecretKey: boolean;
  hasWebhookToken: boolean;
  updatedAt?: string;
}

export default function PaymentGatewaySettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<XenditConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    isEnabled: false,
    isProduction: false,
    secretKey: '',
    webhookToken: '',
    webhookUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1'}/payment-gateway/webhook/xendit`,
  });

  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookToken, setShowWebhookToken] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const data: any = await api.get('/admin/payment-gateway/config');
      if (data) {
        setConfig(data);
        setForm(prev => ({
          ...prev,
          isEnabled: data.isEnabled || false,
          isProduction: data.isProduction || false,
          webhookUrl: data.webhookUrl || prev.webhookUrl,
        }));
      }
    } catch (err) {
      console.error('Failed to load config', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const payload: any = {
        isEnabled: form.isEnabled,
        isProduction: form.isProduction,
        webhookUrl: form.webhookUrl,
      };
      // Only send keys if they were filled in
      if (form.secretKey.trim()) payload.secretKey = form.secretKey.trim();
      if (form.webhookToken.trim()) payload.webhookToken = form.webhookToken.trim();

      await api.put('/admin/payment-gateway/config', payload);
      setSuccess(true);
      setForm(prev => ({ ...prev, secretKey: '', webhookToken: '' }));
      await fetchConfig();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        <button onClick={() => router.back()} className="btn btn-outline" style={{ padding: '8px' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={22} color="var(--accent-base)" /> Xendit Payment Gateway
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Configure Xendit credentials for processing subscription payments.
          </p>
        </div>
      </div>

      {/* Status Card */}
      <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: config?.isEnabled && config?.hasSecretKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          {config?.isEnabled && config?.hasSecretKey
            ? <CheckCircle size={24} color="var(--success)" />
            : <AlertCircle size={24} color="var(--danger)" />
          }
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>
            {config?.isEnabled && config?.hasSecretKey ? 'Xendit Active' : 'Xendit Not Configured'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {config?.isEnabled && config?.hasSecretKey
              ? `Running in ${config.isProduction ? 'PRODUCTION' : 'TEST'} mode`
              : 'Enter your Xendit credentials below to enable payment processing'
            }
          </div>
        </div>
        {config?.updatedAt && (
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            Last updated: {new Date(config.updatedAt).toLocaleDateString('id-ID')}
          </div>
        )}
      </div>

      {/* Config Form */}
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '700px' }}>
        <form onSubmit={handleSave} style={{ padding: 'var(--space-xl)' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} /> Configuration saved successfully!
            </div>
          )}

          {/* Enable Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>Enable Xendit</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Allow members to pay via Xendit</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.isEnabled}
                onChange={e => setForm(p => ({ ...p, isEnabled: e.target.checked }))}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '13px', transition: '0.3s',
                background: form.isEnabled ? 'var(--success)' : 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
              }}>
                <span style={{
                  position: 'absolute', top: '3px', left: form.isEnabled ? '25px' : '3px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'white', transition: '0.3s',
                }} />
              </span>
            </label>
          </div>

          {/* Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xl)' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>Production Mode</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                {form.isProduction ? '⚠️ Real transactions will be processed' : 'Test mode - no real charges'}
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.isProduction}
                onChange={e => setForm(p => ({ ...p, isProduction: e.target.checked }))}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '13px', transition: '0.3s',
                background: form.isProduction ? 'var(--warning)' : 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
              }}>
                <span style={{
                  position: 'absolute', top: '3px', left: form.isProduction ? '25px' : '3px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'white', transition: '0.3s',
                }} />
              </span>
            </label>
          </div>

          {/* Secret Key */}
          <div className="form-group">
            <label className="form-label">
              Secret Key {config?.hasSecretKey && <span style={{ color: 'var(--success)', fontSize: '0.75rem' }}>✓ Already set</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showSecretKey ? 'text' : 'password'}
                className="form-input"
                placeholder={config?.hasSecretKey ? '••••••••••••••••••••• (leave blank to keep current)' : 'xnd_production_... or xnd_development_...'}
                value={form.secretKey}
                onChange={e => setForm(p => ({ ...p, secretKey: e.target.value }))}
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
              >
                {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Get from Xendit Dashboard → Settings → API Keys
            </span>
          </div>

          {/* Webhook Token */}
          <div className="form-group">
            <label className="form-label">
              Webhook Token {config?.hasWebhookToken && <span style={{ color: 'var(--success)', fontSize: '0.75rem' }}>✓ Already set</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showWebhookToken ? 'text' : 'password'}
                className="form-input"
                placeholder={config?.hasWebhookToken ? '••••••••••••••••••••• (leave blank to keep current)' : 'Webhook verification token from Xendit'}
                value={form.webhookToken}
                onChange={e => setForm(p => ({ ...p, webhookToken: e.target.value }))}
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowWebhookToken(!showWebhookToken)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
              >
                {showWebhookToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Get from Xendit Dashboard → Settings → Webhooks → Verification Token
            </span>
          </div>

          {/* Webhook URL */}
          <div className="form-group">
            <label className="form-label">Webhook URL</label>
            <input
              type="text"
              className="form-input"
              value={form.webhookUrl}
              onChange={e => setForm(p => ({ ...p, webhookUrl: e.target.value }))}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Copy this URL to Xendit Dashboard → Settings → Webhooks
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xl)' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: '160px' }}>
              {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> Save Configuration</>}
            </button>
          </div>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 100% { transform: rotate(360deg); } }`}} />
    </div>
  );
}

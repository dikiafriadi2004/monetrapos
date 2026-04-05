"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Zap, TestTube, Info, ExternalLink } from 'lucide-react';
import { api } from '../../../../lib/api';
import toast from 'react-hot-toast';

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
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [form, setForm] = useState({
    isEnabled: false,
    isProduction: false,
    secretKey: '',
    webhookToken: '',
    webhookUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://10.1.2.254:4404/api/v1'}/payment-gateway/webhook/xendit`,
  });

  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookToken, setShowWebhookToken] = useState(false);

  useEffect(() => { fetchConfig(); }, []);

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

  const validateSecretKey = (key: string): string | null => {
    if (!key) return null;
    if (key.startsWith('xnd_public_')) {
      return '⚠️ Ini adalah Public Key, bukan Secret Key! Gunakan Secret Key yang dimulai dengan xnd_development_ atau xnd_production_';
    }
    if (!key.startsWith('xnd_development_') && !key.startsWith('xnd_production_')) {
      return '⚠️ Format key tidak valid. Secret Key harus dimulai dengan xnd_development_ atau xnd_production_';
    }
    return null;
  };

  const keyError = validateSecretKey(form.secretKey);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (keyError) {
      toast.error(keyError);
      return;
    }
    setSaving(true);
    setTestResult(null);
    try {
      const payload: any = {
        isEnabled: form.isEnabled,
        isProduction: form.isProduction,
        webhookUrl: form.webhookUrl,
      };
      if (form.secretKey.trim()) payload.secretKey = form.secretKey.trim();
      if (form.webhookToken.trim()) payload.webhookToken = form.webhookToken.trim();

      await api.put('/admin/payment-gateway/config', payload);
      toast.success('Konfigurasi berhasil disimpan!');
      setForm(prev => ({ ...prev, secretKey: '', webhookToken: '' }));
      await fetchConfig();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan konfigurasi');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result: any = await api.put('/admin/payment-gateway/test', {});
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Test gagal' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} /></div>;
  }

  const isConfigured = config?.isEnabled && config?.hasSecretKey;

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
            Konfigurasi Xendit untuk memproses pembayaran subscription.
          </p>
        </div>
      </div>

      {/* Status Card */}
      <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: isConfigured ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {isConfigured ? <CheckCircle size={24} color="var(--success)" /> : <AlertCircle size={24} color="var(--danger)" />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>
            {isConfigured ? '✅ Xendit Aktif' : '❌ Xendit Belum Dikonfigurasi'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {isConfigured
              ? `Mode: ${config?.isProduction ? '🔴 PRODUCTION (transaksi nyata)' : '🟡 TEST (tidak ada biaya nyata)'}${(config as any)?.keySource === 'environment' ? ' · Key dari .env' : ' · Key dari database'}`
              : 'Masukkan Secret Key Xendit untuk mengaktifkan pembayaran otomatis saat registrasi'}
          </div>
        </div>
        {isConfigured && (
          <button onClick={handleTest} className="btn btn-outline" disabled={testing} style={{ flexShrink: 0 }}>
            {testing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <TestTube size={14} />}
            {testing ? 'Testing...' : 'Test Koneksi'}
          </button>
        )}
      </div>

      {/* Test Result */}
      {testResult && (
        <div style={{
          padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)',
          background: testResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${testResult.success ? 'var(--success)' : 'var(--danger)'}`,
          color: testResult.success ? 'var(--success)' : 'var(--danger)',
          fontSize: '0.9rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            {testResult.success ? <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />}
            <div>
              <div style={{ fontWeight: 600 }}>{testResult.message}</div>
              {(testResult as any).fix && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', fontSize: '0.85rem', color: '#7f1d1d' }}>
                  <strong>Cara fix:</strong> {(testResult as any).fix}
                </div>
              )}
              {(testResult as any).serverIp && (
                <div style={{ marginTop: '6px', fontSize: '0.8rem', opacity: 0.8 }}>
                  IP Server: <code style={{ background: 'rgba(0,0,0,0.1)', padding: '1px 6px', borderRadius: 4 }}>{(testResult as any).serverIp}</code>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-xl)', fontSize: '0.875rem', color: '#1d4ed8' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Cara mendapatkan Secret Key Xendit:</strong>
            <ol style={{ margin: '6px 0 0 16px', lineHeight: 1.8 }}>
              <li>Login ke <a href="https://dashboard.xendit.co" target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>dashboard.xendit.co <ExternalLink size={11} style={{ display: 'inline' }} /></a></li>
              <li>Pergi ke <strong>Settings → API Keys</strong></li>
              <li>Salin <strong>Secret Key</strong> (dimulai dengan <code>xnd_development_</code> atau <code>xnd_production_</code>)</li>
              <li><strong>Jangan gunakan Public Key</strong> (dimulai dengan <code>xnd_public_</code>)</li>
            </ol>
            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(59,130,246,0.1)', borderRadius: '6px' }}>
              <strong>Alternatif via .env:</strong> Tambahkan <code>XENDIT_SECRET_KEY=xnd_development_...</code> di file <code>apps/api/.env</code> — sistem akan otomatis menggunakannya tanpa perlu input di sini.
            </div>
          </div>
        </div>
      </div>

      {/* Config Form */}
      <div className="glass-panel" style={{ maxWidth: '700px' }}>
        <form onSubmit={handleSave} style={{ padding: 'var(--space-xl)' }}>

          {/* Enable Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>Aktifkan Xendit</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Izinkan member membayar via Xendit</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isEnabled} onChange={e => setForm(p => ({ ...p, isEnabled: e.target.checked }))} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', inset: 0, borderRadius: '13px', transition: '0.3s', background: form.isEnabled ? 'var(--success)' : '#d1d5db', border: '1px solid var(--border-subtle)' }}>
                <span style={{ position: 'absolute', top: '3px', left: form.isEnabled ? '25px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: '0.3s' }} />
              </span>
            </label>
          </div>

          {/* Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xl)' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>Mode Production</div>
              <div style={{ fontSize: '0.8rem', color: form.isProduction ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                {form.isProduction ? '⚠️ Transaksi nyata akan diproses!' : 'Mode test — tidak ada biaya nyata'}
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isProduction} onChange={e => setForm(p => ({ ...p, isProduction: e.target.checked }))} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', inset: 0, borderRadius: '13px', transition: '0.3s', background: form.isProduction ? 'var(--warning)' : '#d1d5db', border: '1px solid var(--border-subtle)' }}>
                <span style={{ position: 'absolute', top: '3px', left: form.isProduction ? '25px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: '0.3s' }} />
              </span>
            </label>
          </div>

          {/* Secret Key */}
          <div className="form-group">
            <label className="form-label">
              Secret Key {config?.hasSecretKey && <span style={{ color: 'var(--success)', fontSize: '0.75rem' }}>✓ Sudah diset</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showSecretKey ? 'text' : 'password'}
                className="form-input"
                placeholder={config?.hasSecretKey ? '••••••••••••••••••••• (kosongkan untuk tetap pakai yang lama)' : 'xnd_development_... atau xnd_production_...'}
                value={form.secretKey}
                onChange={e => setForm(p => ({ ...p, secretKey: e.target.value }))}
                style={{ paddingRight: '44px', borderColor: keyError ? 'var(--danger)' : undefined }}
              />
              <button type="button" onClick={() => setShowSecretKey(!showSecretKey)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {keyError ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 500 }}>{keyError}</span>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Dari Xendit Dashboard → Settings → API Keys → Secret Key
              </span>
            )}
          </div>

          {/* Webhook Token */}
          <div className="form-group">
            <label className="form-label">
              Webhook Token {config?.hasWebhookToken && <span style={{ color: 'var(--success)', fontSize: '0.75rem' }}>✓ Sudah diset</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showWebhookToken ? 'text' : 'password'}
                className="form-input"
                placeholder={config?.hasWebhookToken ? '••••••••••••••••••••• (kosongkan untuk tetap pakai yang lama)' : 'Webhook verification token dari Xendit'}
                value={form.webhookToken}
                onChange={e => setForm(p => ({ ...p, webhookToken: e.target.value }))}
                style={{ paddingRight: '44px' }}
              />
              <button type="button" onClick={() => setShowWebhookToken(!showWebhookToken)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                {showWebhookToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Dari Xendit Dashboard → Settings → Webhooks → Verification Token
            </span>
          </div>

          {/* Webhook URL */}
          <div className="form-group">
            <label className="form-label">Webhook URL</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" className="form-input" value={form.webhookUrl} onChange={e => setForm(p => ({ ...p, webhookUrl: e.target.value }))} style={{ flex: 1 }} />
              <button type="button" onClick={() => { navigator.clipboard.writeText(form.webhookUrl); toast.success('URL disalin!'); }} className="btn btn-outline" style={{ flexShrink: 0 }}>
                Salin
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Daftarkan URL ini di Xendit Dashboard → Settings → Webhooks
            </span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-xl)' }}>
            <button type="button" onClick={handleTest} className="btn btn-outline" disabled={testing || !config?.hasSecretKey}>
              {testing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <TestTube size={14} />}
              Test Koneksi
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !!keyError} style={{ minWidth: '160px' }}>
              {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Menyimpan...</> : <><Save size={16} /> Simpan Konfigurasi</>}
            </button>
          </div>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 100% { transform: rotate(360deg); } }`}} />
    </div>
  );
}

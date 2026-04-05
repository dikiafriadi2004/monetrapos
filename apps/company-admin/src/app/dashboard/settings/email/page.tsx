"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Save, Eye, EyeOff, TestTube, CheckCircle, AlertCircle, Loader2, ArrowLeft, Info } from 'lucide-react';
import { api } from '../../../../lib/api';
import toast from 'react-hot-toast';

type Provider = 'mailtrap' | 'gmail' | 'smtp';

interface EmailConfig {
  id?: string;
  provider: Provider;
  isEnabled: boolean;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  fromName?: string;
  fromEmail?: string;
  updatedAt?: string;
}

const PROVIDER_INFO = {
  mailtrap: {
    label: 'Mailtrap',
    badge: '🧪 Testing',
    badgeColor: '#f59e0b',
    desc: 'Untuk development & testing. Email tidak dikirim ke inbox nyata.',
    defaultHost: 'sandbox.smtp.mailtrap.io',
    defaultPort: 2525,
    guide: 'Login ke mailtrap.io → Email Testing → Inboxes → SMTP Settings',
  },
  gmail: {
    label: 'Gmail',
    badge: '🚀 Production',
    badgeColor: '#10b981',
    desc: 'Untuk production. Gunakan App Password (bukan password biasa).',
    defaultHost: 'smtp.gmail.com',
    defaultPort: 587,
    guide: 'Google Account → Security → 2-Step Verification → App Passwords → Generate',
  },
  smtp: {
    label: 'Custom SMTP',
    badge: '⚙️ Custom',
    badgeColor: '#6366f1',
    desc: 'Gunakan SMTP server sendiri (Mailgun, SendGrid, dll).',
    defaultHost: '',
    defaultPort: 587,
    guide: 'Masukkan detail SMTP dari provider email Anda.',
  },
};

export default function EmailSettingsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Provider>('mailtrap');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const [form, setForm] = useState({
    isEnabled: false,
    host: '',
    port: 2525,
    username: '',
    password: '',
    fromName: 'MonetraPOS',
    fromEmail: '',
  });

  useEffect(() => { fetchConfigs(); }, []);

  useEffect(() => {
    const info = PROVIDER_INFO[activeTab];
    const existing = configs.find(c => c.provider === activeTab);
    if (existing) {
      setForm({
        isEnabled: existing.isEnabled,
        host: existing.host || info.defaultHost,
        port: existing.port || info.defaultPort,
        username: existing.username || '',
        password: '',  // never pre-fill password
        fromName: existing.fromName || 'MonetraPOS',
        fromEmail: existing.fromEmail || '',
      });
    } else {
      setForm({
        isEnabled: false,
        host: info.defaultHost,
        port: info.defaultPort,
        username: '',
        password: '',
        fromName: 'MonetraPOS',
        fromEmail: '',
      });
    }
    setTestResult(null);
  }, [activeTab, configs]);

  const fetchConfigs = async () => {
    try {
      const data: any = await api.get('/admin/email/config');
      setConfigs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const payload: any = { ...form };
      if (!payload.password) delete payload.password; // don't overwrite if empty
      await api.put(`/admin/email/config/${activeTab}`, payload);
      toast.success('Konfigurasi email disimpan!');
      await fetchConfigs();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) { toast.error('Masukkan email tujuan test'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const payload: any = {
        provider: activeTab,
        host: form.host,
        port: form.port,
        username: form.username,
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        testTo: testEmail,
      };
      if (form.password) payload.password = form.password;
      const result: any = await api.post('/admin/email/test', payload);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Test gagal' });
    } finally {
      setTesting(false);
    }
  };

  const activeConfig = configs.find(c => c.provider === activeTab);
  const info = PROVIDER_INFO[activeTab];

  if (loading) return (
    <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        <button onClick={() => router.back()} className="btn btn-outline" style={{ padding: '8px' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mail size={22} color="var(--accent-base)" /> Konfigurasi Email
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Atur email untuk verifikasi akun, reset password, dan notifikasi.
          </p>
        </div>
      </div>

      {/* Active config status */}
      {configs.filter(c => c.isEnabled).length > 0 && (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#065f46' }}>
          <CheckCircle size={18} color="#10b981" />
          <span>Email aktif: <strong>{PROVIDER_INFO[configs.find(c => c.isEnabled)?.provider as Provider]?.label}</strong></span>
        </div>
      )}

      {/* Provider Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-xl)' }}>
        {(Object.keys(PROVIDER_INFO) as Provider[]).map(p => {
          const pInfo = PROVIDER_INFO[p];
          const isActive = activeTab === p;
          const hasConfig = configs.some(c => c.provider === p);
          const isEnabled = configs.find(c => c.provider === p)?.isEnabled;
          return (
            <button
              key={p}
              onClick={() => setActiveTab(p)}
              className={`btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
              style={{ position: 'relative' }}
            >
              {pInfo.label}
              {isEnabled && <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', border: '2px solid white' }} />}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--space-xl)', alignItems: 'start' }}>
        {/* Form */}
        <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          {/* Provider badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-lg)' }}>
            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, background: `${info.badgeColor}15`, color: info.badgeColor }}>
              {info.badge}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{info.desc}</span>
          </div>

          {/* Enable toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>Aktifkan {info.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Jadikan sebagai provider email aktif</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isEnabled} onChange={e => setForm(p => ({ ...p, isEnabled: e.target.checked }))} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', inset: 0, borderRadius: '13px', transition: '0.3s', background: form.isEnabled ? 'var(--success)' : '#d1d5db' }}>
                <span style={{ position: 'absolute', top: '3px', left: form.isEnabled ? '25px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: '0.3s' }} />
              </span>
            </label>
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">SMTP Host</label>
              <input className="form-input" value={form.host} onChange={e => setForm(p => ({ ...p, host: e.target.value }))} placeholder={info.defaultHost} />
            </div>
            <div className="form-group">
              <label className="form-label">Port</label>
              <input type="number" className="form-input" value={form.port} onChange={e => setForm(p => ({ ...p, port: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username / Email</label>
            <input className="form-input" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder={activeTab === 'gmail' ? 'your@gmail.com' : 'username dari provider'} />
          </div>

          <div className="form-group">
            <label className="form-label">
              Password {activeConfig?.password ? <span style={{ color: 'var(--success)', fontSize: '0.75rem' }}>✓ Sudah diset</span> : null}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder={activeConfig?.password ? '••••••••• (kosongkan untuk tetap pakai yang lama)' : activeTab === 'gmail' ? 'App Password (bukan password Gmail biasa)' : 'Password SMTP'}
                style={{ paddingRight: '44px' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Nama Pengirim</label>
              <input className="form-input" value={form.fromName} onChange={e => setForm(p => ({ ...p, fromName: e.target.value }))} placeholder="MonetraPOS" />
            </div>
            <div className="form-group">
              <label className="form-label">Email Pengirim</label>
              <input className="form-input" value={form.fromEmail} onChange={e => setForm(p => ({ ...p, fromEmail: e.target.value }))} placeholder="noreply@monetrapos.com" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
            <button onClick={handleSave} className="btn btn-primary" disabled={saving} style={{ minWidth: '140px' }}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>

        {/* Right panel: Guide + Test */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Guide */}
          <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', fontSize: '0.875rem', color: '#1e40af' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Cara mendapatkan credentials:</strong>
                <p style={{ margin: '6px 0 0', lineHeight: 1.7 }}>{info.guide}</p>
                {activeTab === 'gmail' && (
                  <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(239,68,68,0.08)', borderRadius: '6px', color: '#991b1b', fontSize: '0.8rem' }}>
                    ⚠️ Aktifkan 2-Step Verification dulu, lalu buat App Password. Jangan gunakan password Gmail biasa.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Test */}
          <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Test Kirim Email</h3>

            {activeConfig ? (
              <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.82rem', color: '#065f46' }}>
                ✓ Menggunakan config tersimpan: <strong>{activeConfig.username || activeConfig.fromEmail}</strong>
              </div>
            ) : (
              <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.82rem', color: '#92400e' }}>
                ⚠️ Simpan konfigurasi terlebih dahulu sebelum test.
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Kirim test ke email</label>
              <input className="form-input" type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" />
            </div>

            {testResult && (
              <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)', background: testResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${testResult.success ? 'var(--success)' : 'var(--danger)'}`, color: testResult.success ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                {testResult.success ? <CheckCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> : <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />}
                {testResult.message}
              </div>
            )}

            <button onClick={handleTest} className="btn btn-outline" disabled={testing || !activeConfig} style={{ width: '100%' }}>
              {testing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <TestTube size={14} />}
              {testing ? 'Mengirim...' : 'Kirim Test Email'}
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

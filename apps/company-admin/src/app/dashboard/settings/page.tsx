"use client";

import { useState, useEffect } from 'react';
import { Settings, Save, Mail, User, Loader2, CheckCircle, Zap, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../../lib/api';

export default function PlatformSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [adminId, setAdminId] = useState('');

  const [formData, setFormData] = useState({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const data: any = await api.get('/admin/auth/me');
      setAdminId(data.id || '');
      setFormData({ name: data.name || '', email: data.email || '' });
    } catch (err: any) {
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };
  const showError = (msg: string) => { setError(msg); setSuccess(''); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.patch('/admin/auth/me', { name: formData.name });
      showSuccess('Profile berhasil diperbarui');
    } catch (err: any) {
      showError(err?.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { showError('Password baru tidak cocok'); return; }
    if (passwordForm.newPassword.length < 8) { showError('Password minimal 8 karakter'); return; }
    setSavingPassword(true); setError(''); setSuccess('');
    try {
      await api.patch('/admin/auth/me', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      showSuccess('Password berhasil diubah');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      showError(err?.message || 'Gagal mengubah password');
    } finally { setSavingPassword(false); }
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading profile...</div>;
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Settings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your admin profile and platform configuration.</p>
        </div>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Settings size={20} color="var(--text-secondary)" />
        </div>
      </div>

      {/* Alert */}
      {error && <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', marginBottom:16, borderRadius:8, background:'rgba(239,68,68,0.12)', color:'#ef4444', fontSize:'0.875rem' }}>{error}</div>}
      {success && <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', marginBottom:16, borderRadius:8, background:'rgba(16,185,129,0.12)', color:'var(--success)', fontSize:'0.875rem' }}><CheckCircle size={15}/>{success}</div>}

      {/* Platform Settings Card */}
      <Link href="/dashboard/settings/platform" style={{ textDecoration: 'none' }}>
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer', transition: 'border-color var(--transition-fast)', border: '1px solid var(--border-subtle)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-base)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(99,102,241,0.15)', color: 'var(--accent-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Settings size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: '2px' }}>Platform Settings & Admin Users</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Configure platform settings, security, and manage admin users</div>
          </div>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '1.2rem' }}>→</span>
        </div>
      </Link>

      {/* Payment Gateway Card */}
      <Link href="/dashboard/settings/payment-gateway" style={{ textDecoration: 'none' }}>
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer', transition: 'border-color var(--transition-fast)', border: '1px solid var(--border-subtle)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-base)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(99,102,241,0.15)', color: 'var(--accent-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: '2px' }}>Payment Gateway (Xendit)</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Configure Xendit API credentials for subscription payment processing</div>
          </div>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '1.2rem' }}>→</span>
        </div>
      </Link>

      {/* Email Config Card */}
      <Link href="/dashboard/settings/email" style={{ textDecoration: 'none' }}>
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer', transition: 'border-color var(--transition-fast)', border: '1px solid var(--border-subtle)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-base)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mail size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: '2px' }}>Konfigurasi Email</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Setup Mailtrap (testing) atau Gmail (production) untuk email verifikasi & notifikasi</div>
          </div>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '1.2rem' }}>→</span>
        </div>
      </Link>

      {/* Admin Profile */}
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', marginBottom: 'var(--space-lg)' }}>
        <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User size={20} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>My Profile</h3>
        </div>
        <form onSubmit={handleSave} style={{ padding: 'var(--space-lg)' }}>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input type="text" name="name" className="form-input" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" value={formData.email} disabled style={{ opacity: 0.7 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Email tidak dapat diubah</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: '150px' }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} style={{ marginRight: '8px' }} />Simpan</>}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px' }}>
        <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <KeyRound size={20} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Ganti Password</h3>
        </div>
        <form onSubmit={handleChangePassword} style={{ padding: 'var(--space-lg)' }}>
          <div className="form-group">
            <label className="form-label">Password Saat Ini</label>
            <input type="password" className="form-input" value={passwordForm.currentPassword} onChange={e => setPasswordForm(p => ({...p, currentPassword: e.target.value}))} placeholder="Masukkan password saat ini" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password Baru</label>
            <input type="password" className="form-input" value={passwordForm.newPassword} onChange={e => setPasswordForm(p => ({...p, newPassword: e.target.value}))} placeholder="Minimal 8 karakter" required minLength={8} />
          </div>
          <div className="form-group">
            <label className="form-label">Konfirmasi Password Baru</label>
            <input type="password" className="form-input" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(p => ({...p, confirmPassword: e.target.value}))} placeholder="Ulangi password baru" required />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={savingPassword} style={{ minWidth: '150px' }}>
              {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <><KeyRound size={16} style={{ marginRight: '8px' }} />Ganti Password</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

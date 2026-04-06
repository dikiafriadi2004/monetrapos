"use client";

import { useState, useEffect } from 'react';
import { Settings, Save, Mail, User, Loader2, CheckCircle, Zap } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../../lib/api';

export default function PlatformSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [adminId, setAdminId] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data: any = await api.get('/admin/auth/me');
      setAdminId(data.id || '');
      setFormData({
        name: data.name || '',
        email: data.email || '',
      });
    } catch (err: any) {
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId) return;
    setSaving(true);
    setError('');
    setSuccess(false);
    
    try {
      await api.patch(`/admin/users/${adminId}`, { name: formData.name });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
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
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px' }}>
        <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User size={20} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>My Profile</h3>
        </div>
        <form onSubmit={handleSave} style={{ padding: 'var(--space-lg)' }}>
          {error && (
            <div className="badge badge-danger" style={{ display: 'flex', padding: 'var(--space-sm)', marginBottom: 'var(--space-lg)', borderRadius: 'var(--radius-sm)' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: 'var(--space-sm)', marginBottom: 'var(--space-lg)', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
              <CheckCircle size={16} /> Profile updated successfully!
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" name="email" className="form-input" value={formData.email} disabled style={{ opacity: 0.7 }} title="Email cannot be changed" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: '150px' }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} style={{ marginRight: '8px' }} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { Settings, Save, Building, Mail, Phone, MapPin, Loader2, CheckCircle, Zap } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../../lib/api';

export default function PlatformSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data: any = await api.get('/companies/profile');
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || ''
      });
    } catch (err: any) {
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    
    try {
      await api.patch('/companies/profile', formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading profile securely...</div>;
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Platform Settings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your organization's core profile and contact information.</p>
        </div>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Settings size={20} color="var(--text-secondary)" />
        </div>
      </div>

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

      <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSave}>
          
          {error && (
            <div className="badge badge-danger" style={{ display: 'flex', padding: 'var(--space-sm)', marginBottom: 'var(--space-lg)', borderRadius: 'var(--radius-sm)' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="badge badge-success flex-center" style={{ padding: 'var(--space-sm)', marginBottom: 'var(--space-lg)', borderRadius: 'var(--radius-sm)', gap: '8px', justifyContent: 'flex-start', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
              <CheckCircle size={16} /> Profile updated successfully!
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
            <div className="form-group">
              <label className="form-label">Platform / Company Name</label>
              <div style={{ position: 'relative' }}>
                <Building size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input 
                  type="text" 
                  name="name"
                  className="form-input" 
                  value={formData.name}
                  onChange={handleChange}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Admin Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input 
                  type="email" 
                  name="email"
                  className="form-input" 
                  value={formData.email}
                  onChange={handleChange}
                  style={{ paddingLeft: '2.5rem', opacity: 0.7 }}
                  disabled
                  title="Email cannot be changed directly"
                />
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
            <label className="form-label">Contact Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                name="phone"
                className="form-input" 
                placeholder="+62 8..."
                value={formData.phone}
                onChange={handleChange}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-xl)' }}>
            <label className="form-label">Headquarters Address</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-tertiary)' }} />
              <textarea 
                name="address"
                className="form-input" 
                placeholder="Full operational address..."
                value={formData.address}
                onChange={handleChange}
                style={{ paddingLeft: '2.5rem', minHeight: '100px', resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving}
              style={{ minWidth: '150px' }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} style={{ marginRight: '8px' }} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
}

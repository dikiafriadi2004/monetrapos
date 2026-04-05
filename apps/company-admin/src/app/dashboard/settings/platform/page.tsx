"use client";

import { useState, useEffect } from 'react';
import { Settings, Save, Mail, Globe, Shield, User, Plus, Edit, Trash2, X } from 'lucide-react';
import { api } from '../../../../lib/api';
import toast from 'react-hot-toast';

interface PlatformSettings {
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  supportPhone: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpFrom: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export default function PlatformSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'email' | 'security' | 'admins'>('general');
  const [settings, setSettings] = useState<PlatformSettings>({
    siteName: 'MonetraPOS',
    siteUrl: 'https://MonetraPOS.com',
    supportEmail: 'support@monetrapos.com',
    supportPhone: '+62 812-3456-7890',
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: '',
    smtpFrom: 'noreply@monetrapos.com',
  });
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Admin modal
  const [isAdminModalOpen, setAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', role: 'ADMIN' });

  useEffect(() => {
    fetchSettings();
    if (activeTab === 'admins') fetchAdmins();
  }, [activeTab]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/admin/settings');
      if (data) setSettings(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error('Failed to fetch settings', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const data: any = await api.get('/admin/users');
      setAdmins(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch admins', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/admin/settings', settings);
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    toast('Email testing requires SMTP configuration in server environment variables.', { icon: 'ℹ️' });
  };

  const openAdminModal = (admin?: AdminUser) => {
    if (admin) {
      setEditingAdmin(admin);
      setAdminForm({ name: admin.name, email: admin.email, password: '', role: admin.role });
    } else {
      setEditingAdmin(null);
      setAdminForm({ name: '', email: '', password: '', role: 'ADMIN' });
    }
    setAdminModalOpen(true);
  };

  const handleSaveAdmin = async () => {
    if (!adminForm.name || !adminForm.email || (!editingAdmin && !adminForm.password)) return;
    try {
      if (editingAdmin) {
        await api.patch(`/admin/users/${editingAdmin.id}`, adminForm);
      } else {
        await api.post('/admin/users', adminForm);
      }
      await fetchAdmins();
      setAdminModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save admin user');
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!confirm('Delete this admin user?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setAdmins(prev => prev.filter(a => a.id !== id));
      toast.success('Admin deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete admin');
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'admins', label: 'Admin Users', icon: User },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={24} /> Platform Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure platform-wide settings, email, security, and admin users.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', borderBottom: '2px solid var(--border-subtle)' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-base)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--accent-base)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                fontWeight: activeTab === tab.id ? 600 : 400,
                marginBottom: '-2px',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={20} /> General Configuration
          </h3>

          <div className="form-group">
            <label className="form-label">Site Name</label>
            <input
              className="form-input"
              placeholder="MonetraPOS"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Site URL</label>
            <input
              className="form-input"
              type="url"
              placeholder="https://MonetraPOS.com"
              value={settings.siteUrl}
              onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
            />
          </div>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">Support Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="support@monetrapos.com"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Support Phone</label>
              <input
                className="form-input"
                placeholder="+62 812-3456-7890"
                value={settings.supportPhone}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-subtle)' }}>
            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save General Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Email Settings */}
      {activeTab === 'email' && (
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={20} /> SMTP Email Configuration
          </h3>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">SMTP Host</label>
              <input
                className="form-input"
                placeholder="smtp.gmail.com"
                value={settings.smtpHost}
                onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">SMTP Port</label>
              <input
                className="form-input"
                type="number"
                placeholder="587"
                value={settings.smtpPort}
                onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">SMTP Username</label>
            <input
              className="form-input"
              placeholder="your-email@gmail.com"
              value={settings.smtpUser}
              onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">From Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="noreply@monetrapos.com"
              value={settings.smtpFrom}
              onChange={(e) => setSettings({ ...settings, smtpFrom: e.target.value })}
            />
          </div>

          <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 'var(--space-md)' }}>
            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Email Settings'}
            </button>
            <button onClick={handleTestEmail} className="btn btn-outline">
              <Mail size={16} /> Send Test Email
            </button>
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} /> Security & Access Control
          </h3>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-base)' }}
              />
              <div>
                <div style={{ fontWeight: 500 }}>Maintenance Mode</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Temporarily disable platform access for all members</div>
              </div>
            </label>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.allowRegistration}
                onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-base)' }}
              />
              <div>
                <div style={{ fontWeight: 500 }}>Allow Member Registration</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Enable public registration for new members</div>
              </div>
            </label>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.requireEmailVerification}
                onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-base)' }}
              />
              <div>
                <div style={{ fontWeight: 500 }}>Require Email Verification</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Members must verify email before accessing platform</div>
              </div>
            </label>
          </div>

          <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-subtle)' }}>
            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Security Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Admin Users */}
      {activeTab === 'admins' && (
        <div className="glass-panel animate-fade-in" style={{ padding: 0 }}>
          <div className="flex-between" style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} /> Admin Users
            </h3>
            <button onClick={() => openAdminModal()} className="btn btn-primary">
              <Plus size={16} /> Add Admin
            </button>
          </div>

          {admins.length === 0 ? (
            <div className="flex-center" style={{ height: '300px', flexDirection: 'column' }}>
              <User size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }} />
              <p style={{ color: 'var(--text-tertiary)' }}>No admin users found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {admins.map(admin => (
                <div key={admin.id} style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{admin.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{admin.email}</div>
                  </div>
                  <div style={{ marginRight: 'var(--space-lg)' }}>
                    <span className="badge badge-primary">{admin.role}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button onClick={() => openAdminModal(admin)} className="btn btn-outline" style={{ padding: '6px 12px' }}>
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDeleteAdmin(admin.id)} className="btn btn-outline" style={{ padding: '6px 12px', color: 'var(--danger)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Modal */}
      {isAdminModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setAdminModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: '480px', maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ fontSize: '1.25rem' }}>{editingAdmin ? 'Edit Admin' : 'Add Admin User'}</h3>
              <button onClick={() => setAdminModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={adminForm.name} onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={adminForm.email} onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Password {editingAdmin && '(leave blank to keep current)'}</label>
              <input className="form-input" type="password" value={adminForm.password} onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={adminForm.role} onChange={e => setAdminForm(p => ({ ...p, role: e.target.value }))}>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setAdminModalOpen(false)} className="btn btn-outline">Cancel</button>
              <button onClick={handleSaveAdmin} className="btn btn-primary">
                {editingAdmin ? 'Update' : 'Create'} Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


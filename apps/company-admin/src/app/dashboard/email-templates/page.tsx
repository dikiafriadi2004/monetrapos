"use client";

import { useState, useEffect } from 'react';
import { Mail, Edit, Save, X, RefreshCcw, Eye, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
  isActive: boolean;
  variables?: string[];
}

const TEMPLATE_TYPES: Record<string, { label: string; desc: string; emoji: string }> = {
  welcome:              { label: 'Selamat Datang',        desc: 'Email saat member baru mendaftar',           emoji: '👋' },
  email_verification:   { label: 'Verifikasi Email',      desc: 'Link verifikasi email setelah registrasi',   emoji: '✉️' },
  invoice:              { label: 'Invoice',               desc: 'Invoice subscription yang dikirim ke member', emoji: '🧾' },
  payment_success:      { label: 'Pembayaran Berhasil',   desc: 'Konfirmasi setelah pembayaran sukses',        emoji: '✅' },
  subscription_expiry:  { label: 'Subscription Hampir Habis', desc: 'Reminder 7 hari sebelum expired',        emoji: '⏰' },
  subscription_expired: { label: 'Subscription Expired', desc: 'Notifikasi saat subscription habis',          emoji: '🔴' },
  password_reset:       { label: 'Reset Password',        desc: 'Link reset password',                        emoji: '🔑' },
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({ subject: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<EmailTemplate | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/admin/email-templates');
      setTemplates(Array.isArray(data) ? data : []);
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openEdit = (t: EmailTemplate) => {
    setEditing(t);
    setForm({ subject: t.subject, body: t.body });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/admin/email-templates/${editing.id}`, form);
      toast.success('Template berhasil disimpan');
      setTemplates(prev => prev.map(t => t.id === editing.id ? { ...t, ...form } : t));
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan template');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mail size={24} color="var(--accent-base)" /> Email Templates
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Kelola template email yang dikirim ke member.</p>
        </div>
        <button onClick={fetchTemplates} className="btn btn-outline btn-sm"><RefreshCcw size={14} /></button>
      </div>

      {loading ? (
        <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
          {Object.entries(TEMPLATE_TYPES).map(([type, info]) => {
            const template = templates.find(t => t.type === type);
            return (
              <div key={type} className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 'var(--space-md)' }}>
                  <span style={{ fontSize: '1.75rem' }}>{info.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{info.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{info.desc}</div>
                  </div>
                  <span className={`badge ${template?.isActive !== false ? 'badge-success' : 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>
                    {template?.isActive !== false ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                {template ? (
                  <>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <strong>Subject:</strong> {template.subject}
                    </div>
                    {template.variables && template.variables.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 'var(--space-md)' }}>
                        {template.variables.map(v => (
                          <span key={v} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(99,102,241,0.1)', color: 'var(--accent-base)', borderRadius: 4, fontFamily: 'monospace' }}>
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setPreview(template)} className="btn btn-outline btn-sm" style={{ flex: 1 }}>
                        <Eye size={13} /> Preview
                      </button>
                      <button onClick={() => openEdit(template)} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                        <Edit size={13} /> Edit
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                    Template belum dikonfigurasi
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setEditing(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel" style={{ position: 'relative', width: 700, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-xl)', zIndex: 9001 }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Edit Template: {TEMPLATE_TYPES[editing.type]?.label || editing.name}</h3>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Subject Email</label>
              <input className="form-input" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Body Email (HTML)</label>
              <textarea className="form-input" rows={15} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} style={{ fontFamily: 'monospace', fontSize: '0.85rem', resize: 'vertical' }} />
              {editing.variables && editing.variables.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Variabel tersedia: </span>
                  {editing.variables.map(v => (
                    <span key={v} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(99,102,241,0.1)', color: 'var(--accent-base)', borderRadius: 4, fontFamily: 'monospace', marginLeft: 4 }}>
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} className="btn btn-outline">Batal</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                Simpan Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setPreview(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel" style={{ position: 'relative', width: 700, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-xl)', zIndex: 9001 }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Preview: {preview.subject}</h3>
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                <strong>Subject:</strong> {preview.subject}
              </div>
              <div style={{ padding: 'var(--space-lg)' }} dangerouslySetInnerHTML={{ __html: preview.body }} />
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

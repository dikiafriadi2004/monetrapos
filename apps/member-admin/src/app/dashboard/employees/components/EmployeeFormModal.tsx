"use client";

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

interface Store { id: string; name: string; }

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  roles: any[];
}

export function EmployeeFormModal({ isOpen, onClose, onSubmit, initialData, roles }: EmployeeFormModalProps) {
  const { storeId: activeStoreId } = useStore();
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    position: '',
    storeId: '',
    hireDate: today,
    salary: '',
    pin: '',
    role: 'cashier',
  });

  // Load stores
  useEffect(() => {
    if (!isOpen) return;
    apiClient.get('/stores').then((r: any) => {
      const list = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      setStores(list);
    }).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        password: '',
        position: initialData.position || '',
        storeId: initialData.storeId || initialData.store?.id || activeStoreId || '',
        hireDate: initialData.hireDate
          ? (typeof initialData.hireDate === 'string'
              ? initialData.hireDate.split('T')[0]
              : new Date(initialData.hireDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }))
          : today,
        salary: initialData.salary ? String(initialData.salary) : '',
        pin: initialData.pin || '',
        role: initialData.user?.role || (typeof initialData.role === 'string' ? initialData.role : '') || 'cashier',
      });
    } else {
      setForm({
        name: '', email: '', phone: '', password: '', position: '',
        storeId: activeStoreId || '',
        hireDate: today,
        salary: '', pin: '',
        role: 'cashier',
      });
    }
  }, [initialData, isOpen, activeStoreId]);

  if (!isOpen) return null;

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeId) { toast.error('Pilih toko terlebih dahulu'); return; }
    if (!form.hireDate) { toast.error('Tanggal mulai kerja wajib diisi'); return; }
    setLoading(true);
    try {
      const payload: any = {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        position: form.position || undefined,
        storeId: form.storeId,
        hireDate: form.hireDate,
        salary: form.salary ? Number(form.salary) : undefined,
        pin: form.pin || undefined,
        role: form.role,
      };
      console.log('[EmployeeFormModal] submitting payload:', JSON.stringify(payload));
      // Password hanya saat create atau jika diisi saat edit
      if (!initialData) {
        if (!form.password) { toast.error('Password wajib diisi untuk karyawan baru'); setLoading(false); return; }
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
      }
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      console.error('[EmployeeFormModal] error:', err);
      toast.error(err?.response?.data?.message || 'Gagal menyimpan data karyawan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-xl)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={22} />
        </button>

        <h2 style={{ marginBottom: 'var(--space-lg)', fontSize: '1.3rem' }}>
          {initialData ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Nama */}
          <div className="form-group">
            <label className="form-label">Nama Lengkap *</label>
            <input type="text" className="form-input" required placeholder="Contoh: Budi Santoso"
              value={form.name} onChange={e => f('name', e.target.value)} />
          </div>

          {/* Email & Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="email@toko.com"
                value={form.email} onChange={e => f('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">No. HP</label>
              <input type="tel" className="form-input" placeholder="08xxxxxxxxxx"
                value={form.phone} onChange={e => f('phone', e.target.value)} />
            </div>
          </div>

          {/* Toko & Posisi */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">Toko *</label>
              <select className="form-input" required value={form.storeId} onChange={e => f('storeId', e.target.value)}>
                <option value="">Pilih toko...</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Posisi / Jabatan</label>
              <input type="text" className="form-input" placeholder="Kasir, Manajer, dll"
                value={form.position} onChange={e => f('position', e.target.value)} />
            </div>
          </div>

          {/* Role & Gaji */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">Role / Hak Akses *</label>
              <select className="form-input" required value={form.role} onChange={e => f('role', e.target.value)}>
                <option value="cashier">Cashier (Kasir)</option>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="accountant">Accountant (Akuntan)</option>
                <option value="admin">Admin</option>
              </select>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 3 }}>
                Role saat ini: <strong>{form.role || '(kosong)'}</strong>
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Gaji Bulanan (Rp)</label>
              <input type="number" className="form-input" placeholder="5000000" min="0"
                value={form.salary} onChange={e => f('salary', e.target.value)} />
            </div>
          </div>

          {/* Tanggal Mulai Kerja */}
          <div className="form-group">
            <label className="form-label">Tanggal Mulai Kerja *</label>
            <input type="date" className="form-input" required
              value={form.hireDate} onChange={e => f('hireDate', e.target.value)} />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">
              {initialData ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password Login *'}
            </label>
            <input type="password" className="form-input"
              placeholder={initialData ? 'Kosongkan jika tidak diubah' : 'Min. 6 karakter'}
              value={form.password} onChange={e => f('password', e.target.value)}
              required={!initialData} minLength={6} />
            {!initialData && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                Berikan password ini kepada karyawan untuk login pertama kali.
              </p>
            )}
          </div>

          {/* PIN */}
          <div className="form-group">
            <label className="form-label">PIN Kasir (Opsional)</label>
            <input type="text" className="form-input" placeholder="6 digit angka" maxLength={6}
              pattern="[0-9]*" inputMode="numeric"
              value={form.pin} onChange={e => f('pin', e.target.value.replace(/\D/g, ''))} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
              PIN digunakan untuk login cepat di POS tanpa email/password.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {loading ? 'Menyimpan...' : (initialData ? 'Simpan Perubahan' : 'Tambah Karyawan')}
            </button>
          </div>
        </form>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
      </div>
    </div>
  );
}

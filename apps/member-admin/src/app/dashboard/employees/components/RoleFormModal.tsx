"use client";

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

interface Permission {
  id: string;
  code: string;
  name: string;
  category: string;
}

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
}

export function RoleFormModal({ isOpen, onClose, onSubmit, initialData }: RoleFormModalProps) {
  const { storeId } = useStore();
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissionIds: [] as string[],
  });

  // Load permissions dari backend
  useEffect(() => {
    if (!isOpen) return;
    apiClient.get('/roles/permissions').then((r: any) => {
      const list = Array.isArray(r.data) ? r.data : [];
      setPermissions(list);
    }).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      // permissions bisa berupa array of {id, name} atau array of string
      const ids = (initialData.permissions || []).map((p: any) =>
        typeof p === 'string' ? p : (p.id || p.code || '')
      ).filter(Boolean);
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        permissionIds: ids,
      });
    } else {
      setFormData({ name: '', description: '', permissionIds: [] });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const togglePermission = (id: string) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(id)
        ? prev.permissionIds.filter(p => p !== id)
        : [...prev.permissionIds, id],
    }));
  };

  const toggleCategory = (category: string) => {
    const catIds = permissions.filter(p => p.category === category).map(p => p.id);
    const allSelected = catIds.every(id => formData.permissionIds.includes(id));
    setFormData(prev => ({
      ...prev,
      permissionIds: allSelected
        ? prev.permissionIds.filter(id => !catIds.includes(id))
        : [...new Set([...prev.permissionIds, ...catIds])],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Nama role wajib diisi'); return; }
    setLoading(true);
    try {
      await onSubmit({
        name: formData.name,
        description: formData.description,
        storeId: storeId || undefined,
        permissionIds: formData.permissionIds,
      });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan role');
    } finally {
      setLoading(false);
    }
  };

  // Group permissions by category
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-xl)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={22} />
        </button>

        <h2 style={{ marginBottom: 'var(--space-lg)', fontSize: '1.3rem' }}>
          {initialData ? 'Edit Role' : 'Buat Role Baru'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label className="form-label">Nama Role *</label>
            <input type="text" className="form-input" required placeholder="Contoh: Kasir Senior"
              value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Deskripsi</label>
            <input type="text" className="form-input" placeholder="Deskripsi singkat role ini..."
              value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">
              Hak Akses (Permissions)
              <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>
                {formData.permissionIds.length} dipilih
              </span>
            </label>

            {permissions.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Memuat permissions...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(grouped).map(([category, perms]) => {
                  const catIds = perms.map(p => p.id);
                  const allSelected = catIds.every(id => formData.permissionIds.includes(id));
                  const someSelected = catIds.some(id => formData.permissionIds.includes(id));
                  return (
                    <div key={category} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                      {/* Category header */}
                      <div
                        onClick={() => toggleCategory(category)}
                        style={{ padding: '8px 12px', background: allSelected ? 'rgba(99,102,241,0.08)' : 'var(--bg-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none' }}
                      >
                        <input type="checkbox" readOnly checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                          style={{ width: 15, height: 15, cursor: 'pointer' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: allSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                          {category}
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                          {catIds.filter(id => formData.permissionIds.includes(id)).length}/{catIds.length}
                        </span>
                      </div>
                      {/* Permissions */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                        {perms.map(perm => (
                          <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', fontSize: '0.82rem', borderTop: '1px solid var(--border-subtle)', background: formData.permissionIds.includes(perm.id) ? 'rgba(99,102,241,0.04)' : undefined }}>
                            <input type="checkbox" checked={formData.permissionIds.includes(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                              style={{ width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
                            <span style={{ color: formData.permissionIds.includes(perm.id) ? 'var(--primary)' : 'var(--text-secondary)' }}>
                              {perm.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {loading ? 'Menyimpan...' : (initialData ? 'Simpan Perubahan' : 'Buat Role')}
            </button>
          </div>
        </form>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
      </div>
    </div>
  );
}

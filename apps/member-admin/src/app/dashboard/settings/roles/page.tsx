'use client';

import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Loader2, X, ChevronDown, ChevronRight } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useStore } from '@/hooks/useStore';
import toast from 'react-hot-toast';

interface Permission {
  id: string;
  name: string;
  code?: string;
  description?: string;
  module?: string;
  category?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  storeId: string;
  isDefault: boolean;
  permissions?: Permission[];
}

export default function RolesPage() {
  const { storeId: defaultStoreId, stores } = useStore();
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{ open: boolean; editing: Role | null }>({ open: false, editing: null });
  const [form, setForm] = useState({ name: '', description: '', permissionIds: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [storeId, setStoreId] = useState('');

  // Auto-set storeId from hook
  useEffect(() => {
    if (defaultStoreId && !storeId) setStoreId(defaultStoreId);
  }, [defaultStoreId]);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (storeId) loadRoles();
  }, [storeId]);

  const loadInitial = async () => {
    try {
      const permRes = await apiClient.get('/roles/permissions').catch(() => ({ data: [] }));
      setAllPermissions(Array.isArray(permRes.data) ? permRes.data : []);
    } catch { console.error('Failed to load permissions'); }
    finally { setLoading(false); }
  };

  const loadRoles = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/roles?storeId=${storeId}`);
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error('Failed to load roles'); }
    finally { setLoading(false); }
  };

  const openModal = (role?: Role) => {
    setForm(role
      ? { name: role.name, description: role.description || '', permissionIds: role.permissions?.map(p => p.id) || [] }
      : { name: '', description: '', permissionIds: [] }
    );
    setModal({ open: true, editing: role || null });
  };

  const save = async () => {
    if (!form.name || !storeId) { toast.error('Name and store ID required'); return; }
    setSaving(true);
    try {
      if (modal.editing) {
        await apiClient.patch(`/roles/${modal.editing.id}`, { name: form.name, description: form.description, permissionIds: form.permissionIds });
        toast.success('Role updated');
      } else {
        await apiClient.post('/roles', { name: form.name, description: form.description, storeId, permissionIds: form.permissionIds });
        toast.success('Role created');
      }
      await loadRoles();
      setModal({ open: false, editing: null });
    } catch { toast.error('Failed to save role'); }
    finally { setSaving(false); }
  };

  const remove = async (role: Role) => {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await apiClient.delete(`/roles/${role.id}`);
      toast.success('Role deleted');
      setRoles(prev => prev.filter(r => r.id !== role.id));
    } catch { toast.error('Failed to delete role'); }
  };

  const togglePermission = (id: string) => {
    setForm(p => ({
      ...p,
      permissionIds: p.permissionIds.includes(id)
        ? p.permissionIds.filter(x => x !== id)
        : [...p.permissionIds, id],
    }));
  };

  // Group permissions by category/module
  const permissionsByModule = allPermissions.reduce((acc, p) => {
    const mod = (p as any).category || (p as any).module || p.name.split('.')[0] || 'general';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={24} style={{ color: 'var(--primary)' }} /> Roles & Permissions
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage employee roles and access permissions</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary" disabled={!storeId}>
          <Plus size={16} /> New Role
        </button>
      </div>

      {/* Store selector */}
      <div className="glass-panel" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap' }}>Store:</label>
        {stores.length > 0 ? (
          <select className="form-input" style={{ maxWidth: 320 }} value={storeId} onChange={e => setStoreId(e.target.value)}>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        ) : (
          <input className="form-input" style={{ maxWidth: 320 }} placeholder="Enter store ID..." value={storeId} onChange={e => setStoreId(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadRoles()} />
        )}
        <button onClick={loadRoles} className="btn btn-outline" disabled={!storeId}>Load</button>
      </div>

      {loading && storeId ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
        </div>
      ) : !storeId ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <Shield size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Enter a Store ID above to manage roles</p>
        </div>
      ) : roles.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <Shield size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>No roles yet for this store</p>
          <button onClick={() => openModal()} className="btn btn-primary"><Plus size={16} /> Create First Role</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {roles.map(role => (
            <div key={role.id} className="glass-panel" style={{ padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-md) var(--space-lg)', cursor: 'pointer' }}
                onClick={() => setExpanded(prev => { const n = new Set(prev); n.has(role.id) ? n.delete(role.id) : n.add(role.id); return n; })}>
                <div style={{ marginRight: 8, color: 'var(--text-tertiary)' }}>
                  {expanded.has(role.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{role.name}</span>
                    {role.isDefault && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>Default</span>}
                  </div>
                  {role.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{role.description}</div>}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{role.permissions?.length || 0} permissions</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => openModal(role)} className="btn btn-outline" style={{ height: 30, padding: '0 10px', fontSize: '0.8rem' }}><Edit2 size={13} /></button>
                  {!role.isDefault && <button onClick={() => remove(role)} style={{ height: 30, padding: '0 10px', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={13} /></button>}
                </div>
              </div>
              {expanded.has(role.id) && role.permissions && role.permissions.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 'var(--space-md) var(--space-lg)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {role.permissions.map(p => (
                    <span key={p.id} style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{p.name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setModal({ open: false, editing: null })} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 600, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.1rem' }}>{modal.editing ? 'Edit Role' : 'New Role'}</h3>
              <button onClick={() => setModal({ open: false, editing: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Role Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Cashier, Manager" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Role description..." />
            </div>

            {allPermissions.length > 0 && (
              <div className="form-group">
                <label className="form-label">Permissions</label>
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', maxHeight: 300, overflowY: 'auto' }}>
                  {Object.entries(permissionsByModule).map(([module, perms]) => (
                    <div key={module}>
                      <div style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                        {module}
                      </div>
                      {perms.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                          <input type="checkbox" checked={form.permissionIds.includes(p.id)} onChange={() => togglePermission(p.id)} />
                          <div>
                            <div style={{ fontWeight: 500 }}>{p.name}</div>
                            {p.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{p.description}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{form.permissionIds.length} permissions selected</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setModal({ open: false, editing: null })} className="btn btn-outline">Cancel</button>
              <button onClick={save} className="btn btn-primary" disabled={saving || !form.name}>
                {saving ? 'Saving...' : modal.editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

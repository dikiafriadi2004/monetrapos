'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Loader2, Key, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Modal, DeleteModal, PageHeader, SearchInput, StatusBadge, EmptyState, LoadingSpinner } from '@/components/ui';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'owner' | 'admin' | 'manager' | 'cashier' | 'staff';
  isActive: boolean;
  emailVerified?: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'badge-primary',
  manager: 'badge-info',
  cashier: 'badge-success',
  staff: 'badge-gray',
};

const ROLES = ['admin', 'manager', 'cashier', 'staff'];

const emptyForm = { name: '', email: '', phone: '', role: 'cashier' as User['role'], password: '' };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: User | null }>({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [deleting, setDeleting] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : ((res.data as any)?.data || []));
    } catch (err: any) {
      console.error('Failed to load users:', err);
      toast.error(err?.response?.data?.message || 'Failed to load users');
    } finally { setLoading(false); }
  };

  const openModal = (u?: User) => {
    setForm(u ? { name: u.name, email: u.email, phone: u.phone || '', role: u.role, password: '' } : emptyForm);
    setModal({ open: true, editing: u || null });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) { toast.error('Name and email are required'); return; }
    if (!modal.editing && !form.password) { toast.error('Password is required for new users'); return; }
    setSaving(true);
    try {
      if (modal.editing) {
        const payload: any = { name: form.name, phone: form.phone, role: form.role };
        await apiClient.put(`/users/${modal.editing.id}`, payload);
        toast.success('User updated');
      } else {
        await apiClient.post('/users', { name: form.name, email: form.email, phone: form.phone, role: form.role, password: form.password });
        toast.success('User created');
      }
      await load();
      setModal({ open: false, editing: null });
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to save user'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteModal.user) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/users/${deleteModal.user.id}`);
      toast.success('User deleted');
      setUsers(prev => prev.filter(u => u.id !== deleteModal.user!.id));
      setDeleteModal({ open: false, user: null });
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to delete user'); }
    finally { setDeleting(false); }
  };

  const handleToggleActive = async (user: User) => {
    setTogglingId(user.id);
    try {
      await apiClient.put(`/users/${user.id}`, { isActive: !user.isActive });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
      toast.success(user.isActive ? 'User deactivated' : 'User activated');
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to update user'); }
    finally { setTogglingId(null); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!passwordModal.user) return;
    setChangingPassword(true);
    try {
      await apiClient.put(`/users/${passwordModal.user.id}/password`, { newPassword });
      toast.success('Password changed successfully');
      setPasswordModal({ open: false, user: null });
      setNewPassword('');
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to change password'); }
    finally { setChangingPassword(false); }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.phone || '').includes(search)
  );

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' });

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Manage user accounts and their access roles"
        action={<button onClick={() => openModal()} className="btn btn-primary"><Plus size={16} /> Add User</button>}
      />

      <div className="flex gap-3 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or phone..." className="flex-1 max-w-md" />
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={Users} title={search ? 'No users match your search' : 'No users yet'}
          action={!search ? <button onClick={() => openModal()} className="btn btn-primary btn-sm"><Plus size={14} /> Add First User</button> : undefined} />
      ) : (
        <div className="card">
          <div className="table-container border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Email Verified</th>
                  <th>Last Login</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                          {u.phone && <div className="text-xs text-gray-400">{u.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'} capitalize`}>{u.role}</span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={togglingId === u.id || u.role === 'owner'}
                        className={`badge cursor-pointer border-0 ${u.isActive ? 'badge-success' : 'badge-gray'} ${togglingId === u.id ? 'opacity-50' : ''} ${u.role === 'owner' ? 'cursor-not-allowed' : ''}`}
                        title={u.role === 'owner' ? 'Cannot deactivate owner' : undefined}
                      >
                        {togglingId === u.id ? '...' : u.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <span className={`badge ${u.emailVerified ? 'badge-success' : 'badge-warning'}`}>
                        {u.emailVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="text-gray-500 text-sm">{u.lastLoginAt ? fmtDate(u.lastLoginAt) : '—'}</td>
                    <td className="text-gray-500 text-sm">{fmtDate(u.createdAt)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openModal(u)} className="btn btn-ghost btn-icon btn-sm" title="Edit"><Edit2 size={14} /></button>
                        <button onClick={() => setPasswordModal({ open: true, user: u })} className="btn btn-ghost btn-icon btn-sm text-amber-500" title="Change Password"><Key size={14} /></button>
                        {u.role !== 'owner' && (
                          <button onClick={() => setDeleteModal({ open: true, user: u })} className="btn btn-ghost btn-icon btn-sm text-red-500" title="Delete"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? 'Edit User' : 'Add New User'}
        footer={
          <>
            <button onClick={() => setModal({ open: false, editing: null })} className="btn btn-outline">Cancel</button>
            <button form="user-form" type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {modal.editing ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={save} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. John Doe" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input type="email" className="form-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="john@example.com" required disabled={!!modal.editing} />
            {modal.editing && <p className="form-hint">Email cannot be changed after creation</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+628123456789" />
          </div>
          <div className="form-group">
            <label className="form-label">Role *</label>
            <select className="form-input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as User['role'] }))}>
              {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          {!modal.editing && (
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input type="password" className="form-input" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Minimum 8 characters" required minLength={8} />
              <p className="form-hint">User will be able to change this after first login</p>
            </div>
          )}
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        open={passwordModal.open}
        onClose={() => { setPasswordModal({ open: false, user: null }); setNewPassword(''); }}
        title={`Change Password — ${passwordModal.user?.name}`}
        footer={
          <>
            <button onClick={() => { setPasswordModal({ open: false, user: null }); setNewPassword(''); }} className="btn btn-outline">Cancel</button>
            <button form="password-form" type="submit" className="btn btn-warning" disabled={changingPassword}>
              {changingPassword ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
              Change Password
            </button>
          </>
        }
      >
        <form id="password-form" onSubmit={handleChangePassword} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            You are changing the password for <strong>{passwordModal.user?.name}</strong>. They will need to use the new password on their next login.
          </div>
          <div className="form-group">
            <label className="form-label">New Password *</label>
            <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" required minLength={8} autoFocus />
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <DeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, user: null })}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete User"
        description={`Delete user "${deleteModal.user?.name}"? They will lose access immediately. This cannot be undone.`}
      />
    </div>
  );
}

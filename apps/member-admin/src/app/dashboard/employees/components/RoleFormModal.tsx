"use client";

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'pos.access', label: 'Access Point of Sale' },
  { id: 'products.read', label: 'View Products' },
  { id: 'products.write', label: 'Manage Products' },
  { id: 'transactions.read', label: 'View Transactions' },
  { id: 'transactions.refund', label: 'Process Refunds' },
  { id: 'roles.manage', label: 'Manage Roles' },
  { id: 'employees.manage', label: 'Manage Staff' },
];

export function RoleFormModal({ isOpen, onClose, onSubmit, initialData }: RoleFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        permissions: initialData.permissions?.map((p: any) => p.name) || []
      });
    } else {
      setFormData({ name: '', description: '', permissions: [] });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      console.error('Failed to save role:', err);
      toast.error(err?.response?.data?.message || 'Failed to save role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: 'var(--space-md)'
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '540px', padding: 'var(--space-xl)', position: 'relative' }}>
        
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: 'var(--space-lg)', right: 'var(--space-lg)', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: 'var(--space-xl)', fontSize: '1.5rem' }}>
          {initialData ? 'Edit Role' : 'Create Custom Role'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          
          <div className="form-group">
            <label className="form-label">Role Name *</label>
            <input 
              type="text" className="form-input" required placeholder="e.g. Senior Cashier"
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input 
              type="text" className="form-input" placeholder="Role description..."
              value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="form-group" style={{ margin: 'var(--space-sm) 0' }}>
            <label className="form-label">Permissions Assignment</label>
            <div style={{ 
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', 
              background: 'rgba(255,255,255,0.02)', padding: 'var(--space-md)', 
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' 
            }}>
              {AVAILABLE_PERMISSIONS.map(perm => (
                <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.permissions.includes(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  {perm.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex-between" style={{ gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2, background: 'var(--success)', border: 'none' }} disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : (initialData ? 'Save Changes' : 'Create Role')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

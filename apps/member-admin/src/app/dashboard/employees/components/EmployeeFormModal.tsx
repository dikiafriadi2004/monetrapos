"use client";

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  roles: any[];
}

export function EmployeeFormModal({ isOpen, onClose, onSubmit, initialData, roles }: EmployeeFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        password: '', // Password is empty on edit to prevent accidental changes
        roleId: initialData.roleId || ''
      });
    } else {
      setFormData({ name: '', email: '', password: '', roleId: '' });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Clean up empty password field if editing
      const finalData = { ...formData };
      if (initialData && !finalData.password) {
        delete (finalData as any).password;
      }
      
      await onSubmit(finalData);
      onClose();
    } catch (err: any) {
      console.error('Failed to save employee:', err);
      toast.error(err?.response?.data?.message || 'Failed to save employee data');
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
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: 'var(--space-xl)', position: 'relative' }}>
        
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: 'var(--space-lg)', right: 'var(--space-lg)', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: 'var(--space-xl)', fontSize: '1.5rem' }}>
          {initialData ? 'Edit Employee' : 'Invite New Employee'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input 
              type="text" className="form-input" required placeholder="John Doe"
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input 
              type="email" className="form-input" required placeholder="john@store.com"
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Assign Role *</label>
            <select 
              className="form-input" required
              value={formData.roleId} onChange={(e) => setFormData({...formData, roleId: e.target.value})}
            >
              <option value="">Select a Role...</option>
              {roles.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {!initialData && (
            <div className="form-group">
              <label className="form-label">Temporary Login Password *</label>
              <input 
                type="password" className="form-input" required placeholder="••••••••"
                value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                Hand this password to the employee securely.
              </span>
            </div>
          )}

          <div className="flex-between" style={{ gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2, background: 'var(--success)', border: 'none' }} disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : (initialData ? 'Save Changes' : 'Invite Staff')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

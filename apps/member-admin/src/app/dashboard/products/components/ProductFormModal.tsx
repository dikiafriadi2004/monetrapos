"use client";

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  categories: any[];
}

export function ProductFormModal({ isOpen, onClose, onSubmit, initialData, categories }: ProductFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    categoryId: '',
    basePrice: '',
    trackStock: true
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        sku: initialData.sku || '',
        categoryId: initialData.categoryId || '',
        basePrice: initialData.basePrice || '',
        trackStock: initialData.trackStock ?? true
      });
    } else {
      setFormData({ name: '', description: '', sku: '', categoryId: '', basePrice: '', trackStock: true });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        basePrice: Number(formData.basePrice)
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save product');
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
          {initialData ? 'Edit Product' : 'Add New Product'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input 
              type="text" className="form-input" required placeholder="e.g. Iced Caffe Latte"
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Category</label>
              <select 
                className="form-input" 
                value={formData.categoryId} 
                onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
              >
                <option value="">Select Category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">SKU</label>
              <input 
                type="text" className="form-input" placeholder="e.g. LATTE-001"
                value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Base Price (Rp) *</label>
            <input 
              type="number" className="form-input" required placeholder="e.g. 35000" min="0"
              value={formData.basePrice} onChange={(e) => setFormData({...formData, basePrice: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea 
              className="form-input" rows={3} placeholder="Brief product description..."
              value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 'var(--space-sm) 0 var(--space-lg)' }}>
            <input 
              type="checkbox" id="trackStock"
              checked={formData.trackStock} onChange={(e) => setFormData({...formData, trackStock: e.target.checked})}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="trackStock" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Track Inventory For This Item</label>
          </div>

          <div className="flex-between" style={{ gap: 'var(--space-md)' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2, background: 'var(--success)', border: 'none' }} disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : (initialData ? 'Save Changes' : 'Create Product')}
            </button>
          </div>

        </form>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}

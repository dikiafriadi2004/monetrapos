"use client";

import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  categories: any[];
}

interface Variant {
  id?: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  attributes: Record<string, string>;
}

export function ProductFormModal({ isOpen, onClose, onSubmit, initialData, categories }: ProductFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    categoryId: '',
    basePrice: '',
    costPrice: '',
    taxPercentage: '',
    unit: 'pcs',
    minStock: '',
    trackInventory: true,
    hasVariants: false,
    isActive: true,
  });
  const [variants, setVariants] = useState<Variant[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        sku: initialData.sku || '',
        barcode: initialData.barcode || '',
        categoryId: initialData.categoryId || '',
        basePrice: initialData.basePrice || '',
        costPrice: initialData.costPrice || '',
        taxPercentage: initialData.taxPercentage || '',
        unit: initialData.unit || 'pcs',
        minStock: initialData.minStock || '',
        trackInventory: initialData.trackInventory ?? true,
        hasVariants: initialData.hasVariants || false,
        isActive: initialData.isActive ?? true,
      });
      setShowVariants(initialData.hasVariants || false);
      setVariants(initialData.variants || []);
    } else {
      setFormData({ 
        name: '', description: '', sku: '', barcode: '', categoryId: '', 
        basePrice: '', costPrice: '', taxPercentage: '', unit: 'pcs', minStock: '',
        trackInventory: true, hasVariants: false, isActive: true 
      });
      setShowVariants(false);
      setVariants([]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: any = {
        ...formData,
        basePrice: Number(formData.basePrice),
        costPrice: formData.costPrice ? Number(formData.costPrice) : undefined,
        taxPercentage: formData.taxPercentage ? Number(formData.taxPercentage) : undefined,
        minStock: formData.minStock ? Number(formData.minStock) : undefined,
      };

      if (showVariants && variants.length > 0) {
        data.hasVariants = true;
        data.variants = variants;
      }

      await onSubmit(data);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const addVariant = () => {
    setVariants([...variants, {
      name: '',
      sku: '',
      price: Number(formData.basePrice) || 0,
      costPrice: Number(formData.costPrice) || 0,
      attributes: {}
    }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: string, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: 'var(--space-md)', overflowY: 'auto'
    }}>
      <div className="glass-panel animate-fade-in" style={{ 
        width: '100%', maxWidth: '720px', padding: 'var(--space-xl)', 
        position: 'relative', margin: 'auto', maxHeight: '90vh', overflowY: 'auto'
      }}>
        
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: 'var(--space-lg)', right: 'var(--space-lg)', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 10 }}
        >
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: 'var(--space-xl)', fontSize: '1.5rem' }}>
          {initialData ? 'Edit Product' : 'Add New Product'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          
          {/* Basic Info */}
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input 
              type="text" className="form-input" required placeholder="e.g. Iced Caffe Latte"
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
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
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select 
                className="form-input" 
                value={formData.unit} 
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="liter">Liter</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input 
                type="text" className="form-input" placeholder="e.g. LATTE-001"
                value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Barcode</label>
              <input 
                type="text" className="form-input" placeholder="e.g. 1234567890"
                value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})}
              />
            </div>
          </div>

          {/* Pricing */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">Base Price (Rp) *</label>
              <input 
                type="number" className="form-input" required placeholder="25000" min="0"
                value={formData.basePrice} onChange={(e) => setFormData({...formData, basePrice: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cost Price (Rp)</label>
              <input 
                type="number" className="form-input" placeholder="15000" min="0"
                value={formData.costPrice} onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tax (%)</label>
              <input 
                type="number" className="form-input" placeholder="10" min="0" max="100" step="0.1"
                value={formData.taxPercentage} onChange={(e) => setFormData({...formData, taxPercentage: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea 
              className="form-input" rows={3} placeholder="Brief product description..."
              value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          {/* Inventory Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={formData.trackInventory} 
                onChange={(e) => setFormData({...formData, trackInventory: e.target.checked})}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Track Inventory For This Item</span>
            </label>

            {formData.trackInventory && (
              <div className="form-group" style={{ marginLeft: '24px' }}>
                <label className="form-label">Minimum Stock Alert</label>
                <input 
                  type="number" className="form-input" placeholder="10" min="0"
                  value={formData.minStock} onChange={(e) => setFormData({...formData, minStock: e.target.value})}
                />
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={formData.isActive} 
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Active (Available for Sale)</span>
            </label>
          </div>

          {/* Variants Section */}
          <div style={{ 
            borderTop: '1px solid var(--border-subtle)', 
            paddingTop: 'var(--space-lg)',
            marginTop: 'var(--space-md)'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: 'var(--space-md)' }}>
              <input 
                type="checkbox" 
                checked={showVariants} 
                onChange={(e) => {
                  setShowVariants(e.target.checked);
                  setFormData({...formData, hasVariants: e.target.checked});
                }}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600 }}>This product has variants (size, color, etc.)</span>
            </label>

            {showVariants && (
              <div style={{ marginLeft: '24px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                  Add different variants of this product with their own pricing and SKU
                </p>

                {variants.map((variant, index) => (
                  <div key={index} style={{ 
                    background: 'var(--bg-tertiary)', 
                    padding: 'var(--space-md)', 
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-md)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Variant {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-sm)' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Variant name (e.g. Large, Red)"
                        value={variant.name}
                        onChange={(e) => updateVariant(index, 'name', e.target.value)}
                        style={{ fontSize: '0.9rem' }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="SKU"
                        value={variant.sku}
                        onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                        style={{ fontSize: '0.9rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Price"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, 'price', Number(e.target.value))}
                        style={{ fontSize: '0.9rem' }}
                      />
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Cost"
                        value={variant.costPrice}
                        onChange={(e) => updateVariant(index, 'costPrice', Number(e.target.value))}
                        style={{ fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addVariant}
                  className="btn btn-outline"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-xs)' }}
                >
                  <Plus size={16} />
                  Add Variant
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-between" style={{ gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
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

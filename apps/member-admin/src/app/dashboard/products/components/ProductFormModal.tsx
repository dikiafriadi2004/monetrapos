"use client";

import { useState, useEffect } from 'react';
import { X, Loader2, Upload, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';
import { getImageUrl } from '@/lib/date';

interface Variant {
  id?: string;
  name: string;
  priceAdjustment: number;
  sku?: string;
  stock: number;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<any>;
  initialData?: any;
  categories: any[];
}

export function ProductFormModal({ isOpen, onClose, onSubmit, initialData, categories }: ProductFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    categoryId: '',
    price: '',
    costPrice: '',
    stock: '0',
    lowStockThreshold: '10',
    trackInventory: true,
    isActive: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        sku: initialData.sku || '',
        barcode: initialData.barcode || '',
        categoryId: initialData.categoryId || '',
        price: String(initialData.price || ''),
        costPrice: String(initialData.cost || initialData.costPrice || ''),
        stock: String(initialData.stock || '0'),
        lowStockThreshold: String(initialData.lowStockThreshold || initialData.minStock || '10'),
        trackInventory: initialData.trackInventory !== false,
        isActive: initialData.isActive !== false,
      });
      setImagePreview(getImageUrl(initialData.imageUrl) || '');
      setImageFile(null);
      // Load existing variants
      const existingVariants: Variant[] = (initialData.variants || []).map((v: any) => ({
        id: v.id,
        name: v.name,
        priceAdjustment: Number(v.priceAdjustment) || 0,
        sku: v.sku || '',
        stock: Number(v.stock) || 0,
      }));
      setHasVariants(existingVariants.length > 0 || initialData.hasVariants);
      setVariants(existingVariants.length > 0 ? existingVariants : []);
    } else {
      setFormData({
        name: '', description: '', sku: '', barcode: '', categoryId: '',
        price: '', costPrice: '', stock: '0', lowStockThreshold: '10',
        trackInventory: true, isActive: true,
      });
      setImagePreview('');
      setImageFile(null);
      setHasVariants(false);
      setVariants([]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Gambar maksimal 5MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const addVariant = () => {
    setVariants(prev => [...prev, { name: '', priceAdjustment: 0, sku: '', stock: 0 }]);
  };

  const removeVariant = (idx: number) => {
    setVariants(prev => prev.filter((_, i) => i !== idx));
  };

  const updateVariant = (idx: number, field: keyof Variant, value: any) => {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { toast.error('Nama produk wajib diisi'); return; }
    if (!formData.price || Number(formData.price) < 0) { toast.error('Harga wajib diisi'); return; }
    if (hasVariants && variants.some(v => !v.name.trim())) {
      toast.error('Nama varian tidak boleh kosong'); return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
        categoryId: formData.categoryId || undefined,
        price: Number(formData.price),
        costPrice: formData.costPrice ? Number(formData.costPrice) : 0,
        stock: hasVariants ? 0 : (Number(formData.stock) || 0),
        lowStockAlert: Number(formData.lowStockThreshold) || 10,
        trackStock: formData.trackInventory,
        isActive: formData.isActive,
        hasVariants,
      };

      const result = await onSubmit(payload);
      const productId = initialData?.id || result?.id || result?.data?.id;

      // Upload image
      if (imageFile && productId) {
        try {
          const fd = new FormData();
          fd.append('file', imageFile);
          await apiClient.post(`/products/${productId}/image`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          toast.error('Produk tersimpan tapi gambar gagal diupload.');
        }
      }

      // Save variants
      if (hasVariants && productId && variants.length > 0) {
        for (const v of variants) {
          if (!v.name.trim()) continue;
          try {
            if (v.id) {
              // Update existing variant
              await apiClient.patch(`/variants/${v.id}`, {
                name: v.name,
                priceAdjustment: Number(v.priceAdjustment) || 0,
                sku: v.sku || undefined,
                stock: Number(v.stock) || 0,
              });
            } else {
              // Create new variant
              await apiClient.post(`/products/${productId}/variants`, {
                name: v.name,
                priceAdjustment: Number(v.priceAdjustment) || 0,
                sku: v.sku || undefined,
                stock: Number(v.stock) || 0,
              });
            }
          } catch (err: any) {
            toast.error(`Gagal simpan varian "${v.name}"`);
          }
        }
      }

      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan produk');
    } finally {
      setLoading(false);
    }
  };

  const f = (key: string, val: any) => setFormData(p => ({ ...p, [key]: val }));
  const basePrice = Number(formData.price) || 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: 'var(--space-md)', overflowY: 'auto',
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%', maxWidth: 720, padding: 'var(--space-xl)',
        position: 'relative', margin: 'auto', maxHeight: '92vh', overflowY: 'auto',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 'var(--space-lg)', right: 'var(--space-lg)',
          background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
        }}>
          <X size={22} />
        </button>

        <h2 style={{ marginBottom: 'var(--space-xl)', fontSize: '1.4rem', fontWeight: 700 }}>
          {initialData ? 'Edit Produk' : 'Tambah Produk Baru'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Nama Produk */}
          <div className="form-group">
            <label className="form-label">Nama Produk *</label>
            <input type="text" className="form-input" required placeholder="Contoh: Es Teh Manis"
              value={formData.name} onChange={e => f('name', e.target.value)} />
          </div>

          {/* Gambar Produk */}
          <div className="form-group">
            <label className="form-label">Gambar Produk</label>
            <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
              {imagePreview && (
                <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color)' }}>
                  <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <label style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)',
                cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.875rem',
              }}>
                <Upload size={16} />
                {imageFile ? imageFile.name : 'Pilih gambar (JPG, PNG, max 5MB)'}
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Kategori & SKU */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select className="form-input" value={formData.categoryId} onChange={e => f('categoryId', e.target.value)}>
                <option value="">Pilih Kategori...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input type="text" className="form-input" placeholder="Contoh: PROD-001"
                value={formData.sku} onChange={e => f('sku', e.target.value)} />
            </div>
          </div>

          {/* Barcode */}
          <div className="form-group">
            <label className="form-label">Barcode</label>
            <input type="text" className="form-input" placeholder="Scan atau ketik barcode"
              value={formData.barcode} onChange={e => f('barcode', e.target.value)} />
          </div>

          {/* Harga */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">Harga Jual (Rp) *</label>
              <input type="number" className="form-input" required placeholder="25000" min="0"
                value={formData.price} onChange={e => f('price', e.target.value)} />
              {hasVariants && <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Harga dasar — varian bisa menambah/mengurangi</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Harga Modal (Rp)</label>
              <input type="number" className="form-input" placeholder="15000" min="0"
                value={formData.costPrice} onChange={e => f('costPrice', e.target.value)} />
            </div>
          </div>

          {/* Deskripsi */}
          <div className="form-group">
            <label className="form-label">Deskripsi</label>
            <textarea className="form-input" rows={2} placeholder="Deskripsi produk..."
              value={formData.description} onChange={e => f('description', e.target.value)} />
          </div>

          {/* ── VARIAN ── */}
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={hasVariants} onChange={e => {
                  setHasVariants(e.target.checked);
                  if (e.target.checked && variants.length === 0) {
                    setVariants([{ name: '', priceAdjustment: 0, sku: '', stock: 0 }]);
                  }
                }} style={{ width: 16, height: 16 }} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Produk memiliki varian</span>
              </label>
              {hasVariants && (
                <button type="button" onClick={addVariant} className="btn btn-outline" style={{ height: 30, padding: '0 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={13} /> Tambah Varian
                </button>
              )}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: hasVariants ? 'var(--space-md)' : 0 }}>
              Contoh: ukuran (S/M/L), suhu (Panas/Dingin), rasa, dll.
            </p>

            {hasVariants && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 32px', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', padding: '0 4px' }}>
                  <span>Nama Varian *</span>
                  <span>Harga Tambahan (Rp)</span>
                  <span>SKU</span>
                  <span>Stok</span>
                  <span></span>
                </div>
                {variants.map((v, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 32px', gap: 6, alignItems: 'center' }}>
                    <input
                      className="form-input" style={{ height: 36, fontSize: '0.85rem' }}
                      placeholder="Contoh: Dingin, Large, Pedas"
                      value={v.name}
                      onChange={e => updateVariant(idx, 'name', e.target.value)}
                    />
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number" className="form-input" style={{ height: 36, fontSize: '0.85rem' }}
                        placeholder="0"
                        value={v.priceAdjustment}
                        onChange={e => updateVariant(idx, 'priceAdjustment', Number(e.target.value))}
                      />
                      {basePrice > 0 && (
                        <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                          = {(basePrice + Number(v.priceAdjustment)).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                    <input
                      className="form-input" style={{ height: 36, fontSize: '0.85rem' }}
                      placeholder="SKU-V1"
                      value={v.sku || ''}
                      onChange={e => updateVariant(idx, 'sku', e.target.value)}
                    />
                    <input
                      type="number" className="form-input" style={{ height: 36, fontSize: '0.85rem' }}
                      placeholder="0" min="0"
                      value={v.stock}
                      onChange={e => updateVariant(idx, 'stock', Number(e.target.value))}
                    />
                    <button type="button" onClick={() => removeVariant(idx)}
                      style={{ width: 32, height: 32, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {variants.length === 0 && (
                  <button type="button" onClick={addVariant} style={{ padding: '10px', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                    + Klik untuk tambah varian pertama
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Inventori — hanya tampil jika tidak ada varian */}
          {!hasVariants && (
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
              <div style={{ fontWeight: 600, marginBottom: 'var(--space-sm)', fontSize: '0.9rem' }}>Pengaturan Inventori</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 'var(--space-sm)' }}>
                <input type="checkbox" checked={formData.trackInventory}
                  onChange={e => f('trackInventory', e.target.checked)} style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: '0.875rem' }}>Lacak stok produk ini</span>
              </label>
              {formData.trackInventory && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Stok Awal</label>
                    <input type="number" className="form-input" min="0" placeholder="0"
                      value={formData.stock} onChange={e => f('stock', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Batas Stok Minimum</label>
                    <input type="number" className="form-input" min="0" placeholder="10"
                      value={formData.lowStockThreshold} onChange={e => f('lowStockThreshold', e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={formData.isActive}
              onChange={e => f('isActive', e.target.checked)} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: '0.875rem' }}>Produk aktif (tersedia untuk dijual)</span>
          </label>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }} disabled={loading}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Menyimpan...</> : (initialData ? 'Simpan Perubahan' : 'Tambah Produk')}
            </button>
          </div>
        </form>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
      </div>
    </div>
  );
}

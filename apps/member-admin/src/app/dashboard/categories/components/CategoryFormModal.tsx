'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/date';

interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
  parentId?: string;
  children?: Category[];
}

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<any>;
  initialData?: Category | null;
  categories: Category[];
}

export default function CategoryFormModal({
  isOpen, onClose, onSubmit, initialData, categories
}: CategoryFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    sortOrder: 0,
    isActive: true,
    parentId: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        slug: initialData.slug || '',
        description: initialData.description || '',
        sortOrder: initialData.sortOrder || 0,
        isActive: initialData.isActive !== false,
        parentId: initialData.parentId || '',
      });
      setImagePreview(getImageUrl(initialData.imageUrl) || '');
    } else {
      setFormData({ name: '', slug: '', description: '', sortOrder: 0, isActive: true, parentId: '' });
      setImagePreview('');
    }
    setImageFile(null);
  }, [initialData, isOpen]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!initialData && formData.name) {
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.name, initialData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Gambar maksimal 5MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { toast.error('Nama kategori wajib diisi'); return; }
    setLoading(true);
    try {
      const result = await onSubmit({
        ...formData,
        sortOrder: Number(formData.sortOrder),
        parentId: formData.parentId || null,
      });

      // Upload image if there's a new file
      const categoryId = initialData?.id || result?.id || result?.data?.id;
      if (imageFile && categoryId) {
        try {
          const fd = new FormData();
          fd.append('file', imageFile);
          await apiClient.post(`/categories/${categoryId}/image`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          toast.error('Kategori tersimpan tapi gambar gagal diupload');
        }
      }

      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan kategori');
    } finally {
      setLoading(false);
    }
  };

  // Flatten categories for parent selection
  const flattenCategories = (cats: Category[], level = 0): Array<{ id: string; name: string; level: number }> => {
    let result: Array<{ id: string; name: string; level: number }> = [];
    cats.forEach(cat => {
      if (initialData && cat.id === initialData.id) return;
      result.push({ id: cat.id, name: cat.name, level });
      if (cat.children?.length) result = result.concat(flattenCategories(cat.children, level + 1));
    });
    return result;
  };

  const flatCategories = flattenCategories(categories);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 12, maxWidth: 560, width: '100%',
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            {initialData ? 'Edit Kategori' : 'Tambah Kategori'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Nama */}
          <div className="form-group">
            <label className="form-label">Nama Kategori *</label>
            <input type="text" required className="form-input"
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Makanan, Minuman, Elektronik" />
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Nama yang akan ditampilkan di daftar produk</p>
          </div>

          {/* Slug */}
          <div className="form-group">
            <label className="form-label">Slug (URL)</label>
            <input type="text" className="form-input"
              value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })}
              placeholder="Contoh: makanan (otomatis dari nama)" />
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Diisi otomatis dari nama. Hanya huruf kecil, angka, dan tanda hubung.</p>
          </div>

          {/* Parent */}
          <div className="form-group">
            <label className="form-label">Kategori Induk</label>
            <select className="form-input" value={formData.parentId} onChange={e => setFormData({ ...formData, parentId: e.target.value })}>
              <option value="">Tidak ada (Kategori Utama)</option>
              {flatCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{'—'.repeat(cat.level)} {cat.name}</option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Pilih jika ini adalah sub-kategori. Kosongkan untuk kategori utama.</p>
          </div>

          {/* Deskripsi */}
          <div className="form-group">
            <label className="form-label">Deskripsi</label>
            <textarea className="form-input" rows={2}
              value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Contoh: Semua jenis makanan berat dan ringan" />
          </div>

          {/* Gambar */}
          <div className="form-group">
            <label className="form-label">Gambar Kategori</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {imagePreview && (
                <div style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color)' }}>
                  <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                  border: '2px dashed var(--border-color)', borderRadius: 8,
                  cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.875rem',
                }}>
                  <Upload size={16} />
                  {imageFile ? imageFile.name : 'Pilih gambar (JPG, PNG, max 5MB)'}
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
                {!initialData && imageFile && (
                  <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 4 }}>
                    ⚠️ Gambar akan diupload setelah kategori disimpan. Edit kategori untuk upload gambar.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sort Order */}
          <div className="form-group">
            <label className="form-label">Urutan Tampil</label>
            <input type="number" className="form-input" min="0"
              value={formData.sortOrder} onChange={e => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
              placeholder="Contoh: 0 (angka kecil tampil lebih dulu)" />
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Angka lebih kecil tampil lebih awal. Default: 0</p>
          </div>

          {/* Status */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>Kategori aktif (tampil di pilihan produk)</span>
          </label>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <button type="button" onClick={onClose} disabled={loading} className="btn btn-outline" style={{ flex: 1 }}>Batal</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Menyimpan...</> : (initialData ? 'Simpan Perubahan' : 'Tambah Kategori')}
            </button>
          </div>
        </form>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

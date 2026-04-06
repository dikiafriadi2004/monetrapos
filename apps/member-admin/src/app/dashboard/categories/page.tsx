'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Folder, FolderOpen, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import CategoryFormModal from './components/CategoryFormModal';
import { ConfirmModal } from '@/components/ui';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  parentId?: string;
  children?: Category[];
  productCount?: number;
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (user?.companyId) fetchCategories(); }, [user]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/categories/tree', { params: { companyId: user?.companyId } });
      setCategories(res.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load categories');
    } finally { setLoading(false); }
  };

  const handleDelete = async (category: Category) => {
    setDeleteConfirm({ open: true, category });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.category) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/categories/${deleteConfirm.category.id}`, { params: { companyId: user?.companyId } });
      toast.success('Kategori dihapus');
      setDeleteConfirm({ open: false, category: null });
      fetchCategories();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus');
    } finally { setDeleting(false); }
  };

  const handleSubmit = async (data: any): Promise<any> => {
    try {
      let result: any;
      if (editingCategory) {
        const res = await apiClient.patch(`/categories/${editingCategory.id}`, data, { params: { companyId: user?.companyId } });
        result = res.data;
        toast.success('Kategori berhasil diperbarui');
      } else {
        const res = await apiClient.post('/categories', { ...data, companyId: user?.companyId });
        result = res.data;
        toast.success('Kategori berhasil ditambahkan');
      }
      setIsModalOpen(false);
      fetchCategories();
      return result;
    } catch (err: any) {
      throw err;
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const ids = new Set<string>();
    const collect = (cats: Category[]) => cats.forEach(c => { if (c.children?.length) { ids.add(c.id); collect(c.children); } });
    collect(categories);
    setExpandedIds(ids);
  };

  const renderTree = (cats: Category[], level = 0): React.ReactNode => cats.map(cat => {
    const hasChildren = !!cat.children?.length;
    const isExpanded = expandedIds.has(cat.id);
    return (
      <div key={cat.id} style={{ marginLeft: level > 0 ? 24 : 0 }}>
        <div className="glass-panel animate-fade-in" style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-md) var(--space-lg)', marginBottom: 'var(--space-sm)', cursor: hasChildren ? 'pointer' : 'default', opacity: cat.isActive ? 1 : 0.6 }}
          onClick={() => hasChildren && toggleExpand(cat.id)}>
          <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, opacity: hasChildren ? 1 : 0.2 }}>
            {hasChildren ? (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <div style={{ width: 16 }} />}
          </div>
          <div style={{ marginRight: 12, color: 'var(--text-tertiary)' }}>
            {hasChildren && isExpanded ? <FolderOpen size={18} /> : <Folder size={18} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 500 }}>{cat.name}</span>
              {!cat.isActive && <span style={{ padding: '2px 8px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 4, fontSize: '0.75rem', fontWeight: 500 }}>Inactive</span>}
              {cat.productCount !== undefined && <span style={{ padding: '2px 8px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', borderRadius: 4, fontSize: '0.75rem', fontWeight: 500 }}>{cat.productCount} products</span>}
            </div>
            {cat.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{cat.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setEditingCategory(cat); setIsModalOpen(true); }} className="btn btn-outline" style={{ height: 30, padding: '0 10px', fontSize: '0.8rem' }}>
              <Edit2 size={13} /> Edit
            </button>
            <button onClick={() => handleDelete(cat)} style={{ height: 30, padding: '0 10px', fontSize: '0.8rem', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && renderTree(cat.children!, level + 1)}
      </div>
    );
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Categories</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Organize your products with categories and subcategories</p>
        </div>
        <button onClick={() => { setEditingCategory(null); setIsModalOpen(true); }} className="btn btn-primary">
          <Plus size={16} /> Add Category
        </button>
      </div>

      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-lg)' }}>
          <button onClick={expandAll} className="btn btn-outline" style={{ height: 32, padding: '0 12px', fontSize: '0.85rem' }}>Expand All</button>
          <button onClick={() => setExpandedIds(new Set())} className="btn btn-outline" style={{ height: 32, padding: '0 12px', fontSize: '0.85rem' }}>Collapse All</button>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center', border: '2px dashed var(--border-subtle)' }}>
          <Folder size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>No categories yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>Create your first category to start organizing products</p>
          <button onClick={() => { setEditingCategory(null); setIsModalOpen(true); }} className="btn btn-primary">
            <Plus size={16} /> Add Category
          </button>
        </div>
      ) : (
        <div>{renderTree(categories)}</div>
      )}

      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingCategory}
        categories={categories}
      />
      <ConfirmModal
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, category: null })}
        onConfirm={confirmDelete}
        title="Hapus Kategori"
        description={`Hapus "${deleteConfirm.category?.name}"?${deleteConfirm.category?.children?.length ? ' Semua subkategori juga akan dihapus.' : ''} Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Ya, Hapus"
        loading={deleting}
      />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

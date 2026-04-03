'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import CategoryFormModal from './components/CategoryFormModal';

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

  useEffect(() => {
    if (user?.companyId) {
      fetchCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/categories/tree', {
        params: { companyId: user?.companyId }
      });
      setCategories(response.data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error(error.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?${category.children?.length ? '\n\nThis will also delete all subcategories.' : ''}`)) {
      return;
    }

    try {
      await apiClient.delete(`/categories/${category.id}`, {
        params: { companyId: user?.companyId }
      });
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingCategory) {
        await apiClient.patch(`/categories/${editingCategory.id}`, data, {
          params: { companyId: user?.companyId }
        });
        toast.success('Category updated successfully');
      } else {
        await apiClient.post('/categories', {
          ...data,
          companyId: user?.companyId
        });
        toast.success('Category created successfully');
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      throw error;
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (cats: Category[]) => {
      cats.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          allIds.add(cat.id);
          collectIds(cat.children);
        }
      });
    };
    collectIds(categories);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const renderCategoryTree = (cats: Category[], level = 0) => {
    return cats.map(category => {
      const hasChildren = category.children && category.children.length > 0;
      const isExpanded = expandedIds.has(category.id);

      return (
        <div key={category.id} style={{ marginLeft: level > 0 ? '24px' : '0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              marginBottom: '8px',
              transition: 'all 0.2s',
              cursor: hasChildren ? 'pointer' : 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            {/* Expand/Collapse Button */}
            <div
              onClick={() => hasChildren && toggleExpand(category.id)}
              style={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '8px',
                cursor: hasChildren ? 'pointer' : 'default',
                opacity: hasChildren ? 1 : 0.3
              }}
            >
              {hasChildren ? (
                isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
              ) : (
                <div style={{ width: '18px' }} />
              )}
            </div>

            {/* Folder Icon */}
            <div style={{ marginRight: '12px', color: '#6b7280' }}>
              {hasChildren ? (
                isExpanded ? <FolderOpen size={20} /> : <Folder size={20} />
              ) : (
                <Folder size={20} />
              )}
            </div>

            {/* Category Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 500, fontSize: '14px' }}>{category.name}</span>
                {!category.isActive && (
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 500
                  }}>
                    Inactive
                  </span>
                )}
                {category.productCount !== undefined && (
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: '#e0e7ff',
                    color: '#3730a3',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 500
                  }}>
                    {category.productCount} products
                  </span>
                )}
              </div>
              {category.description && (
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
                  {category.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(category);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  color: '#374151',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
              >
                <Edit2 size={14} />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(category);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#fee2e2',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  color: '#991b1b',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fecaca';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>

          {/* Render children if expanded */}
          {hasChildren && isExpanded && renderCategoryTree(category.children!, level + 1)}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280' }}>Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            Categories
          </h1>
          <button
            onClick={handleCreate}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            <Plus size={18} />
            Add Category
          </button>
        </div>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          Organize your products with categories and subcategories
        </p>
      </div>

      {/* Tree Controls */}
      {categories.length > 0 && (
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          <button
            onClick={expandAll}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#374151',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#374151',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            Collapse All
          </button>
        </div>
      )}

      {/* Category Tree */}
      {categories.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          backgroundColor: 'white',
          border: '2px dashed #e5e7eb',
          borderRadius: '12px'
        }}>
          <Folder size={48} style={{ color: '#d1d5db', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
            No categories yet
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            Create your first category to start organizing products
          </p>
          <button
            onClick={handleCreate}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            <Plus size={18} />
            Add Category
          </button>
        </div>
      ) : (
        <div>
          {renderCategoryTree(categories)}
        </div>
      )}

      {/* Category Form Modal */}
      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingCategory}
        categories={categories}
      />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Upload, Package, AlertCircle, Loader2 } from 'lucide-react';
import { ProductFormModal } from './components/ProductFormModal';
import { ProductTableRow } from './components/ProductTableRow';
import { BulkImportModal } from './components/BulkImportModal';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/hooks/useStore';
import apiClient from '@/lib/api-client';
import API_ENDPOINTS from '@/lib/api-endpoints';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/hooks/usePermission';
import { ConfirmModal } from '@/components/ui';

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  category?: { id: string; name: string };
  basePrice: number;
  costPrice?: number;
  taxPercentage?: number;
  unit?: string;
  hasVariants: boolean;
  trackInventory: boolean;
  minStock?: number;
  imageUrl?: string;
  images?: string[];
  isActive: boolean;
  variants?: any[];
  stockSnapshot?: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
}

export default function ProductsPage() {
  const { company } = useAuth();
  const { storeId } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<'price' | 'stock' | 'activate' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  // Fetch categories
  useEffect(() => {
    if (company?.id) {
      fetchCategories();
    }
  }, [company]);

  // Fetch products when filters change
  useEffect(() => {
    if (company?.id) {
      fetchProducts();
    }
  }, [company, storeId, currentPage, searchTerm, selectedCategory, showInactive, showLowStock]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.BASE, {
        params: { companyId: company?.id }
      });
      setCategories(response.data || []);
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const activeStoreId = storeId || '';
      
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      // Only add storeId if we have one
      if (activeStoreId) params.storeId = activeStoreId;

      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.categoryId = selectedCategory;
      if (!showInactive) params.isActive = true;
      if (showLowStock) params.lowStock = true;

      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE, { params });
      
      // API returns { data: [...], total, page, limit }
      const responseData = response.data;
      const productList = responseData?.data || responseData?.items || (Array.isArray(responseData) ? responseData : []);
      setProducts(productList);
      setTotalPages(responseData?.totalPages || Math.ceil((responseData?.total || productList.length) / itemsPerPage) || 1);
      setTotalItems(responseData?.total || productList.length || 0);
    } catch (error: any) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (data: any): Promise<any> => {
    const activeStoreId = storeId || '';
    if (!activeStoreId) {
      toast.error('Tidak ada toko aktif. Pastikan subscription sudah aktif.');
      throw new Error('No store');
    }
    const res = await apiClient.post(API_ENDPOINTS.PRODUCTS.BASE, {
      ...data,
      storeId: activeStoreId,
    });
    toast.success('Produk berhasil ditambahkan');
    fetchProducts();
    return res.data; // Return created product with ID for image upload
  };

  const handleUpdateProduct = async (data: any): Promise<any> => {
    if (!editingProduct) return;
    const res = await apiClient.patch(API_ENDPOINTS.PRODUCTS.BY_ID(editingProduct.id), data);
    toast.success('Produk berhasil diperbarui');
    fetchProducts();
    return res.data;
  };

  const handleDeleteProduct = async (id: string) => {
    setDeleteConfirm({ open: true, id });
  };

  const confirmDeleteProduct = async () => {
    if (!deleteConfirm.id) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(deleteConfirm.id));
      toast.success('Produk berhasil dihapus');
      setDeleteConfirm({ open: false, id: null });
      fetchProducts();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal menghapus produk');
    } finally { setDeleteLoading(false); }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const handleBulkPrice = async (price: number) => {
    try {
      await apiClient.post(API_ENDPOINTS.PRODUCTS.BASE + '/bulk/prices', {
        productIds: Array.from(selectedIds),
        price,
      });
      toast.success(`Updated price for ${selectedIds.size} products`);
      setSelectedIds(new Set());
      setBulkModal(null);
      fetchProducts();
    } catch { toast.error('Failed to update prices'); }
  };

  const handleBulkStock = async (quantity: number, type: 'set' | 'add') => {
    try {
      await apiClient.post(API_ENDPOINTS.PRODUCTS.BASE + '/bulk/stock', {
        productIds: Array.from(selectedIds),
        quantity,
        type,
      });
      toast.success(`Updated stock for ${selectedIds.size} products`);
      setSelectedIds(new Set());
      setBulkModal(null);
      fetchProducts();
    } catch { toast.error('Failed to update stock'); }
  };

  const handleBulkActivate = async (isActive: boolean) => {
    try {
      await apiClient.post(API_ENDPOINTS.PRODUCTS.BASE + '/bulk/activate', {
        productIds: Array.from(selectedIds),
        isActive,
      });
      toast.success(`${isActive ? 'Activated' : 'Deactivated'} ${selectedIds.size} products`);
      setSelectedIds(new Set());
      setBulkModal(null);
      fetchProducts();
    } catch { toast.error('Failed to update products'); }
  };

  const handleExport = async () => {
    try {
      toast.loading('Exporting products...');
      const activeStoreId = storeId || company?.id || '';
      
      // Fetch all products without pagination
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE, {
        params: { storeId: activeStoreId, limit: 10000 }
      });
      
      const allProducts = response.data.items || response.data || [];
      
      // Convert to CSV
      const headers = ['Name', 'SKU', 'Barcode', 'Category', 'Base Price', 'Cost Price', 'Unit', 'Min Stock', 'Track Inventory', 'Active'];
      const rows = allProducts.map((p: Product) => [
        p.name,
        p.sku || '',
        p.barcode || '',
        p.category?.name || '',
        p.basePrice,
        p.costPrice || 0,
        p.unit || 'pcs',
        p.minStock || 0,
        p.trackInventory ? 'Yes' : 'No',
        p.isActive ? 'Yes' : 'No'
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      toast.dismiss();
      toast.success(`Exported ${allProducts.length} products`);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to export products');
    }
  };

  const handleBulkImport = async (file: File) => {
    try {
      // Parse CSV
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const products = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return {
          name: values[0],
          sku: values[1] || undefined,
          barcode: values[2] || undefined,
          categoryName: values[3] || undefined,
          basePrice: parseFloat(values[4]) || 0,
          costPrice: parseFloat(values[5]) || 0,
          unit: values[6] || 'pcs',
          minStock: parseInt(values[7]) || 0,
          trackInventory: values[8]?.toLowerCase() === 'yes',
          isActive: values[9]?.toLowerCase() !== 'no',
        };
      });

      // Find category IDs
      const productsWithCategories = products.map(p => {
        const category = categories.find(c => c.name.toLowerCase() === p.categoryName?.toLowerCase());
        const activeStoreId = storeId || company?.id || '';
        return {
          ...p,
          categoryId: category?.id,
          companyId: company?.id,
          storeId: activeStoreId,
        };
      });

      // Import products one by one
      let successCount = 0;
      let errorCount = 0;
      
      for (const product of productsWithCategories) {
        try {
          await apiClient.post(API_ENDPOINTS.PRODUCTS.BASE, product);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error('Failed to import product:', product.name, error);
        }
      }

      toast.success(`Imported ${successCount} products${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      fetchProducts();
      setIsBulkImportOpen(false);
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error('Failed to import products');
    }
  };

  return (
    <div style={{ padding: 'var(--space-xl)' }}>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>Products</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>
            Manage your product catalog, variants, and inventory
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button 
            onClick={handleExport}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
          >
            <Download size={18} />
            Export
          </button>
          <PermissionGate permission={PERMISSIONS.PRODUCT_CREATE}>
            <button 
              onClick={() => setIsBulkImportOpen(true)}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
            >
              <Upload size={18} />
              Import
            </button>
            <button 
              onClick={() => {
                setEditingProduct(null);
                setIsModalOpen(true);
              }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
            >
              <Plus size={18} />
              Add Product
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
          {/* Search */}
          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Search products..."
                className="form-input"
                style={{ paddingLeft: '40px' }}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <select
              className="form-input"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => {
                  setShowInactive(e.target.checked);
                  setCurrentPage(1);
                }}
              />
              <span style={{ fontSize: '0.9rem' }}>Show Inactive</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showLowStock}
                onChange={(e) => {
                  setShowLowStock(e.target.checked);
                  setCurrentPage(1);
                }}
              />
              <span style={{ fontSize: '0.9rem' }}>Low Stock Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {/* Table Header */}
        <div className="flex-between" style={{ 
          padding: 'var(--space-md) var(--space-lg)', 
          borderBottom: '1px solid var(--border-subtle)',
          fontWeight: 600,
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 2 }}>
            <input type="checkbox" checked={selectedIds.size === products.length && products.length > 0} onChange={toggleSelectAll} style={{ width: 16, height: 16 }} />
            Product
          </div>
          <div style={{ flex: 1 }}>Price</div>
          <div style={{ flex: 1 }}>Stock</div>
          <div style={{ width: '120px', textAlign: 'right' }}>Actions</div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div style={{ padding: 'var(--space-sm) var(--space-lg)', background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>{selectedIds.size} selected</span>
            <button onClick={() => setBulkModal('price')} className="btn btn-outline" style={{ height: 28, padding: '0 10px', fontSize: '0.8rem' }}>Bulk Price</button>
            <button onClick={() => setBulkModal('stock')} className="btn btn-outline" style={{ height: 28, padding: '0 10px', fontSize: '0.8rem' }}>Bulk Stock</button>
            <button onClick={() => setBulkModal('activate')} className="btn btn-outline" style={{ height: 28, padding: '0 10px', fontSize: '0.8rem' }}>Activate/Deactivate</button>
            <button onClick={() => setSelectedIds(new Set())} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', marginLeft: 'auto', fontSize: '0.8rem' }}>Clear</button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: 'var(--primary)' }} />
            <p style={{ marginTop: 'var(--space-md)', color: 'var(--text-secondary)' }}>Loading products...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <Package size={48} style={{ margin: '0 auto', color: 'var(--text-tertiary)', opacity: 0.5 }} />
            <h3 style={{ marginTop: 'var(--space-md)', fontSize: '1.2rem' }}>No products found</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>
              {searchTerm || selectedCategory ? 'Try adjusting your filters' : 'Get started by adding your first product'}
            </p>
            {!searchTerm && !selectedCategory && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary"
                style={{ marginTop: 'var(--space-lg)' }}
              >
                <Plus size={18} />
                Add Your First Product
              </button>
            )}
          </div>
        )}

        {/* Products */}
        {!loading && products.length > 0 && (
          <>
            {products.map(product => (
              <ProductTableRow
                key={product.id}
                product={product}
                onEdit={handleEdit}
                onDelete={handleDeleteProduct}
                selected={selectedIds.has(product.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex-between" style={{ 
            padding: 'var(--space-lg)', 
            borderTop: '1px solid var(--border-subtle)' 
          }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} products
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-outline"
                style={{ padding: '8px 16px' }}
              >
                Previous
              </button>
              <span style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-outline"
                style={{ padding: '8px 16px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
          fetchProducts(); // refresh after modal closes
        }}
        onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
        initialData={editingProduct}
        categories={categories}
      />

      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImport={handleBulkImport}
      />

      <ConfirmModal
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={confirmDeleteProduct}
        title="Hapus Produk"
        description="Hapus produk ini? Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, Hapus"
        loading={deleteLoading}
      />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
}

// ── Bulk Price Modal ──────────────────────────────────────────────────────────
function BulkPriceModal({ count, onClose, onConfirm }: { count: number; onClose: () => void; onConfirm: (price: number) => void }) {
  const [price, setPrice] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 400, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>Bulk Update Price</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-lg)' }}>
          Set new base price for <strong>{count}</strong> selected products.
        </p>
        <div className="form-group">
          <label className="form-label">New Price (IDR) *</label>
          <input type="number" className="form-input" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 50000" min="0" autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
          <button onClick={onClose} className="btn btn-outline">Cancel</button>
          <button onClick={() => price && onConfirm(Number(price))} disabled={!price} className="btn btn-primary">Update Price</button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Stock Modal ──────────────────────────────────────────────────────────
function BulkStockModal({ count, onClose, onConfirm }: { count: number; onClose: () => void; onConfirm: (qty: number, type: 'set' | 'add') => void }) {
  const [qty, setQty] = useState('');
  const [type, setType] = useState<'set' | 'add'>('set');
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 400, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>Bulk Update Stock</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-lg)' }}>
          Update stock for <strong>{count}</strong> selected products.
        </p>
        <div className="form-group">
          <label className="form-label">Operation</label>
          <select className="form-input" value={type} onChange={e => setType(e.target.value as 'set' | 'add')}>
            <option value="set">Set stock to value</option>
            <option value="add">Add to current stock</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Quantity *</label>
          <input type="number" className="form-input" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 100" min="0" autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
          <button onClick={onClose} className="btn btn-outline">Cancel</button>
          <button onClick={() => qty !== '' && onConfirm(Number(qty), type)} disabled={qty === ''} className="btn btn-primary">Update Stock</button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Activate Modal ───────────────────────────────────────────────────────
function BulkActivateModal({ count, onClose, onConfirm }: { count: number; onClose: () => void; onConfirm: (isActive: boolean) => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 400, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>Activate / Deactivate</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-xl)' }}>
          What do you want to do with <strong>{count}</strong> selected products?
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
          <button onClick={onClose} className="btn btn-outline">Cancel</button>
          <button onClick={() => onConfirm(false)} className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Deactivate All</button>
          <button onClick={() => onConfirm(true)} className="btn btn-primary">Activate All</button>
        </div>
      </div>
    </div>
  );
}

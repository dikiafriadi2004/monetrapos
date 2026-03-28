"use client";

import { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter } from 'lucide-react';
import { api } from '../../../lib/api';
import { ProductTableRow } from './components/ProductTableRow';
import { ProductFormModal } from './components/ProductFormModal';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const fetchProducts = async () => {
    try {
      const data: any[] = await api.get('/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const data: any[] = await api.get('/products/categories');
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    Promise.all([fetchProducts(), fetchCategories()]).finally(() => setLoading(false));
  }, []);

  const handleSaveProduct = async (data: any) => {
    if (editingProduct) {
      await api.patch(`/products/${editingProduct.id}`, data);
    } else {
      await api.post('/products', data);
    }
    await fetchProducts();
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        setProducts(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        alert('Failed to delete product');
      }
    }
  };

  const openNewModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Products Menu</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage categories, items, pricing, and stock.</p>
        </div>
        <button onClick={openNewModal} className="btn btn-primary" style={{ background: 'var(--success)' }}>
          <Plus size={18} /> Add Product
        </button>
      </div>

      <div className="glass-panel" style={{ padding: 0 }}>
        {/* Table Toolbar */}
        <div className="flex-between" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              placeholder="Search products..." 
              className="form-input" 
              style={{ paddingLeft: '36px', height: '36px' }}
            />
          </div>
          <button className="btn btn-outline" style={{ height: '36px', padding: '0 12px' }}>
            <Filter size={16} style={{ marginRight: '6px' }} /> Filters
          </button>
        </div>

        {/* Table Body */}
        {loading ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="flex-center text-center" style={{ height: '300px', flexDirection: 'column' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-md)'}}>
              <Package size={32} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-sm)' }}>No products found</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto var(--space-lg)' }}>
              Your inventory is currently empty. Start by adding a product to sell in your POS.
            </p>
            <button onClick={openNewModal} className="btn btn-outline">Add First Product</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <div style={{ flex: 2 }}>Product</div>
              <div style={{ flex: 1 }}>Price</div>
              <div style={{ flex: 1 }}>Inventory</div>
              <div style={{ width: '80px' }}>Actions</div>
            </div>
            {products.map(product => (
              <ProductTableRow 
                key={product.id} 
                product={product} 
                onEdit={openEditModal}
                onDelete={handleDeleteProduct}
              />
            ))}
          </div>
        )}
      </div>

      <ProductFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveProduct}
        initialData={editingProduct}
        categories={categories}
      />
    </div>
  );
}

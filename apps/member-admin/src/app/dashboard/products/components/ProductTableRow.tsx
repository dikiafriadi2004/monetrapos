"use client";

import { Edit, Trash2, Tag, Box } from 'lucide-react';
import { formatCurrency } from '../../../../lib/utils';

interface ProductTableRowProps {
  product: any;
  onEdit: (product: any) => void;
  onDelete: (id: string) => void;
}

export function ProductTableRow({ product, onEdit, onDelete }: ProductTableRowProps) {
  // Mock fallback for missing variant logic in basic MVP UI
  const price = product.basePrice || product.variants?.[0]?.price || 0;
  const stock = product.trackStock ? (product.stockSnapshot || 0) : 'Unlimited';

  return (
    <div className="flex-between animate-fade-in" style={{ 
      padding: 'var(--space-md) var(--space-lg)', 
      borderBottom: '1px solid var(--border-subtle)',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      
      {/* Product Info */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flex: 2 }}>
        <div style={{ 
          width: '48px', height: '48px', borderRadius: 'var(--radius-md)', 
          background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', color: 'var(--text-tertiary)' 
        }}>
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
          ) : (
            <Box size={20} />
          )}
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>{product.name}</h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Tag size={12} /> {product.category?.name || 'Uncategorized'} • SKU: {product.sku || 'N/A'}
          </p>
        </div>
      </div>

      {/* Pricing Data */}
      <div style={{ flex: 1, fontWeight: 600, color: 'var(--success)' }}>
        {formatCurrency(price)}
      </div>

      <div style={{ flex: 1 }}>
        <span className={`badge ${typeof stock === 'number' && stock <= 10 ? 'badge-danger' : 'badge-success'}`}>
          {typeof stock === 'number' ? `${stock} in stock` : stock}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(product); }}
          className="btn btn-outline" 
          style={{ padding: '8px', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          title="Edit Product"
        >
          <Edit size={16} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}
          className="btn btn-outline" 
          style={{ padding: '8px', border: '1px solid var(--border-subtle)', color: 'var(--danger)' }}
          title="Delete Product"
        >
          <Trash2 size={16} />
        </button>
      </div>

    </div>
  );
}

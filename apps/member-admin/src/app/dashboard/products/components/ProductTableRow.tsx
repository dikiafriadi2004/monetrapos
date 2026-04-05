"use client";

import { Edit, Trash2, Tag, Box } from 'lucide-react';
import { formatCurrency } from '../../../../lib/utils';
import { getImageUrl } from '../../../../lib/date';

interface ProductTableRowProps {
  product: any;
  onEdit: (product: any) => void;
  onDelete: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function ProductTableRow({ product, onEdit, onDelete, selected, onToggleSelect }: ProductTableRowProps) {
  const price = product.price || product.basePrice || product.variants?.[0]?.price || 0;
  const stock = product.stock ?? 0;
  const isLowStock = stock <= (product.lowStockThreshold || product.minStock || 10);
  const imageUrl = getImageUrl(product.imageUrl || product.image);

  return (
    <div className="flex-between animate-fade-in" style={{ 
      padding: 'var(--space-md) var(--space-lg)', 
      borderBottom: '1px solid var(--border-subtle)',
      transition: 'all 0.2s ease',
    }}>
      {/* Product Info */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flex: 2 }}>
        {onToggleSelect && (
          <input type="checkbox" checked={selected || false}
            onChange={() => onToggleSelect(product.id)}
            onClick={e => e.stopPropagation()}
            style={{ width: 16, height: 16, flexShrink: 0 }} />
        )}
        <div style={{ 
          width: 48, height: 48, borderRadius: 'var(--radius-md)', 
          background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', color: 'var(--text-tertiary)', overflow: 'hidden', flexShrink: 0,
        }}>
          {imageUrl ? (
            <img src={imageUrl} alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <Box size={20} />
          )}
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{product.name}</h4>
          <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tag size={11} /> {product.category?.name || 'Tanpa Kategori'} • SKU: {product.sku || '-'}
          </p>
        </div>
      </div>

      {/* Harga */}
      <div style={{ flex: 1, fontWeight: 700, color: 'var(--success)' }}>
        {formatCurrency(Number(price))}
      </div>

      {/* Stok */}
      <div style={{ flex: 1 }}>
        <span className={`badge ${isLowStock ? 'badge-danger' : 'badge-success'}`}>
          {stock} stok
        </span>
      </div>

      {/* Status */}
      <div style={{ flex: 0.8 }}>
        <span className={`badge ${product.isActive ? 'badge-success' : 'badge-gray'}`}>
          {product.isActive ? 'Aktif' : 'Nonaktif'}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <button onClick={e => { e.stopPropagation(); onEdit(product); }}
          className="btn btn-outline" style={{ padding: 8 }} title="Edit">
          <Edit size={15} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(product.id); }}
          className="btn btn-outline" style={{ padding: 8, color: 'var(--danger)' }} title="Hapus">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

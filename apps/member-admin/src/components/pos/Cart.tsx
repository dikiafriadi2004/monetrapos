'use client';

import { Trash2, Plus, Minus, Tag, ShoppingCart } from 'lucide-react';
import { CartItem } from '@/types';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onItemDiscount?: (index: number) => void;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export default function Cart({ items, onUpdateQuantity, onRemoveItem, onItemDiscount, subtotal, tax, discount, total }: CartProps) {
  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600 }}>
        <ShoppingCart size={18} style={{ color: 'var(--accent-base)' }} />
        Cart {items.length > 0 && <span style={{ background: 'var(--accent-base)', color: 'white', borderRadius: 'var(--radius-full)', padding: '2px 8px', fontSize: '0.75rem' }}>{items.length}</span>}
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: 'var(--text-tertiary)', gap: 8 }}>
            <ShoppingCart size={40} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem' }}>Cart is empty</p>
            <p style={{ fontSize: '0.8rem' }}>Add products to start</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div key={index} style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.product.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{fmt(item.price)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {onItemDiscount && (
                    <button onClick={() => onItemDiscount(index)} title="Apply item discount"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', padding: 4 }}>
                      <Tag size={16} />
                    </button>
                  )}
                  <button onClick={() => onRemoveItem(index)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => onUpdateQuantity(index, item.quantity - 1)} disabled={item.quantity <= 1}
                    style={{ padding: 4, borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer', opacity: item.quantity <= 1 ? 0.5 : 1 }}>
                    <Minus size={14} />
                  </button>
                  <span style={{ width: 32, textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>{item.quantity}</span>
                  <button onClick={() => onUpdateQuantity(index, item.quantity + 1)} disabled={item.quantity >= item.product.stock}
                    style={{ padding: 4, borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer', opacity: item.quantity >= item.product.stock ? 0.5 : 1 }}>
                    <Plus size={14} />
                  </button>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(item.subtotal)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { label: 'Subtotal', value: fmt(subtotal), show: true },
          { label: 'Tax', value: fmt(tax), show: tax > 0 },
          { label: 'Discount', value: `-${fmt(discount)}`, show: discount > 0, color: 'var(--success)' },
        ].filter(r => r.show).map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: row.color || 'var(--text-secondary)' }}>
            <span>{row.label}</span>
            <span style={{ fontWeight: 500 }}>{row.value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, borderTop: '1px solid var(--border-color)', paddingTop: 8, marginTop: 4 }}>
          <span>Total</span>
          <span style={{ color: 'var(--success)' }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

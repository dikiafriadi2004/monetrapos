'use client';

import { useState, useEffect } from 'react';
import { Search, Package, Loader2, X, ChevronRight } from 'lucide-react';
import { Product } from '@/types';
import { productService } from '@/services/product.service';
import { getImageUrl } from '@/lib/date';
import apiClient from '@/lib/api-client';

interface ProductSearchProps {
  storeId: string;
  onSelectProduct: (product: Product, variant?: { id: string; name: string; priceAdjustment: number }) => void;
}

interface VariantPickerProps {
  product: Product;
  variants: any[];
  onSelect: (variant: any) => void;
  onClose: () => void;
}

function VariantPicker({ product, variants, onSelect, onClose }: VariantPickerProps) {
  const basePrice = Number(product.price) || 0;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 360, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 201 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{product.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>Pilih varian</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {variants.map(v => {
            const finalPrice = basePrice + Number(v.priceAdjustment || 0);
            const outOfStock = v.stock === 0;
            return (
              <button
                key={v.id}
                onClick={() => !outOfStock && onSelect(v)}
                disabled={outOfStock}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                  cursor: outOfStock ? 'not-allowed' : 'pointer',
                  opacity: outOfStock ? 0.5 : 1, transition: 'all 0.15s',
                  textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{v.name}</div>
                  <div style={{ fontSize: '0.75rem', color: outOfStock ? 'var(--danger)' : 'var(--text-tertiary)', marginTop: 2 }}>
                    {outOfStock ? 'Stok habis' : `Stok: ${v.stock}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>
                    Rp {finalPrice.toLocaleString('id-ID')}
                  </div>
                  {Number(v.priceAdjustment) !== 0 && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                      {Number(v.priceAdjustment) > 0 ? '+' : ''}{Number(v.priceAdjustment).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ProductSearch({ storeId, onSelectProduct }: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [variantProduct, setVariantProduct] = useState<{ product: Product; variants: any[] } | null>(null);

  useEffect(() => {
    if (storeId) loadProducts();
  }, [storeId]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await productService.getProducts(storeId, { isActive: true, limit: 500 });
      const list = Array.isArray(res) ? res : (res?.data || []);
      setProducts(list.filter((p: Product) => p.isActive !== false));
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = async (product: Product) => {
    // If product has variants, show variant picker
    if (product.hasVariants || (product.variants && product.variants.length > 0)) {
      try {
        // Use already-loaded variants or fetch them
        let variants = product.variants || [];
        if (variants.length === 0) {
          const res = await apiClient.get(`/products/${product.id}/variants`);
          variants = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        }
        const activeVariants = variants.filter((v: any) => v.isActive !== false);
        if (activeVariants.length > 0) {
          setVariantProduct({ product, variants: activeVariants });
          return;
        }
      } catch {
        // fallback: add product without variant
      }
    }
    onSelectProduct(product);
  };

  const handleVariantSelect = (variant: any) => {
    if (!variantProduct) return;
    const { product } = variantProduct;
    const finalPrice = Number(product.price) + Number(variant.priceAdjustment || 0);
    // Pass product with overridden price and variant info
    onSelectProduct(
      { ...product, price: finalPrice, stock: variant.stock ?? product.stock },
      { id: variant.id, name: variant.name, priceAdjustment: Number(variant.priceAdjustment || 0) }
    );
    setVariantProduct(null);
  };

  const filtered = query.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku?.toLowerCase().includes(query.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(query.toLowerCase())
      )
    : products;

  return (
    <div>
      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari produk (nama, SKU, barcode)..."
          className="form-input"
          style={{ paddingLeft: 36 }}
        />
      </div>

      {/* Product Grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, color: 'var(--text-tertiary)' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />
          Memuat produk...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-tertiary)' }}>
          <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
          <p style={{ fontSize: '0.875rem' }}>
            {query ? `Tidak ada produk "${query}"` : 'Belum ada produk'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
          maxHeight: 400,
          overflowY: 'auto',
          paddingRight: 4,
        }}>
          {filtered.map(product => {
            const hasVar = product.hasVariants || (product.variants && product.variants.length > 0);
            return (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                style={{
                  padding: '10px 8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: (!hasVar && product.stock === 0) ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  opacity: (!hasVar && product.stock === 0) ? 0.5 : 1,
                  position: 'relative',
                }}
                disabled={!hasVar && product.stock === 0}
                title={(!hasVar && product.stock === 0) ? 'Stok habis' : product.name}
              >
                {/* Variant badge */}
                {hasVar && (
                  <div style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'var(--accent-base)', color: 'white',
                    fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px',
                    borderRadius: 8, lineHeight: 1.6,
                  }}>
                    VARIAN
                  </div>
                )}

                {/* Product image */}
                <div style={{
                  width: '100%', aspectRatio: '1',
                  background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 6, overflow: 'hidden',
                }}>
                  {product.imageUrl ? (
                    <img src={getImageUrl(product.imageUrl)} alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <Package size={24} style={{ color: 'var(--text-tertiary)' }} />
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {product.name}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)' }}>
                  {hasVar ? 'Lihat varian' : `Rp ${Number(product.price).toLocaleString('id-ID')}`}
                </div>
                <div style={{ fontSize: '0.7rem', color: (!hasVar && product.stock <= 5) ? 'var(--danger)' : 'var(--text-tertiary)', marginTop: 2 }}>
                  {hasVar ? <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><ChevronRight size={10} /> Pilih varian</span>
                    : product.stock === 0 ? 'Habis' : `Stok: ${product.stock}`}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Variant Picker Modal */}
      {variantProduct && (
        <VariantPicker
          product={variantProduct.product}
          variants={variantProduct.variants}
          onSelect={handleVariantSelect}
          onClose={() => setVariantProduct(null)}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

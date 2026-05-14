'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { addOnsService, AddOn, CompanyAddOn } from '@/services/add-ons.service';
import {
  ShoppingCart,
  Check,
  CheckCircle,
  Clock,
  Loader2,
  Package,
  Zap,
  HeadphonesIcon,
  TrendingUp,
  Filter,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

const categoryIcons: Record<string, any> = {
  integration: Package,
  feature: Zap,
  support: HeadphonesIcon,
  capacity: TrendingUp,
};

const categoryLabels: Record<string, string> = {
  integration: 'Integration',
  feature: 'Feature',
  support: 'Support',
  capacity: 'Capacity',
};

const categoryStyle: Record<string, { bg: string; color: string }> = {
  integration: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  feature:     { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
  support:     { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  capacity:    { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
};

export default function AddOnsMarketplacePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [myAddOns, setMyAddOns] = useState<CompanyAddOn[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const [available, purchased] = await Promise.all([
        addOnsService.getAvailableAddOns(category),
        addOnsService.getPurchasedAddOns().catch(() => [] as CompanyAddOn[]),
      ]);
      setAddOns(available);
      setMyAddOns(purchased);
    } catch (error: any) {
      console.error('Failed to load add-ons:', error);
      if (!silent) toast.error('Gagal memuat add-ons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh setiap 30 detik untuk mendeteksi aktivasi manual oleh admin
  useEffect(() => {
    const interval = setInterval(() => loadData(true), 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getMyAddOn = (addOnId: string): CompanyAddOn | undefined =>
    myAddOns.find(ca => ca.add_on_id === addOnId || ca.add_on?.id === addOnId);

  const handlePurchase = async (addOn: AddOn) => {
    try {
      setPurchasing(addOn.id);
      const result = await addOnsService.purchaseAddOn(addOn.id);
      const res = result as any;

      if (res.paymentUrl) {
        // Xendit berhasil — arahkan ke checkout (akan auto-redirect ke Xendit)
        const checkoutUrl = `/checkout?invoice=${encodeURIComponent(res.invoice?.invoiceNumber || '')}&invoiceId=${encodeURIComponent(res.invoice?.id || '')}&amount=${addOn.price}&paymentUrl=${encodeURIComponent(res.paymentUrl)}&item=${encodeURIComponent(addOn.name)}`;
        router.push(checkoutUrl);
      } else if (res.paymentWarning) {
        // Xendit gagal tapi invoice sudah dibuat — arahkan ke billing
        toast(res.paymentWarning, { icon: 'ℹ️', duration: 6000 });
        await loadData(true);
        router.push('/dashboard/billing');
        setPurchasing(null);
      } else {
        toast('Pesanan dibuat. Silakan hubungi admin untuk aktivasi.', { icon: 'ℹ️' });
        await loadData(true);
        router.push('/dashboard/add-ons/my-add-ons');
        setPurchasing(null);
      }
    } catch (error: any) {
      console.error('Failed to purchase add-on:', error);
      toast.error(error.response?.data?.message || 'Gagal membeli add-on');
      setPurchasing(null);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  const activeCount = myAddOns.filter(ca => ca.status === 'active').length;
  const pendingCount = myAddOns.filter(ca => ca.status === 'pending_payment').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Memuat add-ons...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Add-ons Marketplace</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Tingkatkan kemampuan POS Anda dengan integrasi dan fitur tambahan</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button onClick={() => loadData(true)} className="btn btn-outline" disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button onClick={() => router.push('/dashboard/add-ons/my-add-ons')} className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Add-on Saya
            {(activeCount > 0 || pendingCount > 0) && (
              <span style={{ background: pendingCount > 0 ? '#f59e0b' : '#10b981', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: '0.75rem', fontWeight: 700 }}>
                {activeCount + pendingCount}
              </span>
            )}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Status banner jika ada yang pending */}
      {pendingCount > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md) var(--space-lg)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <Clock size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: '#92400e', marginBottom: 2 }}>
              {pendingCount} add-on menunggu pembayaran / aktivasi
            </p>
            <p style={{ fontSize: '0.85rem', color: '#78350f' }}>
              Jika sudah melakukan pembayaran, admin akan mengaktifkan add-on Anda. Halaman ini otomatis refresh setiap 30 detik.
            </p>
          </div>
          <button onClick={() => router.push('/dashboard/add-ons/my-add-ons')} className="btn"
            style={{ background: '#f59e0b', color: '#fff', border: 'none', flexShrink: 0, fontSize: '0.85rem' }}>
            Lihat Status
          </button>
        </div>
      )}

      {/* Category Filter */}
      <div className="glass-panel" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Kategori:</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            {['all', 'integration', 'feature', 'support', 'capacity'].map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className="btn"
                style={{ padding: '6px 14px', fontSize: '0.85rem',
                  background: selectedCategory === cat ? 'var(--primary)' : 'transparent',
                  color: selectedCategory === cat ? 'white' : 'var(--text-primary)',
                  border: selectedCategory === cat ? 'none' : '1px solid var(--border)' }}>
                {cat === 'all' ? 'Semua' : categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add-ons Grid */}
      {addOns.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <Package size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Tidak ada add-on tersedia</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
          {addOns.map((addOn) => {
            const CategoryIcon = categoryIcons[addOn.category] || Package;
            const catStyle = categoryStyle[addOn.category] || categoryStyle.feature;
            const isPurchasing = purchasing === addOn.id;
            const myAddOn = getMyAddOn(addOn.id);
            const isActive = myAddOn?.status === 'active';
            const isPending = myAddOn?.status === 'pending_payment';
            const isIncluded = addOn.includedInPlan === true;

            return (
              <div key={addOn.id} className="glass-panel animate-fade-in"
                style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  outline: isIncluded ? '2px solid #6366f1' : isActive ? '2px solid #10b981' : isPending ? '2px solid #f59e0b' : 'none' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}>

                {/* Top row: category + status badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 12, background: catStyle.bg, color: catStyle.color, fontSize: '0.8rem', fontWeight: 500 }}>
                    <CategoryIcon size={12} />
                    {categoryLabels[addOn.category]}
                  </span>
                  {isIncluded && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 12, background: 'rgba(99,102,241,0.12)', color: '#6366f1', fontSize: '0.8rem', fontWeight: 600 }}>
                      ✦ Termasuk Paket
                    </span>
                  )}
                  {!isIncluded && isActive && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 12, background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
                      <CheckCircle size={12} /> Aktif
                    </span>
                  )}
                  {!isIncluded && isPending && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 12, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600 }}>
                      <Clock size={12} /> Menunggu
                    </span>
                  )}
                </div>

                {/* Icon */}
                {addOn.icon_url && (
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: 'var(--space-sm)' }}>
                    {addOn.icon_url}
                  </div>
                )}

                {/* Name & Description */}
                <h3 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-xs)', fontWeight: 600 }}>{addOn.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-md)', flexGrow: 1, lineHeight: 1.5 }}>
                  {addOn.description}
                </p>

                {/* Features */}
                {addOn.features && addOn.features.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--space-md)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {addOn.features.slice(0, 3).map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <Check size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
                        {f}
                      </li>
                    ))}
                    {addOn.features.length > 3 && (
                      <li style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginLeft: 20 }}>
                        +{addOn.features.length - 3} fitur lainnya
                      </li>
                    )}
                  </ul>
                )}

                {/* Price & Button */}
                <div style={{ marginTop: 'auto', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                    <div>
                      {isIncluded ? (
                        <>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6366f1' }}>Gratis</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>
                            {formatPrice(addOn.price)}/{addOn.pricing_type === 'recurring' ? 'bln' : 'sekali'}
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(addOn.price)}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                            {addOn.pricing_type === 'recurring' ? 'per bulan' : 'sekali bayar'}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {isIncluded ? (
                    <button className="btn" style={{ width: '100%', background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      ✦ Sudah Termasuk di Paket Anda
                    </button>
                  ) : isActive ? (
                    <button className="btn" style={{ width: '100%', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      <CheckCircle size={15} /> Sudah Aktif
                    </button>
                  ) : isPending ? (
                    <button className="btn" style={{ width: '100%', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      <Clock size={15} /> Menunggu Aktivasi
                    </button>
                  ) : (
                    <button onClick={() => handlePurchase(addOn)} disabled={isPurchasing} className="btn btn-primary"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      {isPurchasing ? (
                        <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Memproses...</>
                      ) : (
                        <><ShoppingCart size={15} /> Beli Sekarang</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

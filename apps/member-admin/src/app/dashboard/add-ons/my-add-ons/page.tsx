'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { addOnsService, CompanyAddOn } from '@/services/add-ons.service';
import { ConfirmModal } from '@/components/ui';
import {
  Package,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  CreditCard,
  ArrowLeft,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react';

// Panduan penggunaan per add-on slug
const ADDON_USAGE_GUIDE: Record<string, { title: string; steps: string[]; link?: string }> = {
  'whatsapp-integration': {
    title: 'Cara Menggunakan WhatsApp Integration',
    steps: [
      'Buka menu Settings → Notifications',
      'Aktifkan toggle "WhatsApp" dan masukkan nomor WhatsApp bisnis Anda',
      'Klik tombol "Test" untuk memastikan koneksi berhasil',
      'Notifikasi otomatis akan dikirim ke customer saat ada pesanan baru, status berubah, dll',
    ],
    link: '/dashboard/settings/notifications',
  },
  'accounting-integration': {
    title: 'Cara Menggunakan Accounting Integration',
    steps: [
      'Buka menu Reports → Export Data',
      'Pilih format export: CSV, Excel, atau format akuntansi (Jurnal, Accurate, dll)',
      'Pilih periode dan klik Export',
      'File akan diunduh dan siap diimport ke software akuntansi Anda',
    ],
    link: '/dashboard/reports',
  },
  'advanced-reporting': {
    title: 'Cara Menggunakan Advanced Reports',
    steps: [
      'Buka menu Reports → Advanced Reports',
      'Pilih tab: Employee Performance, Customer Analytics, atau Profit & Loss',
      'Atur filter tanggal sesuai kebutuhan',
      'Klik Export untuk mengunduh laporan dalam format CSV',
    ],
    link: '/dashboard/reports/advanced',
  },
  'multi-location': {
    title: 'Cara Menggunakan Multi-Location',
    steps: [
      'Buka menu Stores untuk melihat semua toko Anda',
      'Klik "Add Store" untuk menambah toko baru',
      'Setiap toko memiliki inventory, karyawan, dan laporan terpisah',
      'Gunakan filter "Store" di setiap halaman untuk melihat data per toko',
    ],
    link: '/dashboard/stores',
  },
  'loyalty-program-advanced': {
    title: 'Cara Menggunakan Advanced Loyalty Program',
    steps: [
      'Buka menu Customers → Loyalty Program',
      'Lihat statistik tier customer (Regular, Silver, Gold, Platinum)',
      'Klik "Sync Tiers" untuk memperbarui tier semua customer berdasarkan total belanja',
      'Customer otomatis naik tier saat total belanja mencapai threshold',
      'Tier lebih tinggi = poin multiplier lebih besar dan diskon lebih besar',
    ],
    link: '/dashboard/customers/loyalty',
  },
  'online-ordering': {
    title: 'Cara Menggunakan Online Ordering',
    steps: [
      'Fitur ini memungkinkan customer memesan secara online',
      'Link order online Anda: [domain]/order/[slug-toko]',
      'Pesanan masuk akan muncul di halaman FnB Orders atau Transactions',
      'Aktifkan notifikasi untuk mendapat alert pesanan baru',
    ],
    link: '/dashboard/fnb/orders',
  },
  'delivery-integration': {
    title: 'Cara Menggunakan Delivery Integration',
    steps: [
      'Integrasi dengan GoFood, GrabFood, dan ShopeeFood',
      'Pesanan dari platform delivery otomatis masuk ke sistem POS',
      'Buka Settings → Integrations untuk menghubungkan akun',
      'Pesanan akan muncul di halaman FnB Orders dengan label platform asal',
    ],
    link: '/dashboard/settings/integrations',
  },
  'ecommerce-integration': {
    title: 'Cara Menggunakan E-Commerce Integration',
    steps: [
      'Sinkronisasi produk dan stok dengan Tokopedia, Shopee, Lazada',
      'Buka Settings → Integrations untuk menghubungkan toko online',
      'Stok akan otomatis berkurang saat ada penjualan di marketplace',
      'Pesanan dari marketplace masuk ke halaman Transactions',
    ],
    link: '/dashboard/settings/integrations',
  },
  'extra-products': {
    title: 'Extra Products Pack Aktif',
    steps: [
      'Limit produk Anda telah ditingkatkan',
      'Anda sekarang bisa menambahkan lebih banyak produk ke katalog',
      'Buka menu Products untuk mulai menambah produk baru',
    ],
    link: '/dashboard/products',
  },
  'extra-users': {
    title: 'Extra Users Pack Aktif',
    steps: [
      'Limit user/karyawan Anda telah ditingkatkan',
      'Anda sekarang bisa menambahkan lebih banyak karyawan',
      'Buka menu Employees untuk menambah karyawan baru',
    ],
    link: '/dashboard/employees',
  },
  'priority-support': {
    title: 'Priority Support Aktif',
    steps: [
      'Anda mendapat akses ke tim support prioritas',
      'Response time: maksimal 2 jam di hari kerja',
      'Hubungi support via WhatsApp: +62-xxx-xxxx-xxxx',
      'Atau email: priority@monetrapos.com',
    ],
  },
  'onsite-training': {
    title: 'On-site Training',
    steps: [
      'Tim trainer kami akan datang ke lokasi bisnis Anda',
      'Hubungi tim kami untuk menjadwalkan sesi training',
      'WhatsApp: +62-xxx-xxxx-xxxx',
      'Training mencakup: setup POS, manajemen inventory, laporan keuangan',
    ],
  },
};

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  active:          { label: 'Aktif',             icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)' },
  pending_payment: { label: 'Menunggu Pembayaran', icon: Clock,       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)' },
  expired:         { label: 'Kedaluwarsa',        icon: AlertCircle, color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)' },
  cancelled:       { label: 'Dibatalkan',         icon: XCircle,     color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)' },
};

export default function MyAddOnsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [companyAddOns, setCompanyAddOns] = useState<CompanyAddOn[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [cancelConfirm, setCancelConfirm] = useState<{ open: boolean; addOn: CompanyAddOn | null }>({ open: false, addOn: null });

  useEffect(() => {
    loadCompanyAddOns();
    // Auto-refresh setiap 15 detik untuk mendeteksi aktivasi manual oleh admin
    const interval = setInterval(() => silentRefresh(), 15_000);
    return () => clearInterval(interval);
  }, []);

  const loadCompanyAddOns = async () => {
    try {
      setLoading(true);
      const data = await addOnsService.getPurchasedAddOns();
      setCompanyAddOns(data);
    } catch (error: any) {
      console.error('Failed to load purchased add-ons:', error);
      toast.error('Gagal memuat add-on Anda');
    } finally {
      setLoading(false);
    }
  };

  const silentRefresh = async () => {
    try {
      setRefreshing(true);
      const data = await addOnsService.getPurchasedAddOns();
      setCompanyAddOns(prev => {
        // Cek apakah ada perubahan status
        const hasChange = data.some(newItem => {
          const old = prev.find(o => o.id === newItem.id);
          return old && old.status !== newItem.status;
        });
        if (hasChange) toast.success('Status add-on diperbarui!');
        return data;
      });
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancel = async (companyAddOn: CompanyAddOn) => {
    setCancelConfirm({ open: true, addOn: companyAddOn });
  };

  const confirmCancel = async () => {
    if (!cancelConfirm.addOn) return;
    try {
      setCancelling(cancelConfirm.addOn.id);
      await addOnsService.cancelAddOn(cancelConfirm.addOn.id);
      toast.success('Add-on cancelled successfully');
      setCancelConfirm({ open: false, addOn: null });
      await loadCompanyAddOns();
    } catch (error: any) {
      console.error('Failed to cancel add-on:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel add-on');
    } finally {
      setCancelling(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const filteredAddOns = companyAddOns.filter((ca) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ca.status === 'active';
    if (filter === 'expired') return ca.status === 'expired' || ca.status === 'cancelled';
    return true;
  });

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 
            size={40} 
            style={{ 
              animation: 'spin 1s linear infinite', 
              color: 'var(--primary)',
              margin: '0 auto 16px'
            }} 
          />
          <p style={{ color: 'var(--text-secondary)' }}>Loading your add-ons...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <button onClick={() => router.push('/dashboard/add-ons')} className="btn"
            style={{ marginBottom: 'var(--space-md)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={16} />
            Kembali ke Marketplace
          </button>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Add-on Saya</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Kelola add-on yang sudah Anda beli. Halaman ini otomatis refresh setiap 15 detik.
          </p>
        </div>
        <button onClick={silentRefresh} className="btn btn-outline" disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
          <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="glass-panel" style={{ padding: 0, marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'expired', label: 'Expired/Cancelled' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              style={{
                flex: 1,
                padding: 'var(--space-md)',
                background: filter === tab.key ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                border: 'none',
                borderBottom: filter === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                color: filter === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add-ons List */}
      {filteredAddOns.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <Package size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>
            No add-ons found
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            {filter === 'all' 
              ? "You haven't purchased any add-ons yet."
              : `No ${filter} add-ons found.`
            }
          </p>
          <button
            onClick={() => router.push('/dashboard/add-ons')}
            className="btn btn-primary"
          >
            Browse Add-ons Marketplace
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {filteredAddOns.map((companyAddOn) => {
            const config = statusConfig[companyAddOn.status] || statusConfig.cancelled;
            const StatusIcon = config.icon;
            const isCancelling = cancelling === companyAddOn.id;
            const canCancel = companyAddOn.status === 'active' &&
                             companyAddOn.add_on.pricing_type === 'recurring' &&
                             companyAddOn.auto_renew;
            const slug = companyAddOn.add_on?.slug || '';
            const guide = ADDON_USAGE_GUIDE[slug];

            return (
              <div
                key={companyAddOn.id}
                className="glass-panel animate-fade-in"
                style={{ padding: 'var(--space-lg)', borderLeft: companyAddOn.status === 'active' ? '3px solid #10b981' : '3px solid var(--border-subtle)' }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    {/* Status Badge */}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 12, fontSize: '0.82rem', fontWeight: 600, background: config.bg, color: config.color, border: `1px solid ${config.border}`, marginBottom: 'var(--space-sm)' }}>
                      <StatusIcon size={13} /> {config.label}
                    </span>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 4 }}>
                      {companyAddOn.add_on.icon_url && <span style={{ marginRight: 8 }}>{companyAddOn.add_on.icon_url}</span>}
                      {companyAddOn.add_on.name}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-md)' }}>
                      {companyAddOn.add_on.description}
                    </p>

                    {/* Meta info */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>Harga Beli</div>
                        <div style={{ fontWeight: 600 }}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(companyAddOn.purchase_price)}</div>
                      </div>
                      {companyAddOn.activated_at && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>Diaktifkan</div>
                          <div style={{ fontWeight: 600 }}>{new Date(companyAddOn.activated_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        </div>
                      )}
                      {companyAddOn.expires_at && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>
                            {companyAddOn.status === 'active' ? 'Berlaku hingga' : 'Kedaluwarsa'}
                          </div>
                          <div style={{ fontWeight: 600 }}>{new Date(companyAddOn.expires_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        </div>
                      )}
                      {companyAddOn.add_on.pricing_type === 'recurring' && companyAddOn.status === 'active' && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>Auto-Renewal</div>
                          <div style={{ fontWeight: 600, color: companyAddOn.auto_renew ? '#10b981' : '#6b7280' }}>
                            {companyAddOn.auto_renew ? '✓ Aktif' : '✗ Nonaktif'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', flexShrink: 0 }}>
                    {guide && companyAddOn.status === 'active' && guide.link && (
                      <button onClick={() => router.push(guide.link!)} className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        <ExternalLink size={14} /> Buka Fitur
                      </button>
                    )}
                    {canCancel && (
                      <button onClick={() => handleCancel(companyAddOn)} disabled={isCancelling} className="btn btn-outline"
                        style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        {isCancelling ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={14} />}
                        Batalkan
                      </button>
                    )}
                  </div>
                </div>

                {/* Usage Guide — hanya tampil jika aktif */}
                {companyAddOn.status === 'active' && guide && (
                  <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md) var(--space-lg)', background: 'rgba(99,102,241,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-sm)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>
                      <Info size={15} /> {guide.title}
                    </div>
                    <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {guide.steps.map((step, i) => (
                        <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <ConfirmModal
        open={cancelConfirm.open}
        title="Batalkan Add-on"
        description={`Yakin ingin membatalkan "${cancelConfirm.addOn?.add_on.name}"? Add-on akan tetap aktif hingga masa berlakunya habis.`}
        confirmLabel="Ya, Batalkan"
        variant="warning"
        loading={!!cancelling}
        onConfirm={confirmCancel}
        onClose={() => setCancelConfirm({ open: false, addOn: null })}
      />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { useAddOns, ADD_ON_SLUGS } from '@/hooks/useAddOns';
import toast from 'react-hot-toast';
import {
  MessageCircle, BookOpen, Calculator, ShoppingBag, Truck,
  Globe, CheckCircle, Lock, ExternalLink, Save, Loader2,
  ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';

// ─── Definisi semua integrasi ────────────────────────────────────────────────

interface IntegrationDef {
  id: string;
  name: string;
  description: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  addOnSlug: string | null; // null = gratis / tidak butuh add-on
  category: 'messaging' | 'accounting' | 'ecommerce' | 'delivery' | 'other';
  docsUrl?: string;
  fields: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'url' | 'select';
    placeholder?: string;
    options?: { value: string; label: string }[];
    hint?: string;
    required?: boolean;
  }[];
  testEndpoint?: string; // endpoint backend untuk test koneksi
}

const INTEGRATIONS: IntegrationDef[] = [
  // ── Messaging ──────────────────────────────────────────────────────────────
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Kirim notifikasi otomatis ke customer via WhatsApp — konfirmasi pesanan, status laundry, pengingat ulang tahun, dll.',
    icon: MessageCircle,
    iconColor: '#25d366',
    iconBg: 'rgba(37,211,102,0.12)',
    addOnSlug: ADD_ON_SLUGS.WHATSAPP,
    category: 'messaging',
    docsUrl: 'https://business.whatsapp.com/',
    fields: [
      { key: 'provider', label: 'Provider', type: 'select', required: true,
        options: [
          { value: 'fonnte', label: 'Fonnte (fonnte.com)' },
          { value: 'wablas', label: 'Wablas (wablas.com)' },
          { value: 'whacenter', label: 'WhaCenter (whacenter.com)' },
          { value: 'official', label: 'WhatsApp Business API (Meta)' },
        ],
        hint: 'Pilih provider WhatsApp gateway yang Anda gunakan',
      },
      { key: 'apiKey', label: 'API Key / Token', type: 'password', placeholder: 'Masukkan API key dari provider', required: true },
      { key: 'senderNumber', label: 'Nomor Pengirim', type: 'text', placeholder: '628123456789', hint: 'Nomor WhatsApp yang terdaftar di provider (format internasional tanpa +)' },
      { key: 'webhookUrl', label: 'Webhook URL (opsional)', type: 'url', placeholder: 'https://...', hint: 'URL untuk menerima pesan masuk dari customer' },
    ],
  },

  // ── Accounting ─────────────────────────────────────────────────────────────
  {
    id: 'jurnal',
    name: 'Jurnal.id',
    description: 'Sinkronisasi transaksi penjualan, pembelian, dan pengeluaran ke Jurnal.id secara otomatis.',
    icon: BookOpen,
    iconColor: '#3b82f6',
    iconBg: 'rgba(59,130,246,0.12)',
    addOnSlug: ADD_ON_SLUGS.ACCOUNTING,
    category: 'accounting',
    docsUrl: 'https://developer.jurnal.id/',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Dari Jurnal Developer Console', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Dari Jurnal Developer Console', required: true },
      { key: 'companyId', label: 'Company ID Jurnal', type: 'text', placeholder: 'ID perusahaan di Jurnal.id', hint: 'Buka Jurnal.id → Settings → Company Info untuk menemukan ID ini' },
      { key: 'salesAccountCode', label: 'Kode Akun Penjualan', type: 'text', placeholder: '4-0001', hint: 'Kode akun untuk mencatat pendapatan penjualan' },
      { key: 'syncMode', label: 'Mode Sinkronisasi', type: 'select',
        options: [
          { value: 'realtime', label: 'Real-time (setiap transaksi)' },
          { value: 'daily', label: 'Harian (setiap tengah malam)' },
          { value: 'manual', label: 'Manual saja' },
        ],
      },
    ],
  },
  {
    id: 'accurate',
    name: 'Accurate Online',
    description: 'Export data transaksi, stok, dan pelanggan ke Accurate Online untuk pembukuan yang akurat.',
    icon: Calculator,
    iconColor: '#8b5cf6',
    iconBg: 'rgba(139,92,246,0.12)',
    addOnSlug: ADD_ON_SLUGS.ACCOUNTING,
    category: 'accounting',
    docsUrl: 'https://developer.accurate.id/',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Dari Accurate Developer Portal', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Dari Accurate Developer Portal', required: true },
      { key: 'dbId', label: 'Database ID', type: 'text', placeholder: 'ID database Accurate Anda', hint: 'Buka Accurate Online → Settings → Database untuk menemukan ID ini' },
      { key: 'salesItemCode', label: 'Kode Item Penjualan', type: 'text', placeholder: 'SALES-001' },
      { key: 'syncMode', label: 'Mode Sinkronisasi', type: 'select',
        options: [
          { value: 'realtime', label: 'Real-time' },
          { value: 'daily', label: 'Harian' },
          { value: 'manual', label: 'Manual' },
        ],
      },
    ],
  },

  // ── E-Commerce ─────────────────────────────────────────────────────────────
  {
    id: 'tokopedia',
    name: 'Tokopedia',
    description: 'Sinkronisasi produk dan stok antara MonetraPOS dan toko Tokopedia Anda secara otomatis.',
    icon: ShoppingBag,
    iconColor: '#00aa5b',
    iconBg: 'rgba(0,170,91,0.12)',
    addOnSlug: ADD_ON_SLUGS.ECOMMERCE,
    category: 'ecommerce',
    docsUrl: 'https://developer.tokopedia.com/',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Dari Tokopedia Partner Portal', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Dari Tokopedia Partner Portal', required: true },
      { key: 'shopId', label: 'Shop ID', type: 'text', placeholder: 'ID toko Tokopedia Anda' },
      { key: 'syncStock', label: 'Sinkronisasi Stok', type: 'select',
        options: [
          { value: 'both', label: 'Dua arah (POS ↔ Tokopedia)' },
          { value: 'pos_to_toped', label: 'POS → Tokopedia saja' },
          { value: 'none', label: 'Tidak sinkronisasi stok' },
        ],
      },
    ],
  },
  {
    id: 'shopee',
    name: 'Shopee',
    description: 'Sinkronisasi produk, stok, dan pesanan antara MonetraPOS dan toko Shopee Anda.',
    icon: ShoppingBag,
    iconColor: '#ee4d2d',
    iconBg: 'rgba(238,77,45,0.12)',
    addOnSlug: ADD_ON_SLUGS.ECOMMERCE,
    category: 'ecommerce',
    docsUrl: 'https://open.shopee.com/',
    fields: [
      { key: 'partnerId', label: 'Partner ID', type: 'text', placeholder: 'Dari Shopee Open Platform', required: true },
      { key: 'partnerKey', label: 'Partner Key', type: 'password', placeholder: 'Dari Shopee Open Platform', required: true },
      { key: 'shopId', label: 'Shop ID', type: 'text', placeholder: 'ID toko Shopee Anda' },
      { key: 'syncStock', label: 'Sinkronisasi Stok', type: 'select',
        options: [
          { value: 'both', label: 'Dua arah' },
          { value: 'pos_to_shopee', label: 'POS → Shopee saja' },
          { value: 'none', label: 'Tidak sinkronisasi' },
        ],
      },
    ],
  },

  // ── Delivery ───────────────────────────────────────────────────────────────
  {
    id: 'gofood',
    name: 'GoFood (GoBiz)',
    description: 'Terima pesanan GoFood langsung di sistem POS. Pesanan otomatis masuk ke antrian dapur.',
    icon: Truck,
    iconColor: '#00aed6',
    iconBg: 'rgba(0,174,214,0.12)',
    addOnSlug: ADD_ON_SLUGS.DELIVERY,
    category: 'delivery',
    docsUrl: 'https://gobiz.co.id/',
    fields: [
      { key: 'merchantId', label: 'Merchant ID GoBiz', type: 'text', placeholder: 'Dari dashboard GoBiz', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Dari GoBiz Partner Portal', required: true },
      { key: 'outletId', label: 'Outlet ID', type: 'text', placeholder: 'ID outlet di GoBiz', hint: 'Jika punya beberapa outlet, masukkan ID outlet yang ingin dihubungkan' },
      { key: 'autoAccept', label: 'Auto-Accept Pesanan', type: 'select',
        options: [
          { value: 'true', label: 'Ya — terima otomatis' },
          { value: 'false', label: 'Tidak — konfirmasi manual' },
        ],
      },
    ],
  },
  {
    id: 'grabfood',
    name: 'GrabFood',
    description: 'Integrasi dengan GrabFood untuk menerima pesanan delivery langsung di POS.',
    icon: Truck,
    iconColor: '#00b14f',
    iconBg: 'rgba(0,177,79,0.12)',
    addOnSlug: ADD_ON_SLUGS.DELIVERY,
    category: 'delivery',
    docsUrl: 'https://merchant.grab.com/',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', placeholder: 'Dari GrabMerchant Portal', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Dari GrabMerchant Portal', required: true },
      { key: 'outletId', label: 'Outlet ID', type: 'text', placeholder: 'ID outlet GrabFood' },
    ],
  },
  {
    id: 'shopeefood',
    name: 'ShopeeFood',
    description: 'Terima pesanan ShopeeFood langsung di sistem POS tanpa perlu cek tablet terpisah.',
    icon: Truck,
    iconColor: '#ee4d2d',
    iconBg: 'rgba(238,77,45,0.12)',
    addOnSlug: ADD_ON_SLUGS.DELIVERY,
    category: 'delivery',
    docsUrl: 'https://merchant.shopeefood.co.id/',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', placeholder: 'Dari ShopeeFood Merchant Portal', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Dari ShopeeFood Merchant Portal', required: true },
    ],
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  messaging: '💬 Pesan & Notifikasi',
  accounting: '📊 Akuntansi',
  ecommerce: '🛒 E-Commerce',
  delivery: '🛵 Delivery',
  other: '🔧 Lainnya',
};

// ─── Komponen utama ───────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const router = useRouter();
  const { hasAddOn, loading: addOnsLoading } = useAddOns();
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => { loadConfigs(); }, []);

  const loadConfigs = async () => {
    try {
      const res: any = await apiClient.get('/companies/integrations');
      setConfigs(res.data || {});
    } catch {
      setConfigs({});
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (integrationId: string) => {
    setSaving(integrationId);
    try {
      await apiClient.patch('/companies/integrations', {
        [integrationId]: configs[integrationId] || {},
      });
      toast.success('Konfigurasi disimpan');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async (integration: IntegrationDef) => {
    setTesting(integration.id);
    try {
      // Simpan dulu sebelum test
      await apiClient.patch('/companies/integrations', {
        [integration.id]: configs[integration.id] || {},
      });
      // Test koneksi
      const res: any = await apiClient.post(`/companies/integrations/${integration.id}/test`);
      if (res.data?.success) {
        toast.success(`✅ Koneksi ${integration.name} berhasil!`);
      } else {
        toast.error(res.data?.message || 'Koneksi gagal');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Gagal test koneksi ${integration.name}`);
    } finally {
      setTesting(null);
    }
  };

  const updateField = (integrationId: string, key: string, value: string) => {
    setConfigs(prev => ({
      ...prev,
      [integrationId]: { ...(prev[integrationId] || {}), [key]: value },
    }));
  };

  const isConfigured = (integrationId: string): boolean => {
    const cfg = configs[integrationId];
    if (!cfg) return false;
    const integration = INTEGRATIONS.find(i => i.id === integrationId);
    if (!integration) return false;
    return integration.fields.filter(f => f.required).every(f => !!cfg[f.key]);
  };

  // Group by category — hanya tampilkan integrasi yang add-on-nya aktif atau gratis
  const byCategory = INTEGRATIONS.reduce((acc, i) => {
    // Sembunyikan jika butuh add-on tapi belum aktif
    const locked = i.addOnSlug !== null && !hasAddOn(i.addOnSlug);
    if (locked) return acc;

    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {} as Record<string, IntegrationDef[]>);

  // Hitung berapa integrasi yang terkunci (untuk ditampilkan di upsell)
  const lockedIntegrations = INTEGRATIONS.filter(i => i.addOnSlug !== null && !hasAddOn(i.addOnSlug));
  const lockedAddOnSlugs = [...new Set(lockedIntegrations.map(i => i.addOnSlug).filter(Boolean))];

  if (loading || addOnsLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
      </div>
    );
  }

  const hasAnyIntegration = Object.keys(byCategory).length > 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Integrasi Pihak Ketiga</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Hubungkan MonetraPOS dengan WhatsApp, software akuntansi, marketplace, dan platform delivery.
          </p>
        </div>
        <button onClick={loadConfigs} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Upsell banner jika ada integrasi yang terkunci */}
      {lockedIntegrations.length > 0 && (
        <div style={{ padding: 'var(--space-md) var(--space-lg)', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xl)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Lock size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{lockedIntegrations.length} integrasi lainnya</strong> tersedia dengan add-on berbayar
            {' '}(WhatsApp, Jurnal.id, Accurate, Tokopedia, Shopee, GoFood, GrabFood, ShopeeFood).
          </div>
          <button onClick={() => router.push('/dashboard/add-ons')} className="btn btn-primary"
            style={{ fontSize: '0.85rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ExternalLink size={14} /> Lihat Add-ons
          </button>
        </div>
      )}

      {/* Tidak ada integrasi sama sekali */}
      {!hasAnyIntegration && (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-lg)' }}>
            <Lock size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
            Belum Ada Integrasi Aktif
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 420, margin: '0 auto var(--space-lg)' }}>
            Aktifkan add-on untuk menggunakan integrasi dengan WhatsApp, Jurnal.id, Accurate, Tokopedia, Shopee, GoFood, GrabFood, dan ShopeeFood.
          </p>
          <button onClick={() => router.push('/dashboard/add-ons')} className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ExternalLink size={16} /> Lihat Add-ons Marketplace
          </button>
        </div>
      )}

      {/* Integrations by category */}
      {Object.entries(byCategory).map(([category, integrations]) => (
        <div key={category} style={{ marginBottom: 'var(--space-2xl)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {CATEGORY_LABELS[category] || category}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {integrations.map(integration => {
              const configured = isConfigured(integration.id);
              const isExpanded = expanded === integration.id;
              const Icon = integration.icon;
              const isSaving = saving === integration.id;
              const isTesting = testing === integration.id;

              return (
                <div key={integration.id} className="glass-panel"
                  style={{ padding: 0, border: configured ? '1px solid rgba(16,185,129,0.3)' : undefined }}>

                  {/* Header row */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-lg)', cursor: 'pointer' }}
                    onClick={() => setExpanded(isExpanded ? null : integration.id)}
                  >
                    {/* Icon */}
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: integration.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={22} style={{ color: integration.iconColor }} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{integration.name}</span>
                        {configured && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
                            <CheckCircle size={11} /> Terkonfigurasi
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                        {integration.description}
                      </p>
                    </div>

                    {/* Right side */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {integration.docsUrl && (
                        <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--text-tertiary)', textDecoration: 'none' }}>
                          <ExternalLink size={13} /> Docs
                        </a>
                      )}
                      <div style={{ color: 'var(--text-tertiary)' }}>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Config form */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 'var(--space-lg)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                        {integration.fields.map(field => (
                          <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">
                              {field.label} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                            </label>

                            {field.type === 'select' ? (
                              <select className="form-input"
                                value={configs[integration.id]?.[field.key] || ''}
                                onChange={e => updateField(integration.id, field.key, e.target.value)}>
                                <option value="">Pilih...</option>
                                {field.options?.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            ) : (
                              <div style={{ position: 'relative' }}>
                                <input
                                  className="form-input"
                                  type={field.type === 'password' && !showSecrets[`${integration.id}.${field.key}`] ? 'password' : 'text'}
                                  placeholder={field.placeholder}
                                  value={configs[integration.id]?.[field.key] || ''}
                                  onChange={e => updateField(integration.id, field.key, e.target.value)}
                                  style={{ paddingRight: field.type === 'password' ? 40 : undefined }}
                                />
                                {field.type === 'password' && (
                                  <button type="button"
                                    onClick={() => setShowSecrets(p => ({ ...p, [`${integration.id}.${field.key}`]: !p[`${integration.id}.${field.key}`] }))}
                                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                                    {showSecrets[`${integration.id}.${field.key}`] ? 'Sembunyikan' : 'Tampilkan'}
                                  </button>
                                )}
                              </div>
                            )}

                            {field.hint && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{field.hint}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleTest(integration)} disabled={!!isTesting || !!isSaving}
                          className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                          {isTesting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={14} />}
                          Test Koneksi
                        </button>
                        <button onClick={() => handleSave(integration.id)} disabled={!!isSaving || !!isTesting}
                          className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                          {isSaving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                          Simpan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import { CheckCircle, Zap, Star, Building2, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxStores: number;
  maxUsers: number;
  maxEmployees: number;
  maxProducts: number;
  maxTransactionsPerMonth: number;
  features: Record<string, boolean>;
  isPopular: boolean;
  durations?: Array<{
    durationMonths: number;
    discountPercentage: number;
    finalPrice: number;
  }>;
}

const FEATURE_LABELS: Record<string, string> = {
  pos: 'Sistem POS',
  inventory: 'Manajemen Inventori',
  basic_reports: 'Laporan Dasar',
  customer_management: 'Manajemen Pelanggan',
  employee_management: 'Manajemen Karyawan',
  advanced_reports: 'Laporan Lanjutan & Analitik',
  multi_store: 'Multi-Toko',
  api_access: 'Akses API',
  priority_support: 'Dukungan Prioritas',
};

export default function UpgradePage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<Record<string, number>>({});
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await apiClient.get('/subscription-plans/with-durations');
      // Filter out trial plan
      const paidPlans = (res.data || []).filter((p: Plan) => p.slug !== 'trial' && p.priceMonthly > 0);
      setPlans(paidPlans);
      // Default duration: 1 month for each plan
      const defaults: Record<string, number> = {};
      paidPlans.forEach((p: Plan) => { defaults[p.id] = 1; });
      setSelectedDuration(defaults);
    } catch (error) {
      toast.error('Gagal memuat paket. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    const months = selectedDuration[plan.id] || 1;
    setUpgrading(plan.id);
    try {
      // Create invoice and get payment URL
      const res = await apiClient.post('/subscriptions/renew', {
        planId: plan.id,
        durationMonths: months,
      });

      if (res.data?.paymentUrl) {
        toast.success('Mengarahkan ke halaman pembayaran...');
        window.location.href = res.data.paymentUrl;
      } else {
        toast.success('Invoice berhasil dibuat! Silakan selesaikan pembayaran.');
        router.push('/dashboard/billing');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gagal memproses upgrade. Silakan coba lagi.';
      toast.error(msg);
    } finally {
      setUpgrading(null);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const getPrice = (plan: Plan, months: number) => {
    const duration = plan.durations?.find((d) => d.durationMonths === months);
    if (duration) return { price: duration.finalPrice, discount: duration.discountPercentage };
    return { price: plan.priceMonthly * months, discount: 0 };
  };

  const planIcons: Record<string, any> = {
    starter: Zap,
    professional: Star,
    enterprise: Building2,
  };

  const planColors: Record<string, string> = {
    starter: '#6366f1',
    professional: '#8b5cf6',
    enterprise: '#ec4899',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: '2rem 1rem',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Back Button */}
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            marginBottom: '2rem',
            fontSize: '0.875rem',
          }}
        >
          <ArrowLeft size={16} />
          Kembali ke Dashboard
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Upgrade ke Paket Berbayar
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
            Unlock semua fitur dan limit tidak terbatas untuk bisnis Anda
          </p>
        </div>

        {/* Trial vs Paid Comparison */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 16,
          padding: '1.5rem 2rem',
          marginBottom: '3rem',
          color: 'white',
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            🔒 Fitur yang Terbatas di Trial vs Paket Berbayar
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { trial: '50 produk', paid: 'Produk tidak terbatas' },
              { trial: '100 transaksi/bulan', paid: 'Transaksi tidak terbatas' },
              { trial: '2 pengguna', paid: 'Pengguna sesuai paket' },
              { trial: 'Tanpa manajemen pelanggan', paid: 'Manajemen pelanggan penuh' },
              { trial: 'Tanpa manajemen karyawan', paid: 'Manajemen karyawan penuh' },
              { trial: 'Laporan dasar saja', paid: 'Laporan lanjutan & analitik' },
            ].map(({ trial, paid }) => (
              <div key={trial} style={{ fontSize: '0.875rem' }}>
                <div style={{ opacity: 0.7, textDecoration: 'line-through', marginBottom: 2 }}>❌ {trial}</div>
                <div>✅ {paid}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Plans */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-base)' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {plans.map((plan) => {
              const Icon = planIcons[plan.slug] || Zap;
              const color = planColors[plan.slug] || '#6366f1';
              const months = selectedDuration[plan.id] || 1;
              const { price, discount } = getPrice(plan, months);

              return (
                <div
                  key={plan.id}
                  style={{
                    background: 'white',
                    borderRadius: 16,
                    border: plan.isPopular ? `2px solid ${color}` : '1px solid #e5e7eb',
                    overflow: 'hidden',
                    boxShadow: plan.isPopular ? `0 8px 30px ${color}30` : '0 2px 8px rgba(0,0,0,0.08)',
                    position: 'relative',
                  }}
                >
                  {plan.isPopular && (
                    <div style={{
                      background: color,
                      color: 'white',
                      textAlign: 'center',
                      padding: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                    }}>
                      ⭐ PALING POPULER
                    </div>
                  )}

                  <div style={{ padding: '2rem' }}>
                    {/* Plan Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: `${color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Icon size={24} color={color} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>{plan.name}</h3>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>{plan.description}</p>
                      </div>
                    </div>

                    {/* Duration Selector */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '0.5rem' }}>
                        PILIH DURASI
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {[1, 3, 6, 12].map((m) => {
                          const d = plan.durations?.find((x) => x.durationMonths === m);
                          return (
                            <button
                              key={m}
                              onClick={() => setSelectedDuration({ ...selectedDuration, [plan.id]: m })}
                              style={{
                                padding: '0.375rem 0.75rem',
                                borderRadius: 8,
                                border: '1.5px solid',
                                borderColor: months === m ? color : '#e5e7eb',
                                background: months === m ? `${color}10` : 'white',
                                color: months === m ? color : '#6b7280',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                position: 'relative',
                              }}
                            >
                              {m} bln
                              {d && d.discountPercentage > 0 && (
                                <span style={{
                                  position: 'absolute',
                                  top: -8,
                                  right: -8,
                                  background: '#10b981',
                                  color: 'white',
                                  fontSize: '0.6rem',
                                  padding: '1px 4px',
                                  borderRadius: 4,
                                  fontWeight: 700,
                                }}>
                                  -{d.discountPercentage}%
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Price */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: color }}>
                        {formatCurrency(price)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        untuk {months} bulan
                        {discount > 0 && (
                          <span style={{ color: '#10b981', fontWeight: 600, marginLeft: 8 }}>
                            Hemat {discount}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Limits */}
                    <div style={{
                      background: '#f9fafb',
                      borderRadius: 8,
                      padding: '1rem',
                      marginBottom: '1.5rem',
                      fontSize: '0.8rem',
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', color: '#374151' }}>
                        <div>🏪 {plan.maxStores === 999 ? 'Unlimited' : plan.maxStores} toko</div>
                        <div>👥 {plan.maxUsers === 999 ? 'Unlimited' : plan.maxUsers} pengguna</div>
                        <div>📦 {plan.maxProducts === 999999 ? 'Unlimited' : plan.maxProducts.toLocaleString()} produk</div>
                        <div>🧾 {plan.maxTransactionsPerMonth === 999999 ? 'Unlimited' : plan.maxTransactionsPerMonth.toLocaleString()} tx/bln</div>
                      </div>
                    </div>

                    {/* Features */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      {Object.entries(plan.features || {}).map(([key, enabled]) => (
                        <div
                          key={key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '0.375rem 0',
                            fontSize: '0.875rem',
                            color: enabled ? '#374151' : '#d1d5db',
                          }}
                        >
                          <CheckCircle size={16} color={enabled ? '#10b981' : '#d1d5db'} />
                          {FEATURE_LABELS[key] || key}
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleUpgrade(plan)}
                      disabled={upgrading === plan.id}
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        background: plan.isPopular
                          ? `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`
                          : color,
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: upgrading === plan.id ? 'not-allowed' : 'pointer',
                        opacity: upgrading === plan.id ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.2s',
                      }}
                    >
                      {upgrading === plan.id ? (
                        <>
                          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <Zap size={18} />
                          Pilih {plan.name}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ */}
        <div style={{ marginTop: '4rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Pertanyaan Umum
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', textAlign: 'left' }}>
            {[
              {
                q: 'Apakah data trial saya akan hilang?',
                a: 'Tidak! Semua data yang Anda buat selama trial akan tetap ada setelah upgrade.',
              },
              {
                q: 'Bisa upgrade kapan saja?',
                a: 'Ya, Anda bisa upgrade kapan saja selama masa trial atau setelah trial berakhir.',
              },
              {
                q: 'Metode pembayaran apa yang diterima?',
                a: 'Transfer bank, kartu kredit, e-wallet (GoPay, OVO, DANA), dan QRIS.',
              },
              {
                q: 'Bisa downgrade atau cancel?',
                a: 'Ya, Anda bisa cancel kapan saja. Tidak ada biaya tersembunyi.',
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: '1.25rem',
                  border: '1px solid #e5e7eb',
                }}
              >
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
                  {q}
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.6 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `@keyframes spin { 100% { transform: rotate(360deg); } }`,
      }} />
    </div>
  );
}

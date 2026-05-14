'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Package, Users, Receipt, DollarSign, AlertTriangle, RefreshCcw, TrendingUp, ShoppingCart, Clock, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { format, subDays, startOfMonth, startOfWeek } from 'date-fns';
import Link from 'next/link';
import { StatsCard, LoadingSpinner } from '@/components/ui';
import toast from 'react-hot-toast';

interface DashboardMetrics {
  period: { startDate: string; endDate: string };
  metrics: {
    totalRevenue: number; totalTransactions: number; averageTransaction: number;
    totalProducts: number; activeProducts: number; totalCustomers: number;
    newCustomers: number; lowStockProducts: number; totalInventoryValue: number;
  };
  topProducts: Array<{ productId: string; productName: string; quantitySold: number; revenue: number }>;
  lowStockAlerts: Array<{ productId: string; productName: string; sku: string; currentStock: number; lowStockThreshold: number }>;
  revenueChart: Array<{ date: string; revenue: number; transactions: number }>;
}

type Period = 'today' | '7d' | '30d' | 'month' | 'custom';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Hari Ini' },
  { key: '7d', label: '7 Hari' },
  { key: '30d', label: '30 Hari' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'custom', label: 'Custom' },
];

function getPeriodDates(period: Period, custom: { start: string; end: string }) {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (period) {
    case 'today': return { startDate: fmt(today), endDate: fmt(today) };
    case '7d': return { startDate: fmt(subDays(today, 6)), endDate: fmt(today) };
    case '30d': return { startDate: fmt(subDays(today, 29)), endDate: fmt(today) };
    case 'month': return { startDate: fmt(startOfMonth(today)), endDate: fmt(today) };
    case 'custom': return { startDate: custom.start, endDate: custom.end };
  }
}

export default function DashboardPage() {
  const { user, subscription } = useAuth();
  const searchParams = useSearchParams();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('7d');
  const [custom, setCustom] = useState({ start: '', end: '' });

  // Tampilkan toast jika redirect dari halaman yang tidak punya permission
  useEffect(() => {
    if (searchParams?.get('error') === 'forbidden') {
      toast.error('Anda tidak memiliki izin untuk mengakses halaman tersebut.');
    }
  }, [searchParams]);

  useEffect(() => { fetchMetrics(); }, [period, custom.start, custom.end]);

  const fetchMetrics = async () => {
    if (period === 'custom' && (!custom.start || !custom.end)) return;
    try {
      setLoading(true);
      const { startDate, endDate } = getPeriodDates(period, custom);
      const res = await apiClient.get<DashboardMetrics>(`/reports/dashboard?startDate=${startDate}&endDate=${endDate}`);
      setMetrics(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat data dashboard');
    } finally { setLoading(false); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  // Calculate trial days remaining
  const trialDaysRemaining = (() => {
    const sub = subscription as any;
    if (!sub || sub.status !== 'trial') return null;
    const trialEnd = sub.trialEnd || sub.trial_end || sub.trial_days_remaining;
    if (typeof trialEnd === 'number') return trialEnd;
    if (trialEnd) return Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000));
    return sub.trial_days_remaining ?? null;
  })();

  return (
    <div className="space-y-6">
      {/* Trial In-App Notification */}
      {trialDaysRemaining !== null && (
        <div style={{
          background: trialDaysRemaining <= 3
            ? 'linear-gradient(135deg, #fef2f2, #fee2e2)'
            : trialDaysRemaining <= 7
            ? 'linear-gradient(135deg, #fffbeb, #fef3c7)'
            : 'linear-gradient(135deg, #eff6ff, #dbeafe)',
          border: `1px solid ${trialDaysRemaining <= 3 ? '#fca5a5' : trialDaysRemaining <= 7 ? '#fcd34d' : '#93c5fd'}`,
          borderRadius: 12,
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.5rem' }}>
              {trialDaysRemaining <= 3 ? '🚨' : trialDaysRemaining <= 7 ? '⏰' : '🎉'}
            </span>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2937', margin: 0 }}>
                {trialDaysRemaining === 0
                  ? 'Trial Anda berakhir hari ini!'
                  : `Trial aktif — ${trialDaysRemaining} hari tersisa`}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>
                {trialDaysRemaining <= 3
                  ? 'Segera upgrade agar tidak kehilangan akses ke data Anda.'
                  : 'Upgrade sekarang untuk unlock semua fitur tanpa batas.'}
              </p>
            </div>
          </div>
          <a
            href="/upgrade"
            style={{
              background: trialDaysRemaining <= 3 ? '#dc2626' : '#6366f1',
              color: 'white',
              padding: '0.5rem 1.25rem',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Upgrade Sekarang →
          </a>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Selamat datang, {user?.firstName || 'Pengguna'}! 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Ringkasan bisnis Anda.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Filter */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${period === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" className="form-input text-xs py-1.5" value={custom.start} onChange={e => setCustom(p => ({ ...p, start: e.target.value }))} />
              <span className="text-gray-400 text-xs">–</span>
              <input type="date" className="form-input text-xs py-1.5" value={custom.end} onChange={e => setCustom(p => ({ ...p, end: e.target.value }))} />
            </div>
          )}
          <button onClick={fetchMetrics} className="btn btn-outline btn-sm" disabled={loading}>
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger"><AlertTriangle size={16} />{error}</div>}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-lg mb-3" />
              <div className="h-7 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Pendapatan" value={fmt(metrics?.metrics.totalRevenue || 0)} icon={DollarSign} color="green"
            sub={`${metrics?.metrics.totalTransactions || 0} transaksi`} />
          <StatsCard label="Rata-rata Transaksi" value={fmt(metrics?.metrics.averageTransaction || 0)} icon={TrendingUp} color="indigo"
            sub="Per transaksi" />
          <StatsCard label="Produk" value={metrics?.metrics.totalProducts || 0} icon={Package} color="blue"
            sub={`${metrics?.metrics.activeProducts || 0} aktif`} />
          <StatsCard label="Pelanggan" value={metrics?.metrics.totalCustomers || 0} icon={Users} color="amber"
            sub={`+${metrics?.metrics.newCustomers || 0} baru`} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: '/dashboard/pos', icon: ShoppingCart, label: 'Buka POS', color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
          { href: '/dashboard/transactions', icon: Receipt, label: 'Transaksi', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
          { href: '/dashboard/reports', icon: TrendingUp, label: 'Laporan', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
          { href: '/dashboard/expenses', icon: Clock, label: 'Biaya', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 p-4 rounded-xl font-medium text-sm transition-all ${color}`}>
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </div>

      {/* Charts */}
      {!loading && metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-700">Tren Pendapatan</h3>
              <span className="text-xs text-gray-400">{PERIODS.find(p => p.key === period)?.label}</span>
            </div>
            <div className="card-body">
              {metrics.revenueChart.length > 0 ? (() => {
                const data = metrics.revenueChart;
                const W = 400, H = 130, PAD = 10;
                const maxVal = Math.max(...data.map(d => d.revenue), 1);
                const pts = data.map((d, i) => ({
                  x: PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2),
                  y: H - PAD - ((d.revenue / maxVal) * (H - PAD * 2)),
                  ...d,
                }));
                const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
                const areaD = `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`;
                const totalRev = data.reduce((s, d) => s + d.revenue, 0);
                const avgRev = totalRev / data.length;
                const maxRev = Math.max(...data.map(d => d.revenue));
                return (
                  <div>
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 130 }}>
                      <defs>
                        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={areaD} fill="url(#rg)" />
                      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {pts.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#6366f1">
                          <title>{format(new Date(p.date), 'dd MMM')}: {fmt(p.revenue)} ({p.transactions} tx)</title>
                        </circle>
                      ))}
                    </svg>
                    <div className="flex justify-between mt-1 overflow-hidden">
                      {pts.filter((_, i) => i === 0 || i === Math.floor(pts.length / 2) || i === pts.length - 1).map((p, i) => (
                        <span key={i} className="text-xs text-gray-400">{format(new Date(p.date), 'dd/MM')}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
                      {[['Total', fmt(totalRev)], ['Rata-rata/hari', fmt(avgRev)], ['Tertinggi', fmt(maxRev)]].map(([l, v]) => (
                        <div key={l} className="text-center">
                          <div className="text-xs text-gray-400">{l}</div>
                          <div className="text-sm font-bold text-gray-800 mt-0.5">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })() : <p className="text-sm text-gray-400 text-center py-8">Belum ada data pendapatan</p>}
            </div>
          </div>

          {/* Top Products */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-700">Produk Terlaris</h3>
              <Link href="/dashboard/reports/advanced" className="text-xs text-indigo-600 hover:underline">Lihat semua →</Link>
            </div>
            <div className="card-body space-y-3">
              {metrics.topProducts.length > 0 ? metrics.topProducts.slice(0, 5).map((p, i) => {
                const maxRev = Math.max(...metrics.topProducts.map(x => x.revenue), 1);
                const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500', 'bg-purple-500'];
                return (
                  <div key={p.productId}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full ${colors[i]} text-white text-xs flex items-center justify-center font-bold`}>{i + 1}</span>
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[140px]">{p.productName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{fmt(p.revenue)}</div>
                        <div className="text-xs text-gray-400">{p.quantitySold} terjual</div>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[i]} rounded-full transition-all duration-500`} style={{ width: `${(p.revenue / maxRev) * 100}%` }} />
                    </div>
                  </div>
                );
              }) : <p className="text-sm text-gray-400 text-center py-8">Belum ada data penjualan</p>}
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {!loading && metrics && metrics.lowStockAlerts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" /> Peringatan Stok Rendah
            </h3>
            <div className="flex items-center gap-2">
              <span className="badge badge-warning">{metrics.lowStockAlerts.length} item</span>
              <Link href="/dashboard/inventory" className="text-xs text-indigo-600 hover:underline">Kelola →</Link>
            </div>
          </div>
          <div className="table-container rounded-none rounded-b-xl border-0 border-t border-gray-100">
            <table className="table">
              <thead>
                <tr><th>Produk</th><th>SKU</th><th>Stok</th><th>Min</th><th>Status</th></tr>
              </thead>
              <tbody>
                {metrics.lowStockAlerts.slice(0, 5).map(item => (
                  <tr key={item.productId}>
                    <td className="font-medium">{item.productName}</td>
                    <td className="text-gray-500 font-mono text-xs">{item.sku}</td>
                    <td><span className="font-bold text-red-600">{item.currentStock}</span></td>
                    <td className="text-gray-500">{item.lowStockThreshold}</td>
                    <td><span className="badge badge-warning">Stok Rendah</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {!loading && metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-gray-500 mb-1">Nilai Inventori</div>
            <div className="text-xl font-bold text-gray-900">{fmt(metrics.metrics.totalInventoryValue)}</div>
            <div className="text-xs text-gray-400 mt-1">{metrics.metrics.totalProducts} produk total</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-gray-500 mb-1">Produk Stok Rendah</div>
            <div className={`text-xl font-bold ${metrics.metrics.lowStockProducts > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {metrics.metrics.lowStockProducts}
            </div>
            <div className="text-xs text-gray-400 mt-1">Perlu restock segera</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-gray-500 mb-1">Total Pelanggan</div>
            <div className="text-xl font-bold text-gray-900">{metrics.metrics.totalCustomers}</div>
            <div className="text-xs text-gray-400 mt-1">+{metrics.metrics.newCustomers} baru periode ini</div>
          </div>
        </div>
      )}
    </div>
  );
}

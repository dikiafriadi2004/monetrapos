'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Package, Users, Receipt, TrendingUp, ArrowUp, ArrowDown, ShoppingCart, DollarSign, AlertTriangle, RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { format } from 'date-fns';
import Link from 'next/link';
import { StatsCard, LoadingSpinner } from '@/components/ui';

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

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchMetrics(); }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<DashboardMetrics>('/reports/dashboard');
      setMetrics(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally { setLoading(false); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.firstName || 'User'}! 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Here's what's happening with your business today.</p>
        </div>
        <button onClick={fetchMetrics} className="btn btn-outline btn-sm" disabled={loading}>
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger"><AlertTriangle size={16} />{error}</div>
      )}

      {/* Stats */}
      {loading ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i)=><div key={i} className="stat-card animate-pulse"><div className="h-10 w-10 bg-gray-200 rounded-lg mb-3"/><div className="h-7 bg-gray-200 rounded w-1/2 mb-2"/><div className="h-4 bg-gray-100 rounded w-3/4"/></div>)}</div> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Revenue" value={fmt(metrics?.metrics.totalRevenue || 0)} icon={DollarSign} color="green" sub="All time" />
          <StatsCard label="Transactions" value={metrics?.metrics.totalTransactions || 0} icon={Receipt} color="indigo" sub="All time" />
          <StatsCard label="Products" value={metrics?.metrics.totalProducts || 0} icon={Package} color="blue" sub={`${metrics?.metrics.activeProducts || 0} active`} />
          <StatsCard label="Customers" value={metrics?.metrics.totalCustomers || 0} icon={Users} color="amber" sub={`+${metrics?.metrics.newCustomers || 0} new`} />
        </div>
      )}

      {/* Charts */}
      {!loading && metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-700">Revenue Trend (Last 7 Days)</h3>
            </div>
            <div className="card-body">
              {metrics.revenueChart.length > 0 ? (() => {
                const data = metrics.revenueChart.slice(-7);
                const W = 400, H = 120, PAD = 8;
                const maxVal = Math.max(...data.map(d => d.revenue), 1);
                const pts = data.map((d, i) => ({
                  x: PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2),
                  y: H - PAD - ((d.revenue / maxVal) * (H - PAD * 2)),
                  ...d,
                }));
                const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const areaD = `${pathD} L ${pts[pts.length-1].x} ${H} L ${pts[0].x} ${H} Z`;
                return (
                  <div>
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height:120}}>
                      <defs>
                        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25"/>
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path d={areaD} fill="url(#rg)"/>
                      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#6366f1"><title>{format(new Date(p.date),'dd MMM')}: {fmt(p.revenue)}</title></circle>)}
                    </svg>
                    <div className="flex justify-between mt-1">
                      {pts.map((p,i) => <span key={i} className="text-xs text-gray-400">{format(new Date(p.date),'dd/MM')}</span>)}
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
                      {[
                        ['Total', fmt(data.reduce((s,d)=>s+d.revenue,0))],
                        ['Avg/day', fmt(data.reduce((s,d)=>s+d.revenue,0)/data.length)],
                        ['Peak', fmt(maxVal)],
                      ].map(([l,v])=>(
                        <div key={l} className="text-center">
                          <div className="text-xs text-gray-400">{l}</div>
                          <div className="text-sm font-bold text-gray-800 mt-0.5">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })() : <p className="text-sm text-gray-400 text-center py-8">No revenue data yet</p>}
            </div>
          </div>

          {/* Top Products */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-700">Top Selling Products</h3>
            </div>
            <div className="card-body space-y-3">
              {metrics.topProducts.length > 0 ? metrics.topProducts.slice(0,5).map((p, i) => {
                const maxRev = Math.max(...metrics.topProducts.map(x=>x.revenue),1);
                const colors = ['bg-indigo-500','bg-emerald-500','bg-amber-500','bg-pink-500','bg-purple-500'];
                return (
                  <div key={p.productId}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full ${colors[i]} text-white text-xs flex items-center justify-center font-bold`}>{i+1}</span>
                        <span className="text-sm font-medium text-gray-800">{p.productName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{fmt(p.revenue)}</div>
                        <div className="text-xs text-gray-400">{p.quantitySold} sold</div>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[i]} rounded-full transition-all duration-500`} style={{width:`${(p.revenue/maxRev)*100}%`}}/>
                    </div>
                  </div>
                );
              }) : <p className="text-sm text-gray-400 text-center py-8">No sales data yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* Low Stock */}
      {!loading && metrics && metrics.lowStockAlerts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" /> Low Stock Alerts
            </h3>
            <span className="badge badge-warning">{metrics.lowStockAlerts.length} items</span>
          </div>
          <div className="table-container rounded-none rounded-b-xl border-0 border-t border-gray-100">
            <table className="table">
              <thead><tr><th>Product</th><th>SKU</th><th>Current Stock</th><th>Threshold</th><th>Status</th></tr></thead>
              <tbody>
                {metrics.lowStockAlerts.map(item => (
                  <tr key={item.productId}>
                    <td className="font-medium">{item.productName}</td>
                    <td className="text-gray-500 font-mono text-xs">{item.sku}</td>
                    <td><span className="font-bold text-red-600">{item.currentStock}</span></td>
                    <td className="text-gray-500">{item.lowStockThreshold}</td>
                    <td><span className="badge badge-warning">Low Stock</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

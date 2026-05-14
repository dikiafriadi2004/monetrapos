"use client";

import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, RefreshCcw, Download } from 'lucide-react';
import { api } from '../../../lib/api';

interface RevenueData {
  date: string;
  amount: number;
  transactions: number;
}

export default function RevenueReportsPage() {
  const [revenue, setRevenue] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, count: 0 });

  useEffect(() => { fetchRevenue(); }, [period]);

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const [revData, statsData] = await Promise.allSettled([
        api.get(`/admin/dashboard/revenue?period=${period}`),
        api.get('/admin/dashboard/stats'),
      ]);
      if (revData.status === 'fulfilled') setRevenue(Array.isArray(revData.value) ? revData.value as RevenueData[] : []);
      if (statsData.status === 'fulfilled') {
        const d = statsData.value as any;
        setSummary({
          total: d?.totalRevenue || 0,
          paid: d?.paidTransactions || 0,
          pending: d?.totalTransactions - d?.paidTransactions || 0,
          count: d?.totalTransactions || 0,
        });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }); } catch { return d; } };

  const totalPeriod = revenue.reduce((s, d) => s + d.amount, 0);
  const totalTx = revenue.reduce((s, d) => s + d.transactions, 0);

  const handleExport = () => {
    if (!revenue.length) return;
    const csv = ['Tanggal,Revenue,Transaksi', ...revenue.map(r => `${r.date},${r.amount},${r.transactions}`)].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `revenue-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Revenue Reports</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Laporan pendapatan platform dari subscription member.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-tertiary)', padding: 4, borderRadius: 'var(--radius-md)' }}>
            {(['week', 'month', 'year'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`btn ${period === p ? 'btn-primary' : ''}`}
                style={{ height: 32, padding: '0 12px', fontSize: '0.8rem', textTransform: 'capitalize', background: period === p ? undefined : 'transparent', border: 'none' }}>
                {p === 'week' ? 'Minggu' : p === 'month' ? 'Bulan' : 'Tahun'}
              </button>
            ))}
          </div>
          <button onClick={handleExport} className="btn btn-outline btn-sm"><Download size={14} /> Export CSV</button>
          <button onClick={fetchRevenue} className="btn btn-outline btn-sm"><RefreshCcw size={14} /></button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {[
          { label: 'Total Revenue (All Time)', value: fmt(summary.total), icon: DollarSign, color: 'var(--success)' },
          { label: `Revenue (${period === 'week' ? 'Minggu' : period === 'month' ? 'Bulan' : 'Tahun'} Ini)`, value: fmt(totalPeriod), icon: TrendingUp, color: 'var(--accent-base)' },
          { label: 'Invoice Lunas', value: summary.paid, icon: DollarSign, color: '#10b981' },
          { label: 'Transaksi Periode', value: totalTx, icon: TrendingUp, color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: `${s.color}20`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <s.icon size={16} />
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {!loading && revenue.length > 0 && (
        <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Grafik Revenue</h3>
          {(() => {
            const W = 800, H = 200, PAD = 20;
            const maxVal = Math.max(...revenue.map(d => d.amount), 1);
            const pts = revenue.map((d, i) => ({
              x: PAD + (i / (revenue.length - 1 || 1)) * (W - PAD * 2),
              y: H - PAD - ((d.amount / maxVal) * (H - PAD * 2)),
              ...d,
            }));
            const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            const areaD = `${pathD} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;
            return (
              <div>
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 200 }}>
                  <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" /><stop offset="100%" stopColor="#6366f1" stopOpacity="0" /></linearGradient></defs>
                  <path d={areaD} fill="url(#rg)" />
                  <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {pts.filter((_, i) => i % Math.ceil(pts.length / 10) === 0).map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="4" fill="#6366f1" />
                      <text x={p.x} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--text-tertiary)">{fmtDate(p.date)}</text>
                    </g>
                  ))}
                </svg>
              </div>
            );
          })()}
        </div>
      )}

      {/* Table */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600 }}>
          Detail Revenue per Periode
        </div>
        {loading ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Tanggal', 'Revenue', 'Transaksi', 'Rata-rata'].map(h => (
                <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {revenue.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>{fmtDate(r.date)}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--success)' }}>{fmt(r.amount)}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{r.transactions}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{r.transactions > 0 ? fmt(Math.round(r.amount / r.transactions)) : '—'}</td>
                </tr>
              ))}
              {revenue.length > 0 && (
                <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}>
                  <td style={{ padding: '10px 16px' }}>TOTAL</td>
                  <td style={{ padding: '10px 16px', color: 'var(--success)' }}>{fmt(totalPeriod)}</td>
                  <td style={{ padding: '10px 16px' }}>{totalTx}</td>
                  <td style={{ padding: '10px 16px' }}>{totalTx > 0 ? fmt(Math.round(totalPeriod / totalTx)) : '—'}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

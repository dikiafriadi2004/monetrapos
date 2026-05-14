'use client';

import { useState } from 'react';
import { advancedReportsService } from '@/services/advanced-reports.service';
import { BarChart3, Users, TrendingUp, Loader2, RefreshCcw, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatRupiah } from '@/lib/date';
import AddOnGate from '@/components/AddOnGate';
import { ADD_ON_SLUGS } from '@/hooks/useAddOns';

const TABS = [
  { key: 'employee', label: 'Employee Performance', icon: Users },
  { key: 'customer', label: 'Customer Analytics', icon: BarChart3 },
  { key: 'profit', label: 'Profit & Loss', icon: TrendingUp },
] as const;

const fmt = (n: number) => `Rp ${formatRupiah(n || 0)}`;
const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;

export default function AdvancedReportsPage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'employee' | 'customer' | 'profit'>('employee');

  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [employeeData, setEmployeeData] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<any>(null);
  const [profitData, setProfitData] = useState<any>(null);

  const generate = async () => {
    setLoading(true);
    try {
      if (activeTab === 'employee') {
        const data = await advancedReportsService.getEmployeePerformance(dateRange);
        setEmployeeData(Array.isArray(data) ? data : []);
      } else if (activeTab === 'customer') {
        const data = await advancedReportsService.getCustomerAnalytics(dateRange);
        setCustomerData(data);
      } else {
        const data = await advancedReportsService.getProfitLoss(dateRange);
        setProfitData(data);
      }
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    const token = localStorage.getItem('access_token') || '';
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';
    const endpointMap: Record<string, string> = {
      employee: 'employee-performance/export-csv',
      customer: 'customers/export-csv',
      profit: 'profit-loss/export-csv',
    };
    const filenameMap: Record<string, string> = {
      employee: 'employee-performance',
      customer: 'customer-report',
      profit: 'profit-loss',
    };
    const url = `${apiBase}/reports/advanced/${endpointMap[activeTab]}?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { toast.error('Gagal export CSV'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${filenameMap[activeTab]}-${dateRange.startDate}-${dateRange.endDate}.csv`;
      a.click();
      toast.success('CSV berhasil diunduh');
    } catch { toast.error('Gagal export CSV'); }
  };

  const hasData = (activeTab === 'employee' && employeeData.length > 0) ||
    (activeTab === 'customer' && customerData) ||
    (activeTab === 'profit' && profitData);

  return (
    <AddOnGate
      slug={ADD_ON_SLUGS.ADVANCED_REPORTS}
      featureName="Advanced Reporting & Analytics"
      description="Dapatkan laporan mendalam tentang performa karyawan, analitik pelanggan, dan laporan laba rugi dengan add-on Advanced Reporting."
    >
    <div>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Advanced Reports</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Detailed analytics and business insights</p>
      </div>

      {/* Tabs */}
      <div className="glass-panel" style={{ padding: 0, marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              flex: 1, padding: 'var(--space-md)', background: activeTab === key ? 'rgba(99,102,241,0.1)' : 'transparent',
              border: 'none', borderBottom: activeTab === key ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === key ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Start Date</label>
            <input type="date" className="form-input" value={dateRange.startDate} onChange={e => setDateRange(p => ({ ...p, startDate: e.target.value }))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">End Date</label>
            <input type="date" className="form-input" value={dateRange.endDate} onChange={e => setDateRange(p => ({ ...p, endDate: e.target.value }))} />
          </div>
          <button onClick={generate} disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCcw size={16} />}
            Generate
          </button>
          {hasData && (
            <button onClick={handleExportCsv} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Download size={16} /> Export CSV
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: 'var(--space-lg)' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
              <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
            </div>
          ) : (
            <>
              {activeTab === 'employee' && <EmployeeTab data={employeeData} />}
              {activeTab === 'customer' && <CustomerTab data={customerData} />}
              {activeTab === 'profit' && <ProfitTab data={profitData} />}
            </>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
    </AddOnGate>
  );
}

function EmployeeTab({ data }: { data: any[] }) {
  if (!data.length) return <EmptyState icon={Users} message="Click Generate to load employee performance data." />;

  const totalSales = data.reduce((s, e) => s + (e.totalSales || 0), 0);
  const totalTx = data.reduce((s, e) => s + (e.totalTransactions || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-md)' }}>
        {[
          ['Total Karyawan', data.length, 'var(--primary)'],
          ['Total Penjualan', fmt(totalSales), 'var(--success)'],
          ['Total Transaksi', totalTx, '#3b82f6'],
        ].map(([label, value, color]: any) => (
          <div key={label} className="glass-panel" style={{ padding: 'var(--space-md)', borderLeft: `3px solid ${color}` }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['#', 'Karyawan', 'Total Penjualan', 'Transaksi', 'Rata-rata Transaksi', 'Jam Kerja', 'Penjualan/Jam'].map(h => (
                <th key={h} style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: h === 'Karyawan' || h === '#' ? 'left' : 'right', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((e, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: 'var(--space-md)', color: 'var(--text-tertiary)', width: 32 }}>{i + 1}</td>
                <td style={{ padding: 'var(--space-md)', fontWeight: 600 }}>
                  {e.employeeName}
                  {e.employeeNumber && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{e.employeeNumber}</div>}
                </td>
                <td style={{ padding: 'var(--space-md)', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>{fmt(e.totalSales)}</td>
                <td style={{ padding: 'var(--space-md)', textAlign: 'right' }}>{e.totalTransactions}</td>
                <td style={{ padding: 'var(--space-md)', textAlign: 'right' }}>{fmt(e.averageTransactionValue)}</td>
                <td style={{ padding: 'var(--space-md)', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {(e.totalWorkHours || 0) > 0 ? `${(e.totalWorkHours).toFixed(1)}h` : '—'}
                </td>
                <td style={{ padding: 'var(--space-md)', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {(e.salesPerHour || 0) > 0 ? fmt(e.salesPerHour) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomerTab({ data }: { data: any }) {
  if (!data) return <EmptyState icon={BarChart3} message="Click Generate to load customer analytics." />;
  const tierEntries = data.customersByTier
    ? (Array.isArray(data.customersByTier)
        ? data.customersByTier
        : Object.entries(data.customersByTier).map(([tier, count]) => ({ tier, count })))
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
        {[
          ['Total Customers', data.totalCustomers, 'var(--primary)'],
          ['New Customers', data.newCustomers, 'var(--success)'],
          ['Returning', data.returningCustomers, '#3b82f6'],
          ['Retention Rate', fmtPct(data.retentionRate), '#f59e0b'],
          ['Avg Lifetime Value', fmt(data.averageLifetimeValue || 0), '#8b5cf6'],
        ].map(([label, value, color]: any) => (
          <div key={label} className="glass-panel" style={{ padding: 'var(--space-lg)', borderLeft: `3px solid ${color}` }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {tierEntries.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 'var(--space-sm)' }}>By Tier</div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            {tierEntries.map((t: any) => (
              <span key={t.tier} style={{ padding: '4px 12px', borderRadius: 10, background: 'var(--bg-tertiary)', fontSize: '0.85rem' }}>
                {t.tier}: <strong>{t.count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {data.topCustomers?.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Top Customers</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Customer', 'Total Spent', 'Orders'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: h === 'Customer' ? 'left' : 'right', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((c: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', fontWeight: 600 }}>{c.customerName}</td>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'right', color: 'var(--success)' }}>{fmt(c.totalSpent)}</td>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'right' }}>{c.totalOrders || c.visitCount || '-'}</td>
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

function ProfitTab({ data }: { data: any }) {
  if (!data) return <EmptyState icon={TrendingUp} message="Click Generate to load profit & loss data." />;

  // Support both normalized (frontend) and raw (backend) shape
  const revenue = data.revenue?.totalSales ?? data.revenue ?? 0;
  const cogs = data.costs?.costOfGoodsSold ?? data.cogs ?? 0;
  const grossProfit = data.profit?.grossProfit ?? data.grossProfit ?? (revenue - cogs);
  const expenses = data.costs?.operatingExpenses ?? data.expenses ?? 0;
  const netProfit = data.profit?.netProfit ?? data.netProfit ?? (grossProfit - expenses);
  const profitMargin = data.profit?.netProfitMargin ?? data.profitMargin ?? (revenue > 0 ? (netProfit / revenue) * 100 : 0);
  const grossMargin = data.profit?.grossProfitMargin ?? (revenue > 0 ? (grossProfit / revenue) * 100 : 0);
  const totalTransactions = data.revenue?.totalTransactions ?? 0;
  const avgTransaction = data.revenue?.averageTransactionValue ?? 0;

  const rows = [
    ['Total Penjualan', revenue, 'var(--success)', true],
    ['Harga Pokok Penjualan (HPP)', -cogs, 'var(--danger)', false],
    ['Laba Kotor', grossProfit, grossProfit >= 0 ? 'var(--success)' : 'var(--danger)', true],
    ['Biaya Operasional', -expenses, 'var(--danger)', false],
    ['Laba Bersih', netProfit, netProfit >= 0 ? 'var(--success)' : 'var(--danger)', true],
  ];

  const salesByStore = data.breakdown?.salesByStore || [];
  const salesByCategory = data.breakdown?.salesByCategory?.slice(0, 10) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-md)' }}>
        {[
          ['Transaksi', totalTransactions, 'var(--primary)'],
          ['Rata-rata Transaksi', fmt(avgTransaction), '#3b82f6'],
          ['Margin Kotor', fmtPct(grossMargin), '#f59e0b'],
          ['Margin Bersih', fmtPct(profitMargin), netProfit >= 0 ? 'var(--success)' : 'var(--danger)'],
        ].map(([label, value, color]: any) => (
          <div key={label} className="glass-panel" style={{ padding: 'var(--space-md)', borderLeft: `3px solid ${color}` }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* P&L Statement */}
      <div style={{ maxWidth: 500 }}>
        <div style={{ fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Laporan Laba Rugi</div>
        <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
          {rows.map(([label, value, color, bold]: any, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-sm) 0', borderBottom: bold ? '1px solid var(--border-subtle)' : 'none', marginBottom: bold ? 'var(--space-sm)' : 0 }}>
              <span style={{ fontWeight: bold ? 700 : 400, color: bold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontWeight: bold ? 700 : 500, color }}>{fmt(Math.abs(value))}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sales by Store */}
      {salesByStore.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Penjualan per Toko</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Toko', 'Penjualan', 'Transaksi'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: h === 'Toko' ? 'left' : 'right', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesByStore.map((s: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', fontWeight: 600 }}>{s.storeName}</td>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'right', color: 'var(--success)' }}>{fmt(s.revenue)}</td>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'right' }}>{s.transactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales by Product */}
      {salesByCategory.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Top Produk</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Produk', 'Penjualan', 'HPP', 'Laba', 'Margin'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: h === 'Produk' ? 'left' : 'right', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesByCategory.map((c: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', fontWeight: 500 }}>{c.category}</td>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'right' }}>{fmt(c.revenue)}</td>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(c.cost)}</td>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'right', color: c.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(c.profit)}</td>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'right', color: 'var(--text-secondary)' }}>{fmtPct(c.margin)}</td>
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

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-tertiary)' }}>
      <Icon size={48} style={{ margin: '0 auto var(--space-md)' }} />
      <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
    </div>
  );
}

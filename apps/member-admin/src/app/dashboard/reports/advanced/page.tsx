'use client';

import { useState } from 'react';
import { advancedReportsService } from '@/services/advanced-reports.service';
import { BarChart3, Users, TrendingUp, Loader2, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'employee', label: 'Employee Performance', icon: Users },
  { key: 'customer', label: 'Customer Analytics', icon: BarChart3 },
  { key: 'profit', label: 'Profit & Loss', icon: TrendingUp },
] as const;

const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
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

  return (
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
  );
}

function EmployeeTab({ data }: { data: any[] }) {
  if (!data.length) return <EmptyState icon={Users} message="Click Generate to load employee performance data." />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {['Employee', 'Total Sales', 'Transactions', 'Avg Transaction', 'Work Hours', 'Sales/Hour'].map(h => (
              <th key={h} style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: h === 'Employee' ? 'left' : 'right', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((e, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: 'var(--space-md)', fontWeight: 600 }}>{e.employeeName}</td>
              <td style={{ padding: 'var(--space-md)', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>{fmt(e.totalSales)}</td>
              <td style={{ padding: 'var(--space-md)', textAlign: 'right' }}>{e.totalTransactions}</td>
              <td style={{ padding: 'var(--space-md)', textAlign: 'right' }}>{fmt(e.averageTransactionValue)}</td>
              <td style={{ padding: 'var(--space-md)', textAlign: 'right', color: 'var(--text-secondary)' }}>{(e.totalWorkHours || 0).toFixed(1)}h</td>
              <td style={{ padding: 'var(--space-md)', textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(e.salesPerHour || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const rows = [
    ['Revenue', data.revenue, 'var(--success)', true],
    ['Cost of Goods Sold', -(data.cogs || 0), 'var(--danger)', false],
    ['Gross Profit', data.grossProfit, data.grossProfit >= 0 ? 'var(--success)' : 'var(--danger)', true],
    ['Operating Expenses', -(data.expenses || 0), 'var(--danger)', false],
    ['Net Profit', data.netProfit, data.netProfit >= 0 ? 'var(--success)' : 'var(--danger)', true],
  ];
  return (
    <div style={{ maxWidth: 500 }}>
      <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
        {rows.map(([label, value, color, bold]: any, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-sm) 0', borderBottom: bold ? '1px solid var(--border-subtle)' : 'none', marginBottom: bold ? 'var(--space-sm)' : 0 }}>
            <span style={{ fontWeight: bold ? 700 : 400, color: bold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontWeight: bold ? 700 : 500, color }}>{fmt(Math.abs(value))}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)', fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
          <span>Profit Margin</span>
          <span style={{ fontWeight: 600 }}>{fmtPct(data.profitMargin)}</span>
        </div>
      </div>
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

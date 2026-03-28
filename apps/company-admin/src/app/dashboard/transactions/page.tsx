"use client";

import { useState, useEffect } from 'react';
import { Receipt, TrendingUp, CreditCard, ShoppingBag, Search, Filter, Calendar, ChevronDown, Eye, Download } from 'lucide-react';
import { api } from '../../../lib/api';

interface Transaction {
  id: string;
  orderNumber?: string;
  totalAmount: number;
  paymentMethod?: string;
  status: string;
  store?: { name: string; member?: { name: string } };
  items?: any[];
  createdAt: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);

  const fetchTransactions = async () => {
    try {
      const data: any = await api.get('/transactions');
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const formatCurrency = (amount: number) => `Rp ${(amount || 0).toLocaleString('id-ID')}`;
  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return dateStr; }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = !searchQuery ||
      tx.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.store?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.store?.member?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || tx.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalRevenue: transactions.reduce((s, t) => s + (t.totalAmount || 0), 0),
    totalCount: transactions.length,
    completed: transactions.filter(t => t.status === 'completed' || t.status === 'paid').length,
    avgOrder: transactions.length > 0 ? Math.round(transactions.reduce((s, t) => s + (t.totalAmount || 0), 0) / transactions.length) : 0,
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed': case 'paid': return <span className="badge badge-success">Completed</span>;
      case 'pending': return <span className="badge badge-warning">Pending</span>;
      case 'cancelled': case 'voided': return <span className="badge badge-danger">Cancelled</span>;
      case 'refunded': return <span className="badge badge-danger">Refunded</span>;
      default: return <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{status}</span>;
    }
  };

  const paymentBadge = (method: string | undefined) => {
    if (!method) return <span style={{ color: 'var(--text-tertiary)' }}>—</span>;
    const colors: Record<string, string> = { cash: 'var(--success)', qris: 'var(--accent-base)', transfer: 'var(--warning)', edc: '#ec4899' };
    const color = colors[method.toLowerCase()] || 'var(--text-secondary)';
    return <span className="badge" style={{ background: `${color}15`, color, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>{method}</span>;
  };

  const statCards = [
    { name: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: 'var(--success)', badge: 'All Time' },
    { name: 'Total Transactions', value: stats.totalCount, icon: Receipt, color: 'var(--accent-base)', badge: `${stats.completed} Completed` },
    { name: 'Avg. Order Value', value: formatCurrency(stats.avgOrder), icon: ShoppingBag, color: 'var(--warning)', badge: 'Per Transaction' },
    { name: 'Success Rate', value: stats.totalCount > 0 ? `${Math.round((stats.completed / stats.totalCount) * 100)}%` : '0%', icon: CreditCard, color: '#ec4899', badge: 'Completed/Total' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Transaction Monitoring</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Overview of all member transactions across the platform.</p>
        </div>
        <button className="btn btn-outline">
          <Download size={16} /> Export Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid-cols-4" style={{ marginBottom: 'var(--space-xl)' }}>
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass-panel" style={{ padding: 'var(--space-lg)', position: 'relative', overflow: 'hidden' }}>
              <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: `${stat.color}20`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} />
                </div>
                <span className="badge" style={{ background: `${stat.color}15`, color: stat.color, fontSize: '0.7rem' }}>{stat.badge}</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }}>{stat.value}</h3>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{stat.name}</p>
              <div style={{ position: 'absolute', right: '-10%', bottom: '-10%', width: '80px', height: '80px', background: stat.color, filter: 'blur(50px)', opacity: 0.08, zIndex: -1 }} />
            </div>
          );
        })}
      </div>

      {/* Transaction Table */}
      <div className="glass-panel" style={{ padding: 0 }}>
        {/* Toolbar */}
        <div className="flex-between" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search order, store, or member..."
              className="form-input"
              style={{ paddingLeft: '36px', height: '36px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {['all', 'completed', 'pending', 'cancelled'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s === 'completed' ? 'completed' : s)}
                className={`btn ${filterStatus === s ? 'btn-primary' : 'btn-outline'}`}
                style={{ height: '36px', padding: '0 12px', fontSize: '0.8rem', textTransform: 'capitalize' }}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex-center" style={{ height: '300px', flexDirection: 'column' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
              <Receipt size={32} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-sm)' }}>No transactions found</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', textAlign: 'center' }}>
              {searchQuery || filterStatus !== 'all' ? 'Try adjusting your search or filters.' : 'Transaction data will appear here once members start processing orders.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <div style={{ flex: 1 }}>Order</div>
              <div style={{ flex: 1.5 }}>Store / Member</div>
              <div style={{ flex: 1 }}>Amount</div>
              <div style={{ flex: 0.8 }}>Payment</div>
              <div style={{ flex: 0.8 }}>Status</div>
              <div style={{ flex: 1 }}>Date</div>
              <div style={{ width: '50px' }}></div>
            </div>

            {filteredTransactions.map(tx => (
              <div key={tx.id} className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', transition: 'background var(--transition-fast)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', fontFamily: 'monospace', color: 'var(--accent-base)' }}>
                    #{tx.orderNumber || tx.id?.slice(0, 8)}
                  </div>
                </div>
                <div style={{ flex: 1.5 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{tx.store?.name || '—'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{tx.store?.member?.name || ''}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(tx.totalAmount)}</div>
                </div>
                <div style={{ flex: 0.8 }}>{paymentBadge(tx.paymentMethod)}</div>
                <div style={{ flex: 0.8 }}>{statusBadge(tx.status)}</div>
                <div style={{ flex: 1, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                  {formatDate(tx.createdAt)}
                </div>
                <div style={{ width: '50px' }}>
                  <button onClick={() => setDetailTx(tx)} className="btn btn-outline" style={{ padding: '6px' }} title="View detail">
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailTx && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setDetailTx(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: '550px', maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Transaction Detail</h3>
              <button onClick={() => setDetailTx(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="flex-between">
                <span style={{ color: 'var(--text-tertiary)' }}>Order ID</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>#{detailTx.orderNumber || detailTx.id?.slice(0, 12)}</span>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-tertiary)' }}>Store</span>
                <span>{detailTx.store?.name || '—'}</span>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-tertiary)' }}>Member</span>
                <span>{detailTx.store?.member?.name || '—'}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-md)' }} className="flex-between">
                <span style={{ color: 'var(--text-tertiary)' }}>Total Amount</span>
                <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1.25rem' }}>{formatCurrency(detailTx.totalAmount)}</span>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-tertiary)' }}>Payment</span>
                {paymentBadge(detailTx.paymentMethod)}
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-tertiary)' }}>Status</span>
                {statusBadge(detailTx.status)}
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-tertiary)' }}>Date</span>
                <span>{formatDate(detailTx.createdAt)}</span>
              </div>

              {detailTx.items && detailTx.items.length > 0 && (
                <div style={{ marginTop: 'var(--space-sm)' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-sm)', color: 'var(--text-secondary)' }}>Items</h4>
                  {detailTx.items.map((item: any, i: number) => (
                    <div key={i} className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                      <span>{item.product?.name || item.name || 'Item'} × {item.quantity || 1}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{formatCurrency(item.subtotal || item.price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 'var(--space-xl)', textAlign: 'right' }}>
              <button onClick={() => setDetailTx(null)} className="btn btn-outline">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

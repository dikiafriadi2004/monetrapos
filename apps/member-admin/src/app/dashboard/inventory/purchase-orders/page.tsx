'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { purchaseOrdersService, PurchaseOrder, PurchaseOrderStatus } from '@/services/purchase-orders.service';
import { ShoppingCart, Plus, Search, Eye, Edit2, Trash2, CheckCircle, XCircle, Clock, Package, Loader2, Building2, Store, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui';

const STATUS_CONFIG: Record<string, { color: string; icon: any }> = {
  [PurchaseOrderStatus.DRAFT]: { color: '#6b7280', icon: FileText },
  [PurchaseOrderStatus.SENT]: { color: '#3b82f6', icon: Clock },
  [PurchaseOrderStatus.RECEIVED]: { color: 'var(--success)', icon: CheckCircle },
  [PurchaseOrderStatus.CANCELLED]: { color: 'var(--danger)', icon: XCircle },
};

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');
  const [actionConfirm, setActionConfirm] = useState<{ open: boolean; type: 'delete' | 'cancel'; order: PurchaseOrder | null }>({ open: false, type: 'delete', order: null });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await purchaseOrdersService.getAll({ status: statusFilter !== 'all' ? statusFilter : undefined });
      setOrders(res.data);
    } catch { toast.error('Failed to load purchase orders'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (o: PurchaseOrder) => {
    setActionConfirm({ open: true, type: 'delete', order: o });
  };

  const handleCancel = async (o: PurchaseOrder) => {
    setActionConfirm({ open: true, type: 'cancel', order: o });
  };

  const confirmAction = async () => {
    if (!actionConfirm.order) return;
    setActionLoading(true);
    try {
      if (actionConfirm.type === 'delete') {
        await purchaseOrdersService.delete(actionConfirm.order.id);
        toast.success('Deleted');
      } else {
        await purchaseOrdersService.cancel(actionConfirm.order.id);
        toast.success('Cancelled');
      }
      setActionConfirm({ open: false, type: 'delete', order: null });
      load();
    } catch { toast.error(actionConfirm.type === 'delete' ? 'Failed to delete' : 'Failed to cancel'); }
    finally { setActionLoading(false); }
  };

  const filtered = orders.filter(o =>
    o.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Purchase Orders</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage purchase orders from suppliers</p>
        </div>
        <button onClick={() => router.push('/dashboard/inventory/purchase-orders/new')} className="btn btn-primary">
          <Plus size={16} /> Create PO
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        {Object.values(PurchaseOrderStatus).map(status => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          const count = orders.filter(o => o.status === status).length;
          const total = orders.filter(o => o.status === status).reduce((s, o) => s + o.total, 0);
          return (
            <div key={status} className="glass-panel" style={{ padding: 'var(--space-md)', borderLeft: `3px solid ${cfg.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Icon size={14} style={{ color: cfg.color }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', color: cfg.color }}>{status}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{count}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{fmt(total)}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by PO number or supplier..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', ...Object.values(PurchaseOrderStatus)].map(s => (
            <button key={s} onClick={() => setStatusFilter(s as any)} className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`} style={{ height: 36, padding: '0 12px', fontSize: '0.8rem' }}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <ShoppingCart size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>{searchTerm ? 'No orders match your search' : 'No purchase orders yet'}</p>
          {!searchTerm && <button onClick={() => router.push('/dashboard/inventory/purchase-orders/new')} className="btn btn-primary"><Plus size={16} /> Create PO</button>}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['PO Number', 'Supplier', 'Store', 'Order Date', 'Expected', 'Total', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-sm) var(--space-lg)', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => {
                  const cfg = STATUS_CONFIG[o.status];
                  const Icon = cfg.icon;
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Package size={14} style={{ color: 'var(--text-tertiary)' }} />
                          <span style={{ fontWeight: 600 }}>{o.poNumber}</span>
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
                          <Building2 size={14} style={{ color: 'var(--text-tertiary)' }} />{o.supplierName}
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Store size={14} style={{ color: 'var(--text-tertiary)' }} />{o.storeName}
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(o.orderDate)}</td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{o.expectedDate ? fmtDate(o.expectedDate) : '-'}</td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', fontWeight: 600 }}>{fmt(o.total)}</td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600, background: `${cfg.color}20`, color: cfg.color }}>
                          <Icon size={11} /> {o.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => router.push(`/dashboard/inventory/purchase-orders/${o.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 4 }} title="View"><Eye size={15} /></button>
                          {o.status === PurchaseOrderStatus.DRAFT && (
                            <>
                              <button onClick={() => router.push(`/dashboard/inventory/purchase-orders/${o.id}/edit`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 4 }} title="Edit"><Edit2 size={15} /></button>
                              <button onClick={() => handleDelete(o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }} title="Delete"><Trash2 size={15} /></button>
                            </>
                          )}
                          {o.status === PurchaseOrderStatus.SENT && (
                            <button onClick={() => handleCancel(o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }} title="Cancel"><XCircle size={15} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
      <ConfirmModal
        open={actionConfirm.open}
        title={actionConfirm.type === 'delete' ? 'Hapus Purchase Order' : 'Batalkan Purchase Order'}
        description={actionConfirm.type === 'delete'
          ? `Hapus PO "${actionConfirm.order?.poNumber}"? Tindakan ini tidak dapat dibatalkan.`
          : `Batalkan PO "${actionConfirm.order?.poNumber}"? Tindakan ini tidak dapat dibatalkan.`
        }
        confirmLabel={actionConfirm.type === 'delete' ? 'Ya, Hapus' : 'Ya, Batalkan'}
        variant="danger"
        loading={actionLoading}
        onConfirm={confirmAction}
        onClose={() => setActionConfirm({ open: false, type: 'delete', order: null })}
      />
    </div>
  );
}

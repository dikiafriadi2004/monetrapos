'use client';

import { useState, useEffect } from 'react';
import { stockOpnameService, StockOpname, StockOpnameStatus, CreateStockOpnameDto } from '@/services/stock-opname.service';
import { ClipboardList, Plus, Search, Eye, CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui';

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280', in_progress: '#3b82f6', completed: '#10b981', cancelled: '#ef4444',
};

export default function StockOpnamePage() {
  const [opnames, setOpnames] = useState<StockOpname[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockOpnameStatus | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<StockOpname | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{ open: boolean; type: 'complete' | 'cancel'; opname: StockOpname | null }>({ open: false, type: 'complete', opname: null });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await stockOpnameService.getAll({ status: statusFilter || undefined });
      setOpnames(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load stock opnames'); }
    finally { setLoading(false); }
  };

  const handleComplete = async (opname: StockOpname) => {
    setActionConfirm({ open: true, type: 'complete', opname });
  };

  const handleCancel = async (opname: StockOpname) => {
    setActionConfirm({ open: true, type: 'cancel', opname });
  };

  const confirmAction = async () => {
    if (!actionConfirm.opname) return;
    setActionLoading(true);
    try {
      if (actionConfirm.type === 'complete') {
        await stockOpnameService.complete(actionConfirm.opname.id, true);
        toast.success('Stock opname completed');
      } else {
        await stockOpnameService.cancel(actionConfirm.opname.id);
        toast.success('Cancelled');
      }
      setActionConfirm({ open: false, type: 'complete', opname: null });
      await load();
    } catch { toast.error(actionConfirm.type === 'complete' ? 'Failed to complete' : 'Failed to cancel'); }
    finally { setActionLoading(false); }
  };

  const filtered = opnames.filter(o =>
    o.opnameNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.storeName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Stock Opname</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Physical inventory count and adjustments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={16} /> New Stock Opname
        </button>
      </div>

      <div className="glass-panel" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by number or store..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="">All Status</option>
          {Object.values(StockOpnameStatus).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <ClipboardList size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>No stock opnames found</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={16} /> New Stock Opname</button>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Number', 'Date', 'Store', 'Items', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-sm) var(--space-lg)', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(opname => {
                  const color = STATUS_COLORS[opname.status] || '#6b7280';
                  return (
                    <tr key={opname.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', fontWeight: 600 }}>{opname.opnameNumber}</td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {new Date(opname.opnameDate).toLocaleDateString('id-ID')}
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)' }}>{opname.storeName || '-'}</td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)' }}>{opname.items?.length || 0}</td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600, background: `${color}20`, color, textTransform: 'capitalize' }}>
                          {opname.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setSelected(opname)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }} title="View"><Eye size={16} /></button>
                          {opname.status === StockOpnameStatus.IN_PROGRESS && (
                            <button onClick={() => handleComplete(opname)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)' }} title="Complete"><CheckCircle size={16} /></button>
                          )}
                          {(opname.status === StockOpnameStatus.DRAFT || opname.status === StockOpnameStatus.IN_PROGRESS) && (
                            <button onClick={() => handleCancel(opname)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }} title="Cancel"><XCircle size={16} /></button>
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

      {showModal && <CreateModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); load(); }} />}
      {selected && <DetailsModal opname={selected} onClose={() => setSelected(null)} />}
      <ConfirmModal
        open={actionConfirm.open}
        title={actionConfirm.type === 'complete' ? 'Selesaikan Stock Opname' : 'Batalkan Stock Opname'}
        description={actionConfirm.type === 'complete'
          ? `Selesaikan stock opname "${actionConfirm.opname?.opnameNumber}" dan terapkan penyesuaian stok? Tindakan ini tidak dapat dibatalkan.`
          : `Batalkan stock opname "${actionConfirm.opname?.opnameNumber}"? Tindakan ini tidak dapat dibatalkan.`
        }
        confirmLabel={actionConfirm.type === 'complete' ? 'Ya, Selesaikan' : 'Ya, Batalkan'}
        variant={actionConfirm.type === 'complete' ? 'warning' : 'danger'}
        loading={actionLoading}
        onConfirm={confirmAction}
        onClose={() => setActionConfirm({ open: false, type: 'complete', opname: null })}
      />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

function CreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ storeId: '', opnameDate: new Date().toISOString().split('T')[0], notes: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeId) { toast.error('Store ID is required'); return; }
    setLoading(true);
    try {
      await stockOpnameService.create({ ...form, items: [] } as CreateStockOpnameDto);
      toast.success('Stock opname created');
      onSuccess();
    } catch { toast.error('Failed to create stock opname'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 440, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '1.1rem' }}>New Stock Opname</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Store ID *</label>
            <input className="form-input" value={form.storeId} onChange={e => setForm(p => ({ ...p, storeId: e.target.value }))} placeholder="Enter store ID" required />
          </div>
          <div className="form-group">
            <label className="form-label">Opname Date *</label>
            <input type="date" className="form-input" value={form.opnameDate} onChange={e => setForm(p => ({ ...p, opnameDate: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailsModal({ opname, onClose }: { opname: StockOpname; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 700, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', padding: 'var(--space-xl)', zIndex: 101 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Stock Opname — {opname.opnameNumber}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          {[['Date', new Date(opname.opnameDate).toLocaleDateString('id-ID')], ['Store', opname.storeName || '-'], ['Status', opname.status.replace('_', ' ')], ['Items', String(opname.items?.length || 0)]].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
              <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{v}</div>
            </div>
          ))}
        </div>
        {opname.notes && <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>📝 {opname.notes}</p>}
        {opname.items && opname.items.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Product', 'System', 'Physical', 'Difference'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: h === 'Product' ? 'left' : 'right', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {opname.items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', fontSize: '0.9rem' }}>{item.productName || item.productId}</td>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'right', fontSize: '0.9rem' }}>{item.systemQuantity}</td>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'right', fontSize: '0.9rem' }}>{item.physicalQuantity}</td>
                    <td style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'right', fontWeight: 600, color: item.difference > 0 ? 'var(--success)' : item.difference < 0 ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                      {item.difference > 0 ? '+' : ''}{item.difference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

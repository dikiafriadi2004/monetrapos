'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { purchaseOrdersService, PurchaseOrder, PurchaseOrderStatus, ReceivePurchaseOrderDto } from '@/services/purchase-orders.service';
import { ArrowLeft, Package, Building2, Store, Calendar, CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280', sent: '#3b82f6', received: 'var(--success)', cancelled: 'var(--danger)',
};

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveForm, setReceiveForm] = useState<{ receivedDate: string; items: { productId: string; receivedQuantity: number }[] }>({
    receivedDate: new Date().toISOString().split('T')[0],
    items: [],
  });
  const [receiving, setReceiving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [sendingStatus, setSendingStatus] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await purchaseOrdersService.getById(id);
      setPo(data);
      setReceiveForm({
        receivedDate: new Date().toISOString().split('T')[0],
        items: data.items.map(i => ({ productId: i.productId, receivedQuantity: i.quantity })),
      });
    } catch { toast.error('Failed to load purchase order'); router.back(); }
    finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!confirm('Mark this PO as sent to supplier?')) return;
    setSendingStatus(true);
    try {
      await purchaseOrdersService.updateStatus(id, PurchaseOrderStatus.SENT);
      toast.success('PO marked as sent');
      load();
    } catch { toast.error('Failed to update status'); }
    finally { setSendingStatus(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this purchase order? This cannot be undone.')) return;
    setCancelling(true);
    try {
      await purchaseOrdersService.cancel(id);
      toast.success('Purchase order cancelled');
      load();
    } catch { toast.error('Failed to cancel'); }
    finally { setCancelling(false); }
  };

  const handleReceive = async () => {
    setReceiving(true);
    try {
      const payload: ReceivePurchaseOrderDto = {
        receivedDate: receiveForm.receivedDate,
        items: receiveForm.items.filter(i => i.receivedQuantity > 0),
      };
      await purchaseOrdersService.receive(id, payload);
      toast.success('Purchase order received — stock updated');
      setShowReceiveModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to receive order');
    } finally { setReceiving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
    </div>
  );

  if (!po) return null;

  const statusColor = STATUS_COLORS[po.status] || '#6b7280';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button onClick={() => router.back()} className="btn btn-outline" style={{ padding: 'var(--space-sm)' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <h1 style={{ fontSize: '1.75rem' }}>{po.poNumber}</h1>
              <span style={{ padding: '4px 12px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700, background: `${statusColor}20`, color: statusColor, textTransform: 'uppercase' }}>
                {po.status}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>Purchase Order Details</p>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {po.status === PurchaseOrderStatus.DRAFT && (
            <>
              <button onClick={() => router.push(`/dashboard/inventory/purchase-orders/${id}/edit`)} className="btn btn-outline">
                Edit
              </button>
              <button onClick={handleSend} disabled={sendingStatus} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {sendingStatus && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                Mark as Sent
              </button>
            </>
          )}
          {po.status === PurchaseOrderStatus.SENT && (
            <button onClick={() => setShowReceiveModal(true)} className="btn btn-primary" style={{ background: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={16} /> Receive Order
            </button>
          )}
          {(po.status === PurchaseOrderStatus.DRAFT || po.status === PurchaseOrderStatus.SENT) && (
            <button onClick={handleCancel} disabled={cancelling} className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {cancelling && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              <XCircle size={14} /> Cancel
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-lg)', alignItems: 'start' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Info cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            {[
              { icon: Building2, label: 'Supplier', value: po.supplierName },
              { icon: Store, label: 'Store', value: po.storeName },
              { icon: Calendar, label: 'Order Date', value: fmtDate(po.orderDate) },
              { icon: Calendar, label: 'Expected', value: po.expectedDate ? fmtDate(po.expectedDate) : '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="glass-panel" style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontWeight: 600 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Items table */}
          <div className="glass-panel" style={{ padding: 0 }}>
            <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={16} style={{ color: 'var(--primary)' }} /> Order Items ({po.items.length})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Product', 'Qty Ordered', 'Unit Price', 'Total', ...(po.status === PurchaseOrderStatus.RECEIVED ? ['Qty Received'] : [])].map(h => (
                      <th key={h} style={{ padding: 'var(--space-sm) var(--space-lg)', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {po.items.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', fontWeight: 600 }}>{item.productName}</td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>{item.quantity}</td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>{fmt(item.unitPrice)}</td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', fontWeight: 600, color: 'var(--success)' }}>{fmt(item.totalPrice)}</td>
                      {po.status === PurchaseOrderStatus.RECEIVED && (
                        <td style={{ padding: 'var(--space-md) var(--space-lg)', color: item.receivedQuantity === item.quantity ? 'var(--success)' : 'var(--warning)' }}>
                          {item.receivedQuantity ?? '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {po.notes && (
            <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
              <div style={{ fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Notes</div>
              <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{po.notes}</p>
            </div>
          )}
        </div>

        {/* Right — totals */}
        <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Order Total</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
              <span>{fmt(po.subtotal)}</span>
            </div>
            {po.tax > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tax</span>
                <span>{fmt(po.tax)}</span>
              </div>
            )}
            {po.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                <span>Discount</span>
                <span>-{fmt(po.discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-subtle)', marginTop: 'var(--space-sm)' }}>
              <span>Total</span>
              <span style={{ color: 'var(--success)' }}>{fmt(po.total)}</span>
            </div>
          </div>

          {po.receivedDate && (
            <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>✓ Received</div>
              <div style={{ color: 'var(--text-secondary)' }}>{fmtDate(po.receivedDate)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Receive Modal */}
      {showReceiveModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setShowReceiveModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 560, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Receive Purchase Order</h3>
              <button onClick={() => setShowReceiveModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
              <label className="form-label">Received Date *</label>
              <input type="date" className="form-input" value={receiveForm.receivedDate}
                onChange={e => setReceiveForm(p => ({ ...p, receivedDate: e.target.value }))} required />
            </div>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label className="form-label">Received Quantities</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {po.items.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-sm)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>{item.productName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Ordered: {item.quantity}</div>
                    <input type="number" className="form-input" style={{ width: 80, height: 32 }}
                      value={receiveForm.items[i]?.receivedQuantity ?? item.quantity}
                      min="0" max={item.quantity}
                      onChange={e => setReceiveForm(p => ({
                        ...p,
                        items: p.items.map((ri, idx) => idx === i ? { ...ri, receivedQuantity: Number(e.target.value) } : ri),
                      }))} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowReceiveModal(false)} className="btn btn-outline">Cancel</button>
              <button onClick={handleReceive} disabled={receiving} className="btn btn-primary" style={{ background: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {receiving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                {receiving ? 'Processing...' : 'Confirm Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Receipt, Eye, Printer, Mail, XCircle, RotateCcw, Loader2, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/hooks/useStore';
import { transactionService } from '@/services/transaction.service';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/hooks/usePermission';
import { Modal, PageHeader, SearchInput, StatusBadge, EmptyState, LoadingSpinner, Pagination } from '@/components/ui';

export default function TransactionsPage() {
  const { company } = useAuth();
  const { storeId } = useStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [voidModal, setVoidModal] = useState<{ open: boolean; tx: any | null }>({ open: false, tx: null });
  const [refundModal, setRefundModal] = useState<{ open: boolean; tx: any | null }>({ open: false, tx: null });
  const [voidReason, setVoidReason] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => { if (storeId) loadTransactions(); }, [storeId, page, filterDateFrom, filterDateTo]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { storeId: storeId!, page, limit: 20 };
      if (filterDateFrom) params.startDate = filterDateFrom;
      if (filterDateTo) params.endDate = filterDateTo;
      const res = await apiClient.get('/transactions', { params });
      const data = res.data as any;
      setTransactions(Array.isArray(data) ? data : (data?.data || []));
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
      toast.error(err?.response?.data?.message || 'Failed to load transactions');
    } finally { setLoading(false); }
  };

  const handleVoid = async () => {
    if (!voidReason.trim()) { toast.error('Please enter a reason'); return; }
    setActionLoading(true);
    try {
      await transactionService.voidTransaction(voidModal.tx.id, voidReason);
      toast.success('Transaction voided');
      setVoidModal({ open: false, tx: null }); setVoidReason('');
      loadTransactions();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to void'); }
    finally { setActionLoading(false); }
  };

  const handleRefund = async () => {
    if (!refundReason.trim()) { toast.error('Please enter a reason'); return; }
    setActionLoading(true);
    try {
      await apiClient.patch(`/transactions/${refundModal.tx.id}/refund`, { reason: refundReason });
      toast.success('Transaction refunded');
      setRefundModal({ open: false, tx: null }); setRefundReason('');
      loadTransactions();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to refund'); }
    finally { setActionLoading(false); }
  };

  const handlePrint = async (tx: any) => {
    try {
      const res = await apiClient.get(`/transactions/${tx.id}/receipt`);
      const receipt = res.data as any;
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<html><head><title>Receipt</title><style>body{font-family:monospace;max-width:300px;margin:0 auto;padding:20px}.row{display:flex;justify-content:space-between}.divider{border-top:1px dashed #000;margin:8px 0}</style></head><body>
          <div style="text-align:center"><h3>${receipt?.storeName||'POS'}</h3></div>
          <div class="divider"></div><p>Invoice: ${tx.transactionNumber}</p><p>Date: ${new Date(tx.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
          ${tx.customer?.name?`<p>Customer: ${tx.customer.name}</p>`:''}
          <div class="divider"></div>
          ${(tx.items||[]).map((i:any)=>`<div class="row"><span>${i.quantity}x ${i.productName}</span><span>Rp ${i.subtotal?.toLocaleString('id-ID')}</span></div>`).join('')}
          <div class="divider"></div>
          <div class="row"><span>Total</span><strong>Rp ${tx.total?.toLocaleString('id-ID')}</strong></div>
          <div class="divider"></div><div style="text-align:center"><p>Thank you!</p></div>
          </body></html>`);
        win.document.close(); win.print();
      }
    } catch { toast.error('Failed to load receipt'); }
  };

  const handleEmail = async (tx: any) => {
    if (!tx.customer?.email) { toast.error('No customer email on this transaction'); return; }
    try {
      await apiClient.post('/receipts/email', { transactionId: tx.id, email: tx.customer.email });
      toast.success(`Receipt sent to ${tx.customer.email}`);
    } catch { toast.error('Failed to send receipt email'); }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().setDate(1)).toISOString().split('T')[0];
      const report = await transactionService.getSalesReport({ storeId: storeId!, startDate: monthStart, endDate: today, groupBy: 'day' });
      const rows = (report as any)?.daily || (report as any)?.data || [];
      if (!rows.length) { toast.error('No data to export'); return; }
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(','), ...rows.map((r: any) => headers.map((h: string) => r[h]).join(','))].join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `transactions_${today}.csv`; a.click();
      toast.success('Report exported');
    } catch { toast.error('Failed to export report'); }
    finally { setExportLoading(false); }
  };

  const filtered = transactions.filter(t => {
    const matchSearch = !searchQuery || t.transactionNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || t.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);
  const fmtDate = (d: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));

  return (
    <div>
      <PageHeader title="Transactions" description="View and manage transaction history"
        action={<button onClick={handleExport} disabled={exportLoading || !storeId} className="btn btn-outline btn-sm">
          {exportLoading ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>} Export
        </button>} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by invoice or customer..." className="flex-1 min-w-[200px]" />
        <select className="form-input w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          {['completed','pending','cancelled','voided','refunded'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">From</span>
          <input type="date" className="form-input w-36" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }} />
          <span className="text-sm text-gray-500">To</span>
          <input type="date" className="form-input w-36" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(1); }} />
          {(filterDateFrom || filterDateTo) && <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setPage(1); }} className="btn btn-ghost btn-sm text-red-500">Clear</button>}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No transactions found" />
      ) : (
        <div className="card">
          <div className="table-container border-0">
            <table className="table">
              <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Payment</th><th>Total</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filtered.map(tx => (
                  <tr key={tx.id}>
                    <td className="font-semibold text-indigo-600 text-sm">{tx.transactionNumber}</td>
                    <td className="text-gray-500 text-sm whitespace-nowrap">{fmtDate(tx.createdAt)}</td>
                    <td className="text-sm">{tx.customer?.name || <span className="text-gray-400">—</span>}</td>
                    <td><span className="badge badge-gray uppercase text-xs">{tx.paymentMethod}</span></td>
                    <td className="font-bold">{fmt(tx.total)}</td>
                    <td><StatusBadge status={tx.status} /></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setSelectedTx(tx)} className="btn btn-ghost btn-icon btn-sm" title="View"><Eye size={14}/></button>
                        <button onClick={() => handlePrint(tx)} className="btn btn-ghost btn-icon btn-sm" title="Print"><Printer size={14}/></button>
                        <button onClick={() => handleEmail(tx)} className="btn btn-ghost btn-icon btn-sm text-emerald-600" title="Email"><Mail size={14}/></button>
                        {tx.status === 'completed' && (<>
                          <PermissionGate permission={PERMISSIONS.POS_VOID}>
                            <button onClick={() => setVoidModal({ open: true, tx })} className="btn btn-ghost btn-icon btn-sm text-amber-500" title="Void"><XCircle size={14}/></button>
                          </PermissionGate>
                          <PermissionGate permission={PERMISSIONS.POS_REFUND}>
                            <button onClick={() => setRefundModal({ open: true, tx })} className="btn btn-ghost btn-icon btn-sm text-purple-500" title="Refund"><RotateCcw size={14}/></button>
                          </PermissionGate>
                        </>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination page={page} totalPages={Math.ceil(filtered.length / 20) || 1} onPageChange={setPage} totalItems={filtered.length} />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!selectedTx} onClose={() => setSelectedTx(null)} title="Transaction Detail" size="lg">
        {selectedTx && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[['Invoice', selectedTx.transactionNumber], ['Date', fmtDate(selectedTx.createdAt)], ['Status', selectedTx.status], ['Payment', selectedTx.paymentMethod?.toUpperCase()], ...(selectedTx.customer?.name ? [['Customer', selectedTx.customer.name]] : [])].map(([l,v]) => (
                <div key={l}><p className="text-xs text-gray-400 uppercase">{l}</p><p className="font-semibold mt-0.5 capitalize">{v}</p></div>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Items</p>
              <div className="space-y-1">
                {(selectedTx.items || []).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100">
                    <span>{item.quantity}x {item.productName}</span><span className="font-medium">{fmt(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              {[['Subtotal', selectedTx.subtotal], ...(selectedTx.taxAmount > 0 ? [['Tax', selectedTx.taxAmount]] : []), ...(selectedTx.discountAmount > 0 ? [['Discount', -selectedTx.discountAmount]] : [])].map(([l,v]: any) => (
                <div key={l} className="flex justify-between text-sm text-gray-600"><span>{l}</span><span>{v < 0 ? `-${fmt(-v)}` : fmt(v)}</span></div>
              ))}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200 mt-1"><span>Total</span><span className="text-emerald-600">{fmt(selectedTx.total)}</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handlePrint(selectedTx)} className="btn btn-outline flex-1"><Printer size={14}/> Print</button>
              <button onClick={() => handleEmail(selectedTx)} className="btn btn-outline flex-1 text-emerald-600"><Mail size={14}/> Email</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Void Modal */}
      <Modal open={voidModal.open} onClose={() => setVoidModal({ open: false, tx: null })} title="Void Transaction"
        footer={<><button onClick={() => setVoidModal({ open: false, tx: null })} className="btn btn-outline">Cancel</button><button onClick={handleVoid} disabled={actionLoading} className="btn btn-warning">{actionLoading ? <Loader2 size={14} className="animate-spin"/> : null}Void Transaction</button></>}>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Void <strong>{voidModal.tx?.transactionNumber}</strong>? This cannot be undone.</p>
          <textarea className="form-input" rows={3} value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="Reason for voiding..." />
        </div>
      </Modal>

      {/* Refund Modal */}
      <Modal open={refundModal.open} onClose={() => setRefundModal({ open: false, tx: null })} title="Refund Transaction"
        footer={<><button onClick={() => setRefundModal({ open: false, tx: null })} className="btn btn-outline">Cancel</button><button onClick={handleRefund} disabled={actionLoading} className="btn btn-primary">{actionLoading ? <Loader2 size={14} className="animate-spin"/> : null}Process Refund</button></>}>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Refund <strong>{refundModal.tx?.transactionNumber}</strong> — {fmt(refundModal.tx?.total)}</p>
          <textarea className="form-input" rows={3} value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Reason for refund..." />
        </div>
      </Modal>
    </div>
  );
}

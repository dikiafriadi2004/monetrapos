'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, CreditCard, Loader2, RefreshCcw, CheckCircle, Clock, XCircle, RotateCcw } from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import { PageHeader, StatusBadge, EmptyState, LoadingSpinner } from '@/components/ui';

interface Invoice {
  id: string; invoiceNumber: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number; taxAmount: number; discountAmount: number; total: number;
  dueDate: string; paidAt?: string; invoicePdfUrl?: string; paymentUrl?: string; createdAt: string;
}

const STATUS_ICON: Record<string, React.ElementType> = {
  paid: CheckCircle, pending: Clock, overdue: XCircle, cancelled: XCircle,
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/billing/invoices');
      setInvoices(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  const handlePay = async (invoice: Invoice) => {
    setPaying(invoice.id);
    try {
      // If invoice already has a payment URL, go to checkout directly
      if (invoice.paymentUrl) {
        window.location.href = `/checkout?invoice=${invoice.invoiceNumber}&amount=${invoice.total}&paymentUrl=${encodeURIComponent(invoice.paymentUrl)}`;
        return;
      }
      // Otherwise generate new payment URL
      const res = await apiClient.post(`/billing/invoices/${invoice.id}/pay`, { gateway: 'xendit' });
      const url = (res.data as any)?.paymentUrl;
      if (url) {
        window.location.href = `/checkout?invoice=${invoice.invoiceNumber}&amount=${invoice.total}&paymentUrl=${encodeURIComponent(url)}`;
      } else {
        window.location.href = `/checkout?invoice=${invoice.invoiceNumber}&amount=${invoice.total}`;
      }
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to initiate payment'); }
    finally { setPaying(null); }
  };

  const handleDownload = async (invoice: Invoice) => {
    try {
      const res = await apiClient.get(`/billing/invoices/${invoice.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data as any]));
      const a = document.createElement('a'); a.href = url; a.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { toast.error('Failed to download invoice'); }
  };

  const handleRegenerate = async (invoice: Invoice) => {
    setRegenerating(invoice.id);
    try {
      await apiClient.post(`/billing/invoices/${invoice.id}/regenerate-pdf`);
      toast.success('PDF regenerated');
      await load();
    } catch { toast.error('Failed to regenerate PDF'); }
    finally { setRegenerating(null); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      <PageHeader title="Billing & Invoices" description="View and pay your subscription invoices"
        action={<button onClick={load} className="btn btn-outline btn-sm"><RefreshCcw size={14} /> Refresh</button>} />

      {loading ? <LoadingSpinner /> : invoices.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices found" description="Your billing history will appear here." />
      ) : (
        <div className="card">
          <div className="table-container border-0">
            <table className="table">
              <thead>
                <tr><th>Invoice</th><th>Date</th><th>Due Date</th><th>Amount</th><th>Status</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const isOverdue = inv.status === 'pending' && new Date(inv.dueDate) < new Date();
                  const StatusIcon = STATUS_ICON[inv.status] || Clock;
                  return (
                    <tr key={inv.id}>
                      <td className="font-semibold text-indigo-600">{inv.invoiceNumber}</td>
                      <td className="text-gray-500 text-sm">{fmtDate(inv.createdAt)}</td>
                      <td className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {fmtDate(inv.dueDate)}{isOverdue && <span className="ml-1 badge badge-danger text-xs">OVERDUE</span>}
                      </td>
                      <td className="font-bold">{fmt(inv.total)}</td>
                      <td><StatusBadge status={inv.status} /></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleDownload(inv)} className="btn btn-outline btn-sm"><Download size={13} /> PDF</button>
                          <button onClick={() => handleRegenerate(inv)} disabled={regenerating === inv.id} className="btn btn-ghost btn-icon btn-sm" title="Regenerate PDF">
                            {regenerating === inv.id ? <Loader2 size={13} className="animate-spin"/> : <RotateCcw size={13}/>}
                          </button>
                          {(inv.status === 'pending' || inv.status === 'overdue') && (
                            <button onClick={() => handlePay(inv)} disabled={paying === inv.id} className="btn btn-primary btn-sm">
                              {paying === inv.id ? <Loader2 size={13} className="animate-spin"/> : <CreditCard size={13}/>} Pay
                            </button>
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
    </div>
  );
}

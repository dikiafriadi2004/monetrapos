'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { subscriptionService, Invoice } from '@/services/subscription.service';
import { Loader2, ArrowLeft, AlertCircle, Download, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    loadInvoices();
  }, [page]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await subscriptionService.getInvoices(page, limit);
      setInvoices(response.data);
      setTotal(response.total);
    } catch (error: any) {
      console.error('Failed to load invoices:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load invoices';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (invoiceId: string, invoiceNumber: string) => {
    setDownloadingId(invoiceId);
    const toastId = toast.loading('Downloading invoice...');
    try {
      const blob = await subscriptionService.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Invoice downloaded successfully', { id: toastId });
    } catch (error: any) {
      console.error('Failed to download invoice:', error);
      const errorMessage = error.response?.data?.message || 'Failed to download invoice';
      toast.error(errorMessage, { id: toastId });
    } finally {
      setDownloadingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'badge-success';
      case 'pending':
        return 'badge-warning';
      case 'overdue':
        return 'badge-danger';
      case 'cancelled':
        return 'badge-primary';
      default:
        return 'badge-primary';
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} style={{ color: 'var(--accent-base)', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-center" style={{ minHeight: '400px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Failed to Load Invoices
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
            <button onClick={() => router.back()} className="btn btn-outline">
              <ArrowLeft size={18} />
              Go Back
            </button>
            <button onClick={loadInvoices} className="btn btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <button
          onClick={() => router.back()}
          className="btn btn-outline"
          style={{ padding: 'var(--space-sm)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>Invoices</h1>
      </div>

      {/* Invoices List */}
      <div className="card">
        {invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="empty-state-title">No Invoices</h2>
            <p className="empty-state-description">No invoices found for your subscription.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <div style={{ fontWeight: '700' }}>
                        {invoice.invoiceNumber}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td>
                      <div style={{ fontWeight: '700' }}>
                        {formatCurrency(invoice.total)}
                      </div>
                      {invoice.discountAmount > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                          Discount: {formatCurrency(invoice.discountAmount)}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${getStatusColor(invoice.status)}`}>
                        {invoice.status.toUpperCase()}
                      </span>
                      {invoice.paidAt && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-xs)' }}>
                          Paid: {formatDate(invoice.paidAt)}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        {invoice.invoicePdfUrl && (
                          <button
                            onClick={() => handleDownload(invoice.id, invoice.invoiceNumber)}
                            disabled={downloadingId === invoice.id}
                            className="btn btn-outline btn-sm"
                            style={{ minWidth: '100px' }}
                          >
                            {downloadingId === invoice.id ? (
                              <>
                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download size={14} />
                                Download
                              </>
                            )}
                          </button>
                        )}
                        {invoice.status === 'pending' && invoice.paymentUrl && (
                          <a
                            href={invoice.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-success btn-sm"
                          >
                            <ExternalLink size={14} />
                            Pay Now
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: 'var(--space-lg)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} invoices
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn btn-outline btn-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="btn btn-outline btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

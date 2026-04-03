'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { subscriptionService, SubscriptionHistory } from '@/services/subscription.service';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubscriptionHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<SubscriptionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    loadHistory();
  }, [page]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await subscriptionService.getSubscriptionHistory(undefined, page, limit);
      setHistory(response.data);
      setTotal(response.total);
    } catch (error: any) {
      console.error('Failed to load history:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load subscription history';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
      case 'activated':
        return 'var(--success)';
      case 'renewed':
        return 'var(--info)';
      case 'expired':
        return 'var(--warning)';
      case 'suspended':
      case 'cancelled':
        return 'var(--danger)';
      default:
        return 'var(--text-secondary)';
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} style={{ color: 'var(--accent-base)', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading subscription history...</p>
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
            Failed to Load History
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
            <button onClick={() => router.back()} className="btn btn-outline">
              <ArrowLeft size={18} />
              Go Back
            </button>
            <button onClick={loadHistory} className="btn btn-primary">
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
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>Subscription History</h1>
      </div>

      {/* History List */}
      <div className="card">
        {history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="empty-state-title">No History Records</h2>
            <p className="empty-state-description">No subscription history records found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Action</th>
                  <th>Status Change</th>
                  <th>End Date Change</th>
                  <th>Performed By</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(record.performedAt ?? record.createdAt)}
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', color: getActionColor(record.action) }}>
                        {record.action}
                      </span>
                    </td>
                    <td>
                      {record.oldStatus && record.newStatus ? (
                        <span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{record.oldStatus}</span>
                          {' → '}
                          <span style={{ fontWeight: '700' }}>{record.newStatus}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                      )}
                    </td>
                    <td>
                      {record.oldEndDate && record.newEndDate ? (
                        <span>
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            {new Date(record.oldEndDate).toLocaleDateString('id-ID')}
                          </span>
                          {' → '}
                          <span style={{ fontWeight: '700' }}>
                            {new Date(record.newEndDate).toLocaleDateString('id-ID')}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {record.performedBy || 'System'}
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
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} records
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

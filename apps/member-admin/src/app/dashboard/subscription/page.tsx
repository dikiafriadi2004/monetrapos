'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { subscriptionService, Subscription } from '@/services/subscription.service';
import { Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await subscriptionService.getCurrentSubscription();
      setSubscription(data);
    } catch (error: any) {
      console.error('Failed to load subscription:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load subscription details';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
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
      case 'active':
        return 'badge-success';
      case 'expired':
        return 'badge-warning';
      case 'suspended':
        return 'badge-danger';
      case 'pending':
        return 'badge-info';
      default:
        return 'badge-primary';
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} style={{ color: 'var(--accent-base)', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading subscription details...</p>
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
            Failed to Load Subscription
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button onClick={loadSubscription} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="empty-state-title">No Active Subscription</h2>
        <p className="empty-state-description">You don't have an active subscription yet. Subscribe now to start using MonetRAPOS.</p>
        <button
          onClick={() => router.push('/register')}
          className="btn btn-primary"
        >
          Subscribe Now
        </button>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(subscription.endDate);
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = subscription.status === 'expired';
  const isSuspended = subscription.status === 'suspended';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className="flex-between">
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>Subscription Details</h1>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button
            onClick={() => router.push('/dashboard/subscription/history')}
            className="btn btn-outline btn-sm"
          >
            View History
          </button>
          <button
            onClick={() => router.push('/dashboard/subscription/invoices')}
            className="btn btn-outline btn-sm"
          >
            View Invoices
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {(isExpiringSoon || isExpired || isSuspended) && (
        <div className="alert" style={{
          background: isSuspended ? 'var(--danger-light)' : isExpired ? 'var(--warning-light)' : 'var(--info-light)',
          borderColor: isSuspended ? 'var(--danger)' : isExpired ? 'var(--warning)' : 'var(--info)',
          color: isSuspended ? '#991b1b' : isExpired ? '#92400e' : '#1e40af',
        }}>
          <AlertCircle size={24} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: '700', marginBottom: 'var(--space-xs)', fontSize: '1rem' }}>
              {isSuspended
                ? 'Subscription Suspended'
                : isExpired
                ? 'Subscription Expired'
                : 'Subscription Expiring Soon'}
            </h3>
            <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-md)' }}>
              {isSuspended
                ? 'Your subscription has been suspended. Please renew to restore access.'
                : isExpired
                ? `Your subscription expired on ${formatDate(subscription.endDate)}. You have ${subscription.gracePeriodEndDate ? getDaysRemaining(subscription.gracePeriodEndDate) : 0} days of grace period remaining.`
                : `Your subscription will expire in ${daysRemaining} days. Renew now to avoid service interruption.`}
            </p>
            <button
              onClick={() => {
                toast.loading('Redirecting to renewal page...');
                router.push('/dashboard/subscription/renew');
              }}
              className="btn btn-sm"
              style={{
                background: isSuspended ? 'var(--danger)' : isExpired ? 'var(--warning)' : 'var(--info)',
                color: 'white',
              }}
            >
              Renew Subscription
            </button>
          </div>
        </div>
      )}

      {/* Subscription Card */}
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: 'var(--space-sm)', color: 'var(--text-primary)' }}>
              {subscription.plan?.name}
            </h2>
            <span className={`badge ${getStatusColor(subscription.status)}`}>
              {subscription.status.toUpperCase()}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--accent-base)', lineHeight: 1 }}>
              {formatCurrency(subscription.plan?.priceMonthly ?? 0)}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>per month</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Subscription Period
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div className="flex-between">
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Start Date:</span>
                <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{formatDate(subscription.startDate)}</span>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>End Date:</span>
                <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{formatDate(subscription.endDate)}</span>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Duration:</span>
                <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                  {subscription.durationMonths ?? 0} month{(subscription.durationMonths ?? 0) > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Days Remaining:</span>
                <span style={{ fontWeight: '700', fontSize: '0.875rem', color: daysRemaining <= 7 ? 'var(--danger)' : 'var(--success)' }}>
                  {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Billing Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div className="flex-between">
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Billing Cycle:</span>
                <span style={{ fontWeight: '600', fontSize: '0.875rem', textTransform: 'capitalize' }}>{subscription.billingCycle}</span>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Amount Paid:</span>
                <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{formatCurrency(subscription.price ?? 0)}</span>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Currency:</span>
                <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{subscription.currency}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Plan Features
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
            {Object.entries(subscription.plan?.features ?? {}).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                {value ? (
                  <svg style={{ width: '20px', height: '20px', color: 'var(--success)', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg style={{ width: '20px', height: '20px', color: 'var(--text-tertiary)', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-xl)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)' }}>
          {subscription.status === 'active' && (
            <button
              onClick={() => {
                toast.loading('Redirecting to renewal page...');
                router.push('/dashboard/subscription/renew');
              }}
              className="btn btn-primary"
            >
              Renew Early
            </button>
          )}
          {(subscription.status === 'expired' || subscription.status === 'suspended') && (
            <button
              onClick={() => {
                toast.loading('Redirecting to renewal page...');
                router.push('/dashboard/subscription/renew');
              }}
              className="btn btn-primary"
            >
              Reactivate Subscription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

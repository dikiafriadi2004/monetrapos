'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { subscriptionService, Subscription } from '@/services/subscription.service';
import { registrationService, SubscriptionPlan } from '@/services/registration.service';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RenewSubscriptionPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const sub = await subscriptionService.getCurrentSubscription();
      setSubscription(sub);
      
      if (sub) {
        const plans = await registrationService.getPlans();
        const currentPlan = plans.find(p => p.id === sub.planId);
        setPlan(currentPlan || null);
      }
    } catch (error: any) {
      console.error('Failed to load data:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load subscription data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    setProcessing(true);
    const toastId = toast.loading('Processing renewal...');
    try {
      const response = await subscriptionService.renewSubscription(selectedDuration);
      toast.success('Redirecting to payment...', { id: toastId });
      setTimeout(() => {
        window.location.href = response.paymentUrl;
      }, 500);
    } catch (error: any) {
      console.error('Renewal failed:', error);
      const errorMessage = error.response?.data?.message || 'Renewal failed. Please try again.';
      toast.error(errorMessage, { id: toastId });
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculatePrice = (months: number) => {
    if (!plan) return { subtotal: 0, discount: 0, final: 0 };
    
    const duration = plan.durations?.find(d => d.durationMonths === months);
    if (duration) {
      return {
        subtotal: plan.priceMonthly * months,
        discount: duration.discountPercentage,
        final: duration.finalPrice,
      };
    }
    return {
      subtotal: plan.priceMonthly * months,
      discount: 0,
      final: plan.priceMonthly * months,
    };
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} style={{ color: 'var(--accent-base)', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading renewal options...</p>
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
            Failed to Load Data
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
            <button onClick={() => router.back()} className="btn btn-outline">
              <ArrowLeft size={18} />
              Go Back
            </button>
            <button onClick={loadData} className="btn btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription || !plan) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="empty-state-title">No Subscription Found</h2>
        <p className="empty-state-description">Unable to load subscription details for renewal.</p>
        <button
          onClick={() => router.push('/dashboard/subscription')}
          className="btn btn-primary"
        >
          <ArrowLeft size={18} />
          Back to Subscription
        </button>
      </div>
    );
  }

  const price = calculatePrice(selectedDuration);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <button
          onClick={() => router.back()}
          className="btn btn-outline"
          style={{ padding: 'var(--space-sm)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>Renew Subscription</h1>
      </div>

      {/* Current Subscription Info */}
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: 'var(--space-lg)', color: 'var(--text-primary)' }}>
          Current Subscription
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>Plan</div>
            <div style={{ fontWeight: '700', fontSize: '1rem' }}>{plan.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>Status</div>
            <div style={{ fontWeight: '700', fontSize: '1rem', textTransform: 'capitalize' }}>{subscription.status}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>End Date</div>
            <div style={{ fontWeight: '700', fontSize: '1rem' }}>
              {new Date(subscription.endDate).toLocaleDateString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Duration Selection */}
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: 'var(--space-lg)', color: 'var(--text-primary)' }}>
          Select Renewal Duration
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-lg)' }}>
          {[1, 3, 6, 12].map((months) => {
            const monthPrice = calculatePrice(months);
            const isSelected = selectedDuration === months;
            return (
              <div
                key={months}
                onClick={() => setSelectedDuration(months)}
                className="card"
                style={{
                  padding: 'var(--space-lg)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: `2px solid ${isSelected ? 'var(--accent-base)' : 'var(--border-color)'}`,
                  background: isSelected ? 'var(--accent-lighter)' : 'var(--bg-secondary)',
                  transition: 'all var(--transition-normal)',
                }}
              >
                <div style={{ fontWeight: '700', fontSize: '1.25rem', marginBottom: 'var(--space-xs)' }}>
                  {months} Month{months > 1 ? 's' : ''}
                </div>
                {monthPrice.discount > 0 && (
                  <div style={{ color: 'var(--success)', fontSize: '0.875rem', fontWeight: '700', marginBottom: 'var(--space-sm)' }}>
                    Save {monthPrice.discount}%
                  </div>
                )}
                <div style={{ color: 'var(--accent-base)', fontWeight: '700', fontSize: '1.125rem', marginBottom: 'var(--space-xs)' }}>
                  {formatCurrency(monthPrice.final)}
                </div>
                {monthPrice.discount > 0 && (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textDecoration: 'line-through' }}>
                    {formatCurrency(monthPrice.subtotal)}
                  </div>
                )}
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 'var(--space-xs)' }}>
                  {formatCurrency(monthPrice.final / months)}/mo
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Summary */}
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: 'var(--space-lg)', color: 'var(--text-primary)' }}>
          Order Summary
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', fontSize: '0.875rem' }}>
          <div className="flex-between">
            <span style={{ color: 'var(--text-secondary)' }}>Plan:</span>
            <span style={{ fontWeight: '700' }}>{plan.name}</span>
          </div>
          <div className="flex-between">
            <span style={{ color: 'var(--text-secondary)' }}>Duration:</span>
            <span style={{ fontWeight: '700' }}>
              {selectedDuration} month{selectedDuration > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex-between">
            <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
            <span>{formatCurrency(price.subtotal)}</span>
          </div>
          {price.discount > 0 && (
            <div className="flex-between" style={{ color: 'var(--success)' }}>
              <span>Discount ({price.discount}%):</span>
              <span>-{formatCurrency(price.subtotal - price.final)}</span>
            </div>
          )}
          <div className="flex-between" style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            paddingTop: 'var(--space-md)',
            borderTop: '2px solid var(--border-color)',
            marginTop: 'var(--space-sm)',
          }}>
            <span>Total:</span>
            <span style={{ color: 'var(--accent-base)' }}>{formatCurrency(price.final)}</span>
          </div>
        </div>

        <div className="alert alert-info" style={{ marginTop: 'var(--space-lg)' }}>
          <svg style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p style={{ fontSize: '0.875rem' }}>
            {subscription.status === 'active'
              ? `Your subscription will be extended from the current end date (${new Date(subscription.endDate).toLocaleDateString('id-ID')}).`
              : 'Your subscription will be reactivated starting from today.'}
          </p>
        </div>

        <button
          onClick={handleRenew}
          disabled={processing}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', marginTop: 'var(--space-lg)' }}
        >
          {processing ? (
            <>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              Processing...
            </>
          ) : (
            'Proceed to Payment'
          )}
        </button>
      </div>
    </div>
  );
}

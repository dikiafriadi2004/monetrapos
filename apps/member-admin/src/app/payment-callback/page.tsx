'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type PaymentStatus = 'success' | 'pending' | 'failed' | 'loading';

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Parse payment status from URL params (Xendit format)
    const status = searchParams.get('status');
    const externalId = searchParams.get('external_id');
    const invoiceId = searchParams.get('id');

    // Xendit redirects with ?status=PAID or ?status=EXPIRED etc
    if (status === 'PAID' || status === 'SETTLED') {
      setStatus('success');
      setMessage('Payment successful! Your account is being activated. Please login to continue.');
    } else if (status === 'PENDING') {
      setStatus('pending');
      setMessage('Payment is being processed. You will receive a confirmation once payment is verified.');
    } else if (status === 'EXPIRED' || status === 'FAILED') {
      setStatus('failed');
      setMessage('Payment failed or expired. Please try registering again.');
    } else if (externalId || invoiceId) {
      // Has order info but no clear status - treat as pending
      setStatus('pending');
      setMessage('Payment status is being verified. Please wait or check your email for confirmation.');
    } else {
      setStatus('failed');
      setMessage('Unable to verify payment status. Please contact support.');
    }
  }, [searchParams]);

  // Auto redirect on success
  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === 'success' && countdown === 0) {
      router.push('/login');
    }
  }, [status, countdown, router]);

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle size={64} style={{ color: 'var(--success)' }} />;
      case 'pending':
        return <Clock size={64} style={{ color: 'var(--warning)' }} />;
      case 'failed':
        return <XCircle size={64} style={{ color: 'var(--danger)' }} />;
      default:
        return <Loader2 size={64} style={{ color: 'var(--accent-base)', animation: 'spin 1s linear infinite' }} />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'success':
        return 'Payment Successful!';
      case 'pending':
        return 'Payment Pending';
      case 'failed':
        return 'Payment Failed';
      default:
        return 'Processing Payment...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'var(--success)';
      case 'pending':
        return 'var(--warning)';
      case 'failed':
        return 'var(--danger)';
      default:
        return 'var(--accent-base)';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <div className="glass-panel" style={{
          padding: '3rem 2rem',
          textAlign: 'center',
        }}>
          {/* Icon */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '2rem',
          }}>
            {getIcon()}
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: getStatusColor(),
            marginBottom: '1rem',
          }}>
            {getTitle()}
          </h1>

          {/* Message */}
          <p style={{
            fontSize: '1rem',
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
            lineHeight: '1.6',
          }}>
            {message}
          </p>

          {/* Order Details */}
          {(searchParams.get('external_id') || searchParams.get('id')) && (
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '2rem',
            }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                Invoice ID
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                {searchParams.get('external_id') || searchParams.get('id')}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {status === 'success' && (
              <>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.5rem',
                }}>
                  Redirecting to login in {countdown} seconds...
                </div>
                <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
                  Go to Login <ArrowRight size={18} />
                </Link>
              </>
            )}

            {status === 'pending' && (
              <>
                <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
                  Go to Login <ArrowRight size={18} />
                </Link>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-tertiary)',
                  marginTop: '0.5rem',
                }}>
                  You can log in once the payment is confirmed
                </p>
              </>
            )}

            {status === 'failed' && (
              <>
                <Link href="/register" className="btn btn-primary" style={{ width: '100%' }}>
                  Try Again <ArrowRight size={18} />
                </Link>
                <Link href="/login" className="btn btn-outline" style={{ width: '100%' }}>
                  Back to Login
                </Link>
              </>
            )}

            {status === 'loading' && (
              <div style={{
                padding: '1rem',
                color: 'var(--text-secondary)',
              }}>
                Please wait...
              </div>
            )}
          </div>

          {/* Support Link */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-subtle)',
          }}>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--text-tertiary)',
            }}>
              Need help?{' '}
              <a
                href="mailto:support@monetrapos.com"
                style={{
                  color: 'var(--accent-base)',
                  fontWeight: '500',
                }}
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Loader2 size={48} style={{ color: 'var(--accent-base)', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}

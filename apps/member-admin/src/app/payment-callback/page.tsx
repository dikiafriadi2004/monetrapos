'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Loader2, ArrowRight, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

type PaymentStatus = 'success' | 'pending' | 'failed' | 'loading';

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [checking, setChecking] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  useEffect(() => {
    const urlStatus = searchParams.get('status');
    const externalId = searchParams.get('external_id');
    const invoiceId = searchParams.get('id');

    // Save invoice number for manual check
    if (externalId) setInvoiceNumber(externalId);

    if (urlStatus === 'PAID' || urlStatus === 'SETTLED') {
      setStatus('success');
      setMessage('Pembayaran berhasil! Akun Anda sedang diaktifkan.');
      // Auto-trigger check to activate subscription
      if (externalId) triggerCheck(externalId);
    } else if (urlStatus === 'PENDING') {
      setStatus('pending');
      setMessage('Pembayaran sedang diproses. Klik "Cek Status" untuk memperbarui.');
    } else if (urlStatus === 'EXPIRED' || urlStatus === 'FAILED') {
      setStatus('failed');
      setMessage('Pembayaran gagal atau kadaluarsa.');
    } else if (externalId || invoiceId) {
      setStatus('pending');
      setMessage('Status pembayaran sedang diverifikasi. Klik "Cek Status" untuk memperbarui.');
    } else {
      setStatus('failed');
      setMessage('Tidak dapat memverifikasi status pembayaran.');
    }
  }, [searchParams]);

  const triggerCheck = async (invNum: string) => {
    try {
      const res: any = await apiClient.post('/payment-gateway/check-payment', { invoiceNumber: invNum });
      if (res.data?.success || res.success) {
        setStatus('success');
        setMessage('Pembayaran dikonfirmasi! Subscription Anda telah diaktifkan.');
      }
    } catch { /* silent */ }
  };

  const handleCheckStatus = async () => {
    const invNum = invoiceNumber || searchParams.get('external_id') || '';
    if (!invNum) { toast.error('Invoice number tidak ditemukan'); return; }
    setChecking(true);
    try {
      const res: any = await apiClient.post('/payment-gateway/check-payment', { invoiceNumber: invNum });
      const data = res.data || res;
      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Pembayaran dikonfirmasi! Subscription diaktifkan.');
        toast.success(data.message || 'Subscription diaktifkan!');
      } else {
        toast.error(data.message || 'Pembayaran belum dikonfirmasi');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal cek status');
    } finally {
      setChecking(false);
    }
  };

  // Auto redirect on success
  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === 'success' && countdown === 0) {
      // Redirect to dashboard if logged in, otherwise to login
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      router.push(token ? '/dashboard' : '/login');
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
                  Redirecting in {countdown} seconds...
                </div>
                <Link href="/dashboard" className="btn btn-primary" style={{ width: '100%' }}>
                  Ke Dashboard <ArrowRight size={18} />
                </Link>
                <Link href="/login" className="btn btn-outline" style={{ width: '100%' }}>
                  Login
                </Link>
              </>
            )}

            {status === 'pending' && (
              <>
                <button
                  onClick={handleCheckStatus}
                  disabled={checking}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  {checking ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                  {checking ? 'Mengecek...' : 'Cek Status Pembayaran'}
                </button>
                <Link href="/dashboard" className="btn btn-outline" style={{ width: '100%' }}>
                  Ke Dashboard
                </Link>
                <Link href="/login" className="btn btn-outline" style={{ width: '100%' }}>
                  Login
                </Link>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-tertiary)',
                  marginTop: '0.5rem',
                }}>
                  Jika sudah bayar, klik "Cek Status" untuk mengaktifkan subscription
                </p>
              </>
            )}

            {status === 'failed' && (
              <>
                <Link href="/dashboard/subscription/renew" className="btn btn-primary" style={{ width: '100%' }}>
                  Coba Lagi <ArrowRight size={18} />
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


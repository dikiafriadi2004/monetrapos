'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, CheckCircle, Clock, AlertCircle, Loader2, ArrowRight, RefreshCcw, ExternalLink, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'expired' | 'loading';

interface InvoiceDetails {
  invoiceNumber: string;
  amount: number;
  status: string;
  expiresAt?: string;
  paymentUrl?: string;
  companyName?: string;
  planName?: string;
  durationMonths?: number;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

  const invoiceParam = searchParams.get('invoice');
  const amountParam = searchParams.get('amount');
  const paymentUrlParam = searchParams.get('paymentUrl');

  useEffect(() => {
    if (paymentUrlParam) {
      setPaymentUrl(decodeURIComponent(paymentUrlParam));
    }
    
    if (invoiceParam) {
      loadInvoiceDetails(invoiceParam);
    } else if (amountParam) {
      setInvoice({
        invoiceNumber: 'PENDING',
        amount: parseFloat(amountParam),
        status: 'unpaid',
      });
      setLoading(false);
    } else {
      toast.error('Invoice tidak ditemukan');
      setLoading(false);
    }
  }, [invoiceParam, amountParam, paymentUrlParam]);

  const loadInvoiceDetails = async (invoiceNumber: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/payment-gateway/invoice/${invoiceNumber}`);
      const data = response.data;
      
      setInvoice({
        invoiceNumber: data.invoiceNumber || invoiceNumber,
        amount: data.amount || parseFloat(amountParam || '0'),
        status: data.status || 'unpaid',
        expiresAt: data.expiresAt,
        paymentUrl: data.paymentUrl || paymentUrl,
        companyName: data.companyName,
        planName: data.planName,
        durationMonths: data.durationMonths,
      });

      if (data.paymentUrl && !paymentUrl) {
        setPaymentUrl(data.paymentUrl);
      }
    } catch (error: any) {
      console.error('Failed to load invoice:', error);
      if (amountParam) {
        setInvoice({
          invoiceNumber: invoiceParam || 'UNKNOWN',
          amount: parseFloat(amountParam),
          status: 'unpaid',
          paymentUrl: paymentUrl,
        });
      } else {
        toast.error('Gagal memuat detail invoice');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!invoice?.invoiceNumber) {
      toast.error('Invoice number tidak ditemukan');
      return;
    }

    setChecking(true);
    try {
      const response = await apiClient.post('/payment-gateway/check-payment', {
        invoiceNumber: invoice.invoiceNumber,
      });
      
      const data = response.data;
      
      if (data.success) {
        toast.success(data.message || 'Pembayaran berhasil dikonfirmasi!');
        setInvoice(prev => prev ? { ...prev, status: 'paid' } : null);
        
        setTimeout(() => {
          router.push(`/payment-callback?status=PAID&external_id=${invoice.invoiceNumber}`);
        }, 2000);
      } else {
        toast(data.message || 'Pembayaran belum dikonfirmasi', { icon: '💡' });
      }
    } catch (error: any) {
      console.error('Check payment failed:', error);
      toast.error(error?.response?.data?.message || 'Gagal mengecek status pembayaran');
    } finally {
      setChecking(false);
    }
  };

  const handlePayNow = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
      toast.success('Halaman pembayaran dibuka di tab baru');
    } else {
      toast.error('Payment URL tidak tersedia');
    }
  };

  const copyToClipboard = async (text: string) => {
    const { copyToClipboardWithToast } = await import('@/utils/clipboard');
    const success = await copyToClipboardWithToast(text, 'Invoice number disalin!');
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      unpaid: { label: 'Belum Dibayar', color: 'var(--warning)', icon: Clock },
      pending: { label: 'Menunggu Konfirmasi', color: 'var(--info)', icon: Clock },
      paid: { label: 'Lunas', color: 'var(--success)', icon: CheckCircle },
      expired: { label: 'Kadaluarsa', color: 'var(--danger)', icon: AlertCircle },
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.unpaid;
    const Icon = config.icon;

    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderRadius: 'var(--radius-full)',
        background: `${config.color}20`,
        color: config.color,
        fontWeight: '600',
        fontSize: '0.875rem',
      }}>
        <Icon size={16} />
        {config.label}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Loader2 size={48} style={{ color: 'var(--accent-base)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}>
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '500px' }}>
          <AlertCircle size={64} style={{ color: 'var(--danger)', margin: '0 auto 1.5rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
            Invoice Tidak Ditemukan
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Maaf, kami tidak dapat menemukan detail invoice Anda.
          </p>
          <Link href="/register" className="btn btn-primary">
            Kembali ke Registrasi
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status.toLowerCase() === 'paid';
  const isExpired = invoice.status.toLowerCase() === 'expired';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: '3rem 1rem',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--accent-lighter)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <CreditCard size={40} style={{ color: 'var(--accent-base)' }} />
          </div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '0.5rem',
          }}>
            Checkout
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
            Selesaikan pembayaran untuk mengaktifkan subscription Anda
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid var(--border-color)',
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Detail Invoice
              </h2>
              {getStatusBadge(invoice.status)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
                  Invoice Number
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}>
                  <code style={{
                    flex: 1,
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                  }}>
                    {invoice.invoiceNumber}
                  </code>
                  <button
                    onClick={() => copyToClipboard(invoice.invoiceNumber)}
                    style={{
                      padding: '0.5rem',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--accent-base)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Copy invoice number"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              {(invoice.companyName || invoice.planName) && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                }}>
                  {invoice.companyName && (
                    <div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                        Nama Usaha
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {invoice.companyName}
                      </div>
                    </div>
                  )}
                  {invoice.planName && (
                    <div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                        Paket Langganan
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {invoice.planName}
                        {invoice.durationMonths && ` - ${invoice.durationMonths} Bulan`}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{
                padding: '1.5rem',
                background: 'var(--accent-lighter)',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--accent-base)',
              }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Total Pembayaran
                </div>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: '700',
                  color: 'var(--accent-base)',
                }}>
                  {formatCurrency(invoice.amount)}
                </div>
              </div>

              {invoice.expiresAt && (
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                    Berlaku Hingga
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {formatDate(invoice.expiresAt)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {!isPaid && !isExpired && (
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                marginBottom: '1.5rem',
                color: 'var(--text-primary)',
              }}>
                Metode Pembayaran
              </h3>

              {/* Payment Methods Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}>
                {[
                  { 
                    name: 'E-Wallet', 
                    icon: '💳', 
                    desc: 'OVO, GoPay, Dana, LinkAja, ShopeePay',
                    color: '#10b981',
                    popular: true
                  },
                  { 
                    name: 'Virtual Account', 
                    icon: '🏦', 
                    desc: 'BCA, BNI, BRI, Mandiri, Permata',
                    color: '#3b82f6',
                    popular: true
                  },
                  { 
                    name: 'QRIS', 
                    icon: '📱', 
                    desc: 'Scan QR Code',
                    color: '#8b5cf6',
                    popular: true
                  },
                  { 
                    name: 'Kartu Kredit', 
                    icon: '💳', 
                    desc: 'Visa, Mastercard',
                    color: '#f59e0b',
                    popular: false
                  },
                  { 
                    name: 'Retail Store', 
                    icon: '🏪', 
                    desc: 'Alfamart, Indomaret',
                    color: '#ef4444',
                    popular: false
                  },
                ].map((method) => (
                  <div
                    key={method.name}
                    style={{
                      padding: '1rem',
                      background: method.popular ? 'var(--accent-lighter)' : 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: method.popular ? '2px solid var(--accent-base)' : '2px solid var(--border-color)',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                  >
                    {method.popular && (
                      <div style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '8px',
                        background: 'var(--accent-base)',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                      }}>
                        POPULER
                      </div>
                    )}
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{method.icon}</div>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      marginBottom: '0.25rem',
                      color: 'var(--text-primary)'
                    }}>
                      {method.name}
                    </div>
                    <div style={{ 
                      fontSize: '0.7rem', 
                      color: 'var(--text-tertiary)',
                      lineHeight: '1.3'
                    }}>
                      {method.desc}
                    </div>
                  </div>
                ))}
              </div>

              {/* E-Wallet Details */}
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #10b98120 0%, #3b82f620 100%)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--success)',
                marginBottom: '1.5rem',
              }}>
                <h4 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>💳</span>
                  E-Wallet yang Tersedia
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                  gap: '0.75rem',
                }}>
                  {[
                    { name: 'OVO', color: '#4c3494' },
                    { name: 'GoPay', color: '#00aa13' },
                    { name: 'Dana', color: '#118eea' },
                    { name: 'LinkAja', color: '#e31e24' },
                    { name: 'ShopeePay', color: '#ee4d2d' },
                  ].map((wallet) => (
                    <div
                      key={wallet.name}
                      style={{
                        padding: '0.75rem 0.5rem',
                        background: 'white',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: wallet.color,
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      {wallet.name}
                    </div>
                  ))}
                </div>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                  marginTop: '1rem',
                  textAlign: 'center',
                }}>
                  ✨ Pembayaran instan & otomatis terkonfirmasi
                </p>
              </div>

              <div style={{
                padding: '1.5rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
              }}>
                <h4 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  color: 'var(--text-primary)',
                }}>
                  Cara Pembayaran:
                </h4>
                <ol style={{
                  paddingLeft: '1.25rem',
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                }}>
                  <li>Klik tombol "Bayar Sekarang" di bawah</li>
                  <li>Pilih metode pembayaran favorit Anda (E-Wallet, Virtual Account, QRIS, dll)</li>
                  <li>Selesaikan pembayaran sesuai instruksi</li>
                  <li>Kembali ke halaman ini dan klik "Cek Status Pembayaran"</li>
                  <li>Subscription Anda akan otomatis diaktifkan setelah pembayaran dikonfirmasi</li>
                </ol>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {paymentUrl && (
                  <button
                    onClick={handlePayNow}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      fontSize: '1.125rem',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <CreditCard size={20} />
                    Bayar Sekarang
                    <ExternalLink size={18} />
                  </button>
                )}

                <button
                  onClick={handleCheckStatus}
                  disabled={checking}
                  className="btn btn-outline"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {checking ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Mengecek Status...
                    </>
                  ) : (
                    <>
                      <RefreshCcw size={18} />
                      Cek Status Pembayaran
                    </>
                  )}
                </button>

                <div style={{
                  padding: '1rem',
                  background: 'var(--info-lighter)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--info)',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                }}>
                  💡 Sudah bayar? Klik "Cek Status Pembayaran" untuk mengaktifkan subscription
                </div>
              </div>
            </div>
          )}

          {isPaid && (
            <div className="card" style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              background: 'var(--success-lighter)',
              border: '2px solid var(--success)',
            }}>
              <CheckCircle size={64} style={{ color: 'var(--success)', margin: '0 auto 1.5rem' }} />
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1rem',
                color: 'var(--success)',
              }}>
                Pembayaran Berhasil!
              </h3>
              <p style={{
                fontSize: '1rem',
                color: 'var(--text-secondary)',
                marginBottom: '2rem',
              }}>
                Subscription Anda telah diaktifkan. Silakan login untuk mulai menggunakan MonetraPOS.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link href="/dashboard" className="btn btn-primary">
                  Ke Dashboard <ArrowRight size={18} />
                </Link>
                <Link href="/login" className="btn btn-outline">
                  Login
                </Link>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="card" style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              background: 'var(--danger-lighter)',
              border: '2px solid var(--danger)',
            }}>
              <AlertCircle size={64} style={{ color: 'var(--danger)', margin: '0 auto 1.5rem' }} />
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1rem',
                color: 'var(--danger)',
              }}>
                Invoice Kadaluarsa
              </h3>
              <p style={{
                fontSize: '1rem',
                color: 'var(--text-secondary)',
                marginBottom: '2rem',
              }}>
                Invoice ini sudah melewati batas waktu pembayaran. Silakan buat invoice baru.
              </p>
              <Link href="/register" className="btn btn-primary">
                Registrasi Ulang <ArrowRight size={18} />
              </Link>
            </div>
          )}
        </div>

        <div style={{
          marginTop: '3rem',
          padding: '2rem',
          textAlign: 'center',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-tertiary)',
            marginBottom: '0.5rem',
          }}>
            Butuh bantuan dengan pembayaran?
          </p>
          <a
            href="mailto:support@monetrapos.com"
            style={{
              color: 'var(--accent-base)',
              fontWeight: '600',
              fontSize: '1rem',
              textDecoration: 'none',
            }}
          >
            Hubungi Support
          </a>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
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
      <CheckoutContent />
    </Suspense>
  );
}

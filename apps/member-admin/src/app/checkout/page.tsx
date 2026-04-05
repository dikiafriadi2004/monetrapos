'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Copy, Loader2, ShoppingCart, CreditCard, Building2, Smartphone, QrCode, ArrowLeft, Clock, Shield } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1';

const PAYMENT_METHODS = [
  {
    id: 'bank_transfer',
    label: 'Transfer Bank',
    icon: Building2,
    description: 'BCA, Mandiri, BNI, BRI, dan bank lainnya',
    color: '#1d4ed8',
  },
  {
    id: 'qris',
    label: 'QRIS',
    icon: QrCode,
    description: 'Scan QR dengan aplikasi apapun',
    color: '#7c3aed',
  },
  {
    id: 'ewallet',
    label: 'E-Wallet',
    icon: Smartphone,
    description: 'OVO, Dana, GoPay, ShopeePay',
    color: '#059669',
  },
  {
    id: 'credit_card',
    label: 'Kartu Kredit / Debit',
    icon: CreditCard,
    description: 'Visa, Mastercard, JCB',
    color: '#dc2626',
  },
];

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const invoiceNumber = searchParams.get('invoice') || '';
  const amount = Number(searchParams.get('amount') || 0);
  const paymentUrl = searchParams.get('paymentUrl') || '';

  const [selectedMethod, setSelectedMethod] = useState('bank_transfer');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'processing' | 'waiting'>('select');
  const [vaNumber, setVaNumber] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [expiryTime, setExpiryTime] = useState('');
  const [countdown, setCountdown] = useState(0);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const formatCountdown = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePay = async () => {
    if (!invoiceNumber) {
      toast.error('Invoice tidak ditemukan');
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      // If we have a direct Xendit URL, open it in a new tab (hidden branding via iframe or redirect)
      // For now, redirect to Xendit but with our custom loading screen first
      if (paymentUrl) {
        // Show our branded loading for 2 seconds then redirect
        await new Promise(r => setTimeout(r, 1500));
        window.location.href = paymentUrl;
        return;
      }

      // Otherwise create payment via our API
      const res = await axios.post(`${API_URL}/billing/invoices/${invoiceNumber}/pay`, {
        gateway: 'xendit',
        method: selectedMethod,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });

      const data = res.data;

      if (data.paymentUrl) {
        await new Promise(r => setTimeout(r, 1500));
        window.location.href = data.paymentUrl;
      } else if (data.vaNumber) {
        setVaNumber(data.vaNumber);
        setExpiryTime(data.expiryTime || '');
        setCountdown(24 * 3600);
        setStep('waiting');
      } else if (data.qrCode) {
        setQrCode(data.qrCode);
        setCountdown(15 * 60);
        setStep('waiting');
      } else {
        setStep('waiting');
        setCountdown(24 * 3600);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memproses pembayaran');
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Disalin!');
  };

  if (!invoiceNumber && !paymentUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Invoice tidak ditemukan</p>
          <button onClick={() => router.push('/dashboard/subscription/renew')} className="btn btn-primary mt-4">Perpanjang Subscription</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <ShoppingCart size={18} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">MonetraPOS</span>
          <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
            <Shield size={12} />
            <span>Pembayaran Aman</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Ringkasan Pesanan</h2>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Subscription MonetraPOS</span>
            <span className="font-semibold">{fmt(amount)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
            <span>No. Invoice</span>
            <span className="font-mono">{invoiceNumber}</span>
          </div>
          <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
            <span className="font-semibold text-gray-900">Total Pembayaran</span>
            <span className="text-2xl font-bold text-indigo-600">{fmt(amount)}</span>
          </div>
        </div>

        {/* Step: Select Method */}
        {step === 'select' && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Pilih Metode Pembayaran</h2>
            <div className="space-y-3 mb-6">
              {PAYMENT_METHODS.map(method => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${method.color}15` }}>
                      <Icon size={20} style={{ color: method.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-sm">{method.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{method.description}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-base hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
              {loading ? 'Memproses...' : `Bayar ${fmt(amount)}`}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">
              Dengan melanjutkan, Anda menyetujui syarat & ketentuan MonetraPOS
            </p>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 size={32} className="text-indigo-600 animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Memproses Pembayaran</h3>
            <p className="text-gray-500 text-sm">Mohon tunggu, kami sedang menyiapkan halaman pembayaran Anda...</p>
          </div>
        )}

        {/* Step: Waiting for payment */}
        {step === 'waiting' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock size={32} className="text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Menunggu Pembayaran</h3>
              {countdown > 0 && (
                <div className="mt-2 text-2xl font-mono font-bold text-amber-600">{formatCountdown(countdown)}</div>
              )}
              <p className="text-sm text-gray-500 mt-1">Selesaikan pembayaran sebelum waktu habis</p>
            </div>

            {vaNumber && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="text-xs text-gray-500 mb-1">Nomor Virtual Account</div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-mono font-bold text-gray-900">{vaNumber}</span>
                  <button onClick={() => copyToClipboard(vaNumber)} className="flex items-center gap-1 text-indigo-600 text-sm font-medium">
                    <Copy size={14} /> Salin
                  </button>
                </div>
              </div>
            )}

            {qrCode && (
              <div className="text-center mb-4">
                <img src={qrCode} alt="QR Code" className="w-48 h-48 mx-auto rounded-xl border border-gray-200" />
                <p className="text-sm text-gray-500 mt-2">Scan QR code dengan aplikasi pembayaran Anda</p>
              </div>
            )}

            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <div className="text-sm text-blue-800 font-medium mb-1">Cara Pembayaran:</div>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Buka aplikasi mobile banking atau e-wallet Anda</li>
                <li>Pilih menu Transfer / Bayar</li>
                <li>Masukkan nomor di atas atau scan QR</li>
                <li>Masukkan nominal: <strong>{fmt(amount)}</strong></li>
                <li>Konfirmasi pembayaran</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/login')}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Sudah Bayar? Login
              </button>
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
              >
                <ArrowLeft size={14} /> Ganti Metode
              </button>
            </div>
          </div>
        )}

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-8 text-xs text-gray-400">
          <div className="flex items-center gap-1"><Shield size={12} /> SSL Encrypted</div>
          <div className="flex items-center gap-1"><CheckCircle size={12} /> OJK Licensed</div>
          <div className="flex items-center gap-1"><Clock size={12} /> 24/7 Support</div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={40} className="text-indigo-600 animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

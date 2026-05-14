'use client';

import { AlertTriangle, XCircle, Clock, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { Subscription } from '@/types/subscription.types';

interface SubscriptionStatusBannerProps {
  subscription: Subscription | null;
}

export default function SubscriptionStatusBanner({ subscription }: SubscriptionStatusBannerProps) {
  if (!subscription) return null;

  const now = new Date();

  // ─── TRIAL BANNER ─────────────────────────────────────────────────────────
  if (subscription.status === 'trial') {
    const trialEnd = subscription.trialEnd ? new Date(subscription.trialEnd) : null;
    const daysRemaining = trialEnd
      ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const isExpiringSoon = daysRemaining <= 3;
    const isExpired = trialEnd ? now > trialEnd : false;

    if (isExpired) {
      return (
        <div style={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white' }}>
            <XCircle size={20} />
            <div>
              <span style={{ fontWeight: 600 }}>Trial Anda telah berakhir.</span>
              {' '}
              <span style={{ opacity: 0.9 }}>Upgrade sekarang untuk melanjutkan menggunakan MonetraPOS.</span>
            </div>
          </div>
          <Link
            href="/dashboard/subscription"
            style={{
              background: 'white',
              color: '#dc2626',
              padding: '0.5rem 1.25rem',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Upgrade Sekarang →
          </Link>
        </div>
      );
    }

    return (
      <div style={{
        background: isExpiringSoon
          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
          : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        padding: '0.875rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white' }}>
          {isExpiringSoon ? <Clock size={20} /> : <Sparkles size={20} />}
          <div>
            <span style={{ fontWeight: 600 }}>
              {isExpiringSoon
                ? `⚠️ ${daysRemaining} hari lagi trial berakhir!`
                : `🎉 Trial aktif — ${daysRemaining} hari tersisa`}
            </span>
            {' '}
            <span style={{ opacity: 0.9, fontSize: '0.875rem' }}>
              {isExpiringSoon
                ? 'Upgrade sekarang agar tidak kehilangan akses.'
                : 'Nikmati semua fitur trial. Upgrade untuk akses penuh & tidak terbatas.'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <Link
            href="/dashboard/subscription"
            style={{
              background: 'white',
              color: isExpiringSoon ? '#d97706' : '#6366f1',
              padding: '0.5rem 1.25rem',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Zap size={16} />
            Upgrade Sekarang
          </Link>
        </div>
      </div>
    );
  }

  // ─── EXISTING BANNERS ─────────────────────────────────────────────────────
  if (!subscription.endDate) return null;

  const endDate = new Date(subscription.endDate);
  const gracePeriodEndDate = subscription.gracePeriodEndDate
    ? new Date(subscription.gracePeriodEndDate)
    : null;

  const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const gracePeriodDaysRemaining = gracePeriodEndDate
    ? Math.ceil((gracePeriodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Expiring Soon (7 days before expiry)
  if (subscription.status === 'active' && daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">Subscription Akan Berakhir</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Subscription Anda akan berakhir dalam{' '}
                <strong>{daysUntilExpiry} hari</strong> pada{' '}
                <strong>{endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
              </p>
              <p className="mt-1">Perpanjang sekarang agar tidak terganggu.</p>
            </div>
            <div className="mt-4">
              <Link
                href="/dashboard/subscription"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200"
              >
                Perpanjang Subscription
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grace Period
  if (subscription.status === 'expired' && gracePeriodDaysRemaining > 0) {
    return (
      <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
        <div className="flex items-start">
          <Clock className="h-5 w-5 text-orange-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-orange-800">Subscription Berakhir — Masa Tenggang Aktif</h3>
            <div className="mt-2 text-sm text-orange-700">
              <p>Subscription Anda berakhir pada <strong>{endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>
              <p className="mt-1"><strong>Masa tenggang: {gracePeriodDaysRemaining} hari tersisa</strong></p>
              <p className="mt-1">Anda hanya bisa melihat data (read-only). Perpanjang untuk memulihkan akses penuh.</p>
            </div>
            <div className="mt-4">
              <Link href="/dashboard/subscription" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
                Perpanjang Sekarang
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Suspended
  if (subscription.status === 'suspended') {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex items-start">
          <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">Akun Disuspend</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Akun Anda disuspend karena subscription berakhir.</p>
              <p className="mt-1">Data Anda aman. Perpanjang subscription untuk memulihkan akses.</p>
            </div>
            <div className="mt-4">
              <Link href="/dashboard/subscription" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                Aktifkan Kembali
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

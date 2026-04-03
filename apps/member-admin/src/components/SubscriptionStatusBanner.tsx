'use client';

import { AlertTriangle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { Subscription } from '@/types/subscription.types';

interface SubscriptionStatusBannerProps {
  subscription: Subscription | null;
}

export default function SubscriptionStatusBanner({ subscription }: SubscriptionStatusBannerProps) {
  if (!subscription) return null;

  const now = new Date();
  const endDate = new Date(subscription.endDate);
  const gracePeriodEndDate = subscription.gracePeriodEndDate 
    ? new Date(subscription.gracePeriodEndDate) 
    : null;

  // Calculate days until expiry or days remaining in grace period
  const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const gracePeriodDaysRemaining = gracePeriodEndDate 
    ? Math.ceil((gracePeriodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Expiring Soon Banner (7 days before expiry, status is still active)
  if (subscription.status === 'active' && daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Subscription Expiring Soon
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Your subscription will expire in <strong>{daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}</strong> on{' '}
                <strong>{endDate.toLocaleDateString('id-ID', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}</strong>.
              </p>
              <p className="mt-1">
                Renew now to continue using MonetRAPOS without interruption.
              </p>
            </div>
            <div className="mt-4">
              <Link
                href="/dashboard/subscription/renew"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Renew Subscription
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expired Banner with Grace Period Countdown (status is expired, within grace period)
  if (subscription.status === 'expired' && gracePeriodDaysRemaining > 0) {
    return (
      <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
        <div className="flex items-start">
          <Clock className="h-5 w-5 text-orange-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-orange-800">
              Subscription Expired - Grace Period Active
            </h3>
            <div className="mt-2 text-sm text-orange-700">
              <p>
                Your subscription expired on{' '}
                <strong>{endDate.toLocaleDateString('id-ID', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}</strong>.
              </p>
              <p className="mt-1">
                <strong>Grace period: {gracePeriodDaysRemaining} day{gracePeriodDaysRemaining !== 1 ? 's' : ''} remaining</strong>
              </p>
              <p className="mt-1">
                You currently have read-only access. Renew now to restore full functionality.
              </p>
            </div>
            <div className="mt-4">
              <Link
                href="/dashboard/subscription/renew"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Renew Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Suspended Banner with Renewal Link (status is suspended)
  if (subscription.status === 'suspended') {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex items-start">
          <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Account Suspended
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                Your account has been suspended due to expired subscription.
              </p>
              <p className="mt-1">
                Your data is safe and preserved. Renew your subscription to reactivate your account and restore full access.
              </p>
            </div>
            <div className="mt-4">
              <Link
                href="/dashboard/subscription/renew"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Reactivate Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

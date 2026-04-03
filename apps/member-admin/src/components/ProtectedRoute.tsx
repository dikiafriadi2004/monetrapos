'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, subscription } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Show subscription warning banner if needed
  const showSubscriptionBanner =
    subscription &&
    (subscription.status === 'suspended' ||
      subscription.status === 'expired' ||
      subscription.status === 'past_due');

  return (
    <>
      {showSubscriptionBanner && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between flex-wrap">
              <div className="flex-1 flex items-center">
                <span className="flex p-2 rounded-lg bg-yellow-100">
                  <svg
                    className="h-5 w-5 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </span>
                <p className="ml-3 font-medium text-yellow-800">
                  {subscription.status === 'suspended' && (
                    <>Your subscription is suspended. Please renew to continue using the service.</>
                  )}
                  {subscription.status === 'expired' && (
                    <>Your subscription has expired. Please renew to continue using the service.</>
                  )}
                  {subscription.status === 'past_due' && (
                    <>Your payment is past due. Please update your payment to avoid service interruption.</>
                  )}
                </p>
              </div>
              <div className="mt-2 flex-shrink-0 sm:mt-0 sm:ml-3">
                <a
                  href="/dashboard/subscription"
                  className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-yellow-800 bg-yellow-100 hover:bg-yellow-200"
                >
                  Renew Now
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}

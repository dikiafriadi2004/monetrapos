'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [message, setMessage] = useState('Processing your payment...');

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    const statusCode = searchParams.get('status_code');
    const transactionStatus = searchParams.get('transaction_status');

    console.log('Payment callback:', { orderId, statusCode, transactionStatus });

    // Handle different payment statuses
    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      setStatus('success');
      setMessage('Payment successful! Your account has been activated.');
      setTimeout(() => {
        router.push('/login?registered=true');
      }, 3000);
    } else if (transactionStatus === 'pending') {
      setStatus('pending');
      setMessage('Payment is being processed. Please wait for confirmation.');
      setTimeout(() => {
        router.push('/login?payment=pending');
      }, 5000);
    } else if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire') {
      setStatus('failed');
      setMessage('Payment failed or was cancelled. Please try again.');
    } else {
      setStatus('pending');
      setMessage('Payment status is being verified. You will receive an email confirmation.');
      setTimeout(() => {
        router.push('/login');
      }, 5000);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Loading State */}
        {status === 'loading' && (
          <div>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h1>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                ✓ Your account has been activated<br />
                ✓ Welcome email has been sent<br />
                ✓ You can now login to your dashboard
              </p>
            </div>
            <p className="text-sm text-gray-500">Redirecting to login page...</p>
          </div>
        )}

        {/* Pending State */}
        {status === 'pending' && (
          <div>
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-yellow-600 mb-2">Payment Pending</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                Your payment is being processed. This may take a few minutes.<br />
                You will receive an email confirmation once the payment is verified.
              </p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Failed State */}
        {status === 'failed' && (
          <div>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                Your payment could not be processed. This could be due to:<br />
                • Insufficient funds<br />
                • Payment was cancelled<br />
                • Card declined<br />
                • Payment expired
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/register')}
                className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/login')}
                className="w-full px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

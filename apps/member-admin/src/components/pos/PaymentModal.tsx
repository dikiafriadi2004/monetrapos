'use client';

import { useState } from 'react';
import { X, CreditCard, Smartphone, Building2, Wallet } from 'lucide-react';
import { PaymentMethodType } from '@/types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (paymentMethod: PaymentMethodType, paidAmount: number) => void;
}

const paymentMethods = [
  { type: PaymentMethodType.CASH, label: 'Cash', icon: Wallet },
  { type: PaymentMethodType.QRIS, label: 'QRIS', icon: Smartphone },
  { type: PaymentMethodType.EDC, label: 'EDC/Debit', icon: CreditCard },
  { type: PaymentMethodType.BANK_TRANSFER, label: 'Bank Transfer', icon: Building2 },
  { type: PaymentMethodType.EWALLET, label: 'E-Wallet', icon: Smartphone },
];

export default function PaymentModal({ isOpen, onClose, total, onConfirm }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>(PaymentMethodType.CASH);
  const [paidAmount, setPaidAmount] = useState<string>(total.toString());
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const paid = parseFloat(paidAmount) || 0;
  const change = paid - total;

  const handleConfirm = async () => {
    if (paid < total) {
      alert('Paid amount must be greater than or equal to total');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(selectedMethod, paid);
      onClose();
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [
    total,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 50000) * 50000,
    Math.ceil(total / 100000) * 100000,
  ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Total */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Amount</div>
            <div className="text-3xl font-bold text-blue-600">
              Rp {total.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Method
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.type}
                    onClick={() => setSelectedMethod(method.type)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedMethod === method.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon
                      size={24}
                      className={`mx-auto mb-2 ${
                        selectedMethod === method.type ? 'text-blue-500' : 'text-gray-400'
                      }`}
                    />
                    <div className="text-sm font-medium text-gray-900">
                      {method.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid Amount (for Cash only) */}
          {selectedMethod === PaymentMethodType.CASH && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paid Amount
              </label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter paid amount"
              />

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setPaidAmount(amount.toString())}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    {amount.toLocaleString('id-ID')}
                  </button>
                ))}
              </div>

              {/* Change */}
              {paid >= total && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Change</div>
                  <div className="text-2xl font-bold text-green-600">
                    Rp {change.toLocaleString('id-ID')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || (selectedMethod === PaymentMethodType.CASH && paid < total)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

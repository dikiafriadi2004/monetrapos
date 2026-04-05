'use client';

import { useState } from 'react';
import { X, CreditCard, Smartphone, Building2, Wallet, QrCode } from 'lucide-react';
import { PaymentMethod, PaymentMethodType as PMType } from '@/types/payment-method.types';
import toast from 'react-hot-toast';

type PaymentMethodType = 'cash' | 'card' | 'transfer' | 'qris';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  paymentMethods?: PaymentMethod[];
  onConfirm: (paymentMethod: PaymentMethodType, paidAmount: number) => void;
}

// Default fallback payment methods
const defaultPaymentMethods = [
  { type: 'cash' as const, label: 'Cash', icon: Wallet },
  { type: 'qris' as const, label: 'QRIS', icon: Smartphone },
  { type: 'card' as const, label: 'EDC/Debit', icon: CreditCard },
  { type: 'transfer' as const, label: 'Bank Transfer', icon: Building2 },
];

const getIconForType = (type: string) => {
  switch (type) {
    case PMType.CASH:
      return Wallet;
    case PMType.CARD:
      return CreditCard;
    case PMType.EWALLET:
      return Smartphone;
    case PMType.BANK_TRANSFER:
      return Building2;
    case PMType.QRIS:
      return QrCode;
    default:
      return CreditCard;
  }
};

const mapToLegacyType = (type: string): PaymentMethodType => {
  switch (type) {
    case PMType.CASH:
      return 'cash';
    case PMType.CARD:
      return 'card';
    case PMType.BANK_TRANSFER:
      return 'transfer';
    case PMType.QRIS:
      return 'qris';
    default:
      return 'cash';
  }
};

export default function PaymentModal({ isOpen, onClose, total, paymentMethods, onConfirm }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('cash');
  const [paidAmount, setPaidAmount] = useState<string>(total.toString());
  const [loading, setLoading] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');

  if (!isOpen) return null;

  // Use API payment methods if available, otherwise use defaults
  const methods = paymentMethods && paymentMethods.length > 0
    ? paymentMethods.map(m => ({
        id: m.id,
        type: mapToLegacyType(m.type),
        label: m.name,
        icon: getIconForType(m.type),
        color: m.color,
        iconUrl: m.iconUrl,
        requiresReference: m.requiresReference,
      }))
    : defaultPaymentMethods.map(m => ({
        ...m,
        color: undefined, // Default methods don't have custom colors
        iconUrl: undefined, // Default methods don't have custom icons
        requiresReference: false, // Default methods don't require reference
      }));

  const paid = parseFloat(paidAmount) || 0;
  const change = paid - total;

  const selectedMethodData = methods.find(m => m.type === selectedMethod);
  const requiresReference = selectedMethodData?.requiresReference ?? false;

  const handleConfirm = async () => {
    if (selectedMethod === 'cash' && paid < total) {
      toast.error('Paid amount must be greater than or equal to total');
      return;
    }

    if (requiresReference && !referenceNumber.trim()) {
      toast.error('Please enter a reference number');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(selectedMethod, selectedMethod === 'cash' ? paid : total);
      onClose();
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed. Please try again.');
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
              {methods.map((method) => {
                const Icon = method.icon;
                const bgColor = method.color || '#3b82f6';
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
                    {method.iconUrl ? (
                      <img 
                        src={method.iconUrl} 
                        alt={method.label}
                        className="w-6 h-6 mx-auto mb-2"
                      />
                    ) : (
                      <Icon
                        size={24}
                        className={`mx-auto mb-2 ${
                          selectedMethod === method.type ? 'text-blue-500' : 'text-gray-400'
                        }`}
                      />
                    )}
                    <div className="text-sm font-medium text-gray-900">
                      {method.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid Amount (for Cash only) */}
          {selectedMethod === 'cash' && (
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

          {/* Reference Number (for methods that require it) */}
          {requiresReference && selectedMethod !== 'cash' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number *
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter reference/transaction number"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the card approval code, transfer reference, or transaction ID
              </p>
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
            disabled={loading || (selectedMethod === 'cash' && paid < total)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

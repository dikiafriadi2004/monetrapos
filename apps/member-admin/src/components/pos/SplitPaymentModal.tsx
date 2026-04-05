'use client';

import { useState } from 'react';
import { X, CreditCard, Smartphone, Building2, Wallet, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

type PaymentMethodType = 'cash' | 'card' | 'transfer' | 'qris';

interface PaymentSplit {
  id: string;
  method: PaymentMethodType;
  amount: number;
}

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (payments: PaymentSplit[]) => void;
}

const paymentMethods = [
  { type: 'cash' as const, label: 'Cash', icon: Wallet },
  { type: 'qris' as const, label: 'QRIS', icon: Smartphone },
  { type: 'card' as const, label: 'EDC/Debit', icon: CreditCard },
  { type: 'transfer' as const, label: 'Bank Transfer', icon: Building2 },
];

export default function SplitPaymentModal({ isOpen, onClose, total, onConfirm }: SplitPaymentModalProps) {
  const [payments, setPayments] = useState<PaymentSplit[]>([
    { id: '1', method: 'cash', amount: 0 },
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = total - totalPaid;

  const handleAddPayment = () => {
    setPayments([
      ...payments,
      { id: Date.now().toString(), method: 'cash', amount: 0 },
    ]);
  };

  const handleRemovePayment = (id: string) => {
    if (payments.length > 1) {
      setPayments(payments.filter((p) => p.id !== id));
    }
  };

  const handleUpdatePayment = (id: string, field: 'method' | 'amount', value: any) => {
    setPayments(
      payments.map((p) =>
        p.id === id ? { ...p, [field]: field === 'amount' ? parseFloat(value) || 0 : value } : p
      )
    );
  };

  const handleConfirm = async () => {
    if (totalPaid < total) {
      toast.error('Total paid amount must equal or exceed the total');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(payments);
      onClose();
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Split Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Total */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Amount</div>
            <div className="text-3xl font-bold text-blue-600">
              Rp {total.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Payment Splits */}
          <div className="space-y-4">
            {payments.map((payment, index) => (
              <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-700">
                    Payment {index + 1}
                  </div>
                  {payments.length > 1 && (
                    <button
                      onClick={() => handleRemovePayment(payment.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                {/* Payment Method Selection */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.type}
                        onClick={() => handleUpdatePayment(payment.id, 'method', method.type)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          payment.method === method.type
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon
                          size={20}
                          className={`mx-auto mb-1 ${
                            payment.method === method.type ? 'text-blue-500' : 'text-gray-400'
                          }`}
                        />
                        <div className="text-xs font-medium text-gray-900">
                          {method.label}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={payment.amount || ''}
                    onChange={(e) => handleUpdatePayment(payment.id, 'amount', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter amount"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add Payment Button */}
          <button
            onClick={handleAddPayment}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2 text-gray-600"
          >
            <Plus size={20} />
            <span>Add Another Payment Method</span>
          </button>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Amount</span>
              <span className="font-medium">Rp {total.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Paid</span>
              <span className={`font-medium ${totalPaid >= total ? 'text-green-600' : 'text-red-600'}`}>
                Rp {totalPaid.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
              <span>Remaining</span>
              <span className={remaining > 0 ? 'text-red-600' : 'text-green-600'}>
                Rp {Math.abs(remaining).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
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
            disabled={loading || totalPaid < total}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

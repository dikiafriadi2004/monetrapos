'use client';

import { useState } from 'react';
import { X, Percent, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  onApply: (discountAmount: number, discountType: 'percentage' | 'fixed', discountValue: number) => void;
}

export default function DiscountModal({ isOpen, onClose, subtotal, onApply }: DiscountModalProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('');

  if (!isOpen) return null;

  const calculateDiscount = () => {
    const value = parseFloat(discountValue) || 0;
    if (discountType === 'percentage') {
      return (subtotal * value) / 100;
    }
    return value;
  };

  const discountAmount = calculateDiscount();
  const finalTotal = subtotal - discountAmount;

  const handleApply = () => {
    const value = parseFloat(discountValue) || 0;
    if (value <= 0) {
      toast.error('Please enter a valid discount value');
      return;
    }

    if (discountType === 'percentage' && value > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }

    if (discountType === 'fixed' && value > subtotal) {
      toast.error('Fixed discount cannot exceed subtotal');
      return;
    }

    onApply(discountAmount, discountType, value);
    onClose();
    setDiscountValue('');
  };

  const quickDiscounts = [5, 10, 15, 20];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Apply Discount</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Subtotal */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Subtotal</div>
            <div className="text-2xl font-bold text-gray-900">
              Rp {subtotal.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Discount Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Discount Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDiscountType('percentage')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  discountType === 'percentage'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Percent
                  size={24}
                  className={`mx-auto mb-2 ${
                    discountType === 'percentage' ? 'text-blue-500' : 'text-gray-400'
                  }`}
                />
                <div className="text-sm font-medium text-gray-900">Percentage</div>
              </button>
              <button
                onClick={() => setDiscountType('fixed')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  discountType === 'fixed'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <DollarSign
                  size={24}
                  className={`mx-auto mb-2 ${
                    discountType === 'fixed' ? 'text-blue-500' : 'text-gray-400'
                  }`}
                />
                <div className="text-sm font-medium text-gray-900">Fixed Amount</div>
              </button>
            </div>
          </div>

          {/* Discount Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (Rp)'}
            </label>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={discountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
            />

            {/* Quick Percentage Buttons */}
            {discountType === 'percentage' && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {quickDiscounts.map((percent) => (
                  <button
                    key={percent}
                    onClick={() => setDiscountValue(percent.toString())}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    {percent}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {discountValue && parseFloat(discountValue) > 0 && (
            <div className="space-y-2 p-4 bg-green-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount Amount</span>
                <span className="font-medium text-green-600">
                  -Rp {discountAmount.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-green-200 pt-2">
                <span>Final Total</span>
                <span className="text-green-600">
                  Rp {finalTotal.toLocaleString('id-ID')}
                </span>
              </div>
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
            onClick={handleApply}
            disabled={!discountValue || parseFloat(discountValue) <= 0}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Discount
          </button>
        </div>
      </div>
    </div>
  );
}

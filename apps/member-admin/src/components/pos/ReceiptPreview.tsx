'use client';

import { X, Printer, Mail } from 'lucide-react';
import { Transaction, CartItem } from '@/types';

interface ReceiptPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: {
    transactionNumber: string;
    items: CartItem[];
    subtotal: number;
    tax: number;
    taxRate?: number;
    taxLabel?: string;
    discount: number;
    total: number;
    paidAmount: number;
    changeAmount: number;
    paymentMethod: string;
    customerName?: string;
    employeeName?: string;
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    storeLogo?: string;
    headerText?: string;
    footerText?: string;
    showTaxNumber?: boolean;
    taxNumber?: string;
  };
  onPrint?: () => void;
  onEmail?: () => void;
}

export default function ReceiptPreview({
  isOpen,
  onClose,
  transaction,
  onPrint,
  onEmail,
}: ReceiptPreviewProps) {
  if (!isOpen || !transaction) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Receipt Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6 font-mono text-sm">
            {/* Store Info */}
            <div className="text-center mb-4">
              {transaction.storeLogo && (
                <img
                  src={transaction.storeLogo}
                  alt="Logo"
                  className="mx-auto mb-2"
                  crossOrigin="anonymous"
                  style={{ maxHeight: 60, maxWidth: 160, objectFit: 'contain' }}
                  onError={e => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                  }}
                />
              )}
              {transaction.headerText && (
                <div className="text-xs text-gray-500 mb-2 whitespace-pre-line">{transaction.headerText}</div>
              )}
              <div className="font-bold text-lg">{transaction.storeName || ''}</div>
              {transaction.storeAddress && <div className="text-xs text-gray-600">{transaction.storeAddress}</div>}
              {transaction.storePhone && <div className="text-xs text-gray-600">{transaction.storePhone}</div>}
              {transaction.showTaxNumber && transaction.taxNumber && (
                <div className="text-xs text-gray-500">NPWP: {transaction.taxNumber}</div>
              )}
            </div>

            <div className="border-t border-dashed border-gray-300 my-3"></div>

            {/* Transaction Info */}
            <div className="text-xs space-y-1 mb-3">
              <div className="flex justify-between">
                <span>Invoice:</span>
                <span className="font-semibold">{transaction.transactionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{formatDate(new Date())}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{transaction.employeeName || 'Cashier'}</span>
              </div>
              {transaction.customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{transaction.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="uppercase">{transaction.paymentMethod}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 my-3"></div>

            {/* Items */}
            <div className="space-y-2 mb-3">
              {(transaction.items || []).map((item, index) => {
                const name = item.product?.name || (item as any).productName || 'Item';
                const price = item.price ?? (item as any).unitPrice ?? 0;
                const subtotal = item.subtotal ?? 0;
                const qty = item.quantity ?? 1;
                const variant = item.variantName || (item as any).variant;
                return (
                  <div key={index} className="text-xs">
                    <div className="font-medium">{name}{variant ? ` (${variant})` : ''}</div>
                    <div className="flex justify-between text-gray-600">
                      <span>{qty} x {formatCurrency(price)}</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-gray-300 my-3"></div>

            {/* Summary */}
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(transaction.subtotal)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(transaction.discount)}</span>
                </div>
              )}
              {transaction.tax > 0 && (
                <div className="flex justify-between">
                  <span>{transaction.taxLabel || 'Tax'}{transaction.taxRate != null ? ` (${transaction.taxRate}%)` : ''}:</span>
                  <span>{formatCurrency(transaction.tax)}</span>
                </div>
              )}
              <div className="border-t border-gray-300 my-2"></div>
              <div className="flex justify-between font-bold text-base">
                <span>TOTAL:</span>
                <span>{formatCurrency(transaction.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid:</span>
                <span>{formatCurrency(transaction.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Change:</span>
                <span>{formatCurrency(transaction.changeAmount)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 my-3"></div>

            {/* Footer */}
            <div className="text-center text-xs space-y-1">
              {transaction.footerText ? (
                <div className="text-gray-600 whitespace-pre-line">{transaction.footerText}</div>
              ) : (
                <>
                  <div className="font-semibold">Thank You!</div>
                  <div className="text-gray-600">Please Come Again</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg space-y-2 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {onPrint && (
              <button
                onClick={onPrint}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                <Printer size={20} />
                <span>Print</span>
              </button>
            )}
            {onEmail && (
              <button
                onClick={onEmail}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                <Mail size={20} />
                <span>Email</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

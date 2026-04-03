'use client';

import { Trash2, Plus, Minus, Tag } from 'lucide-react';
import { CartItem } from '@/types';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onItemDiscount?: (index: number) => void;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export default function Cart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onItemDiscount,
  subtotal,
  tax,
  discount,
  total,
}: CartProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-lg">Cart is empty</p>
              <p className="text-sm">Add products to start</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="bg-white p-3 rounded-lg border border-gray-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.product.name}</div>
                    <div className="text-sm text-gray-500">
                      Rp {item.price.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {onItemDiscount && (
                      <button
                        onClick={() => onItemDiscount(index)}
                        className="text-green-500 hover:text-green-700 p-1"
                        title="Apply item discount"
                      >
                        <Tag size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveItem(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-12 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="font-semibold text-gray-900">
                    Rp {item.subtotal.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">Rp {subtotal.toLocaleString('id-ID')}</span>
        </div>
        {tax > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span className="font-medium">Rp {tax.toLocaleString('id-ID')}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span className="font-medium">-Rp {discount.toLocaleString('id-ID')}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
          <span>Total</span>
          <span>Rp {total.toLocaleString('id-ID')}</span>
        </div>
      </div>
    </div>
  );
}

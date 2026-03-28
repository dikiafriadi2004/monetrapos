'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Receipt, AlertCircle, Scan, Tag } from 'lucide-react';
import ProductSearch from '@/components/pos/ProductSearch';
import Cart from '@/components/pos/Cart';
import CustomerSelect from '@/components/pos/CustomerSelect';
import PaymentModal from '@/components/pos/PaymentModal';
import DiscountModal from '@/components/pos/DiscountModal';
import BarcodeScanner from '@/components/pos/BarcodeScanner';
import { Product, Customer, CartItem, PaymentMethodType } from '@/types';
import { transactionService } from '@/services/transaction.service';
import { shiftService } from '@/services/shift.service';
import { customerService } from '@/services/customer.service';
import { useAuth } from '@/contexts/AuthContext';

export default function POSPage() {
  const { storeId, user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Tax and discount
  const taxRate = 0.11; // 11% PPN
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountInfo, setDiscountInfo] = useState<{
    type: 'percentage' | 'fixed';
    value: number;
  } | null>(null);

  useEffect(() => {
    if (storeId) {
      checkActiveShift(storeId);
    }

    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      // F2 - Barcode Scanner
      if (e.key === 'F2') {
        e.preventDefault();
        setIsBarcodeScannerOpen(true);
      }
      // F3 - Discount
      if (e.key === 'F3') {
        e.preventDefault();
        if (cartItems.length > 0) {
          setIsDiscountModalOpen(true);
        }
      }
      // F4 - Customer
      if (e.key === 'F4') {
        e.preventDefault();
        // Open customer select (implement in CustomerSelect component)
      }
      // F12 - Checkout
      if (e.key === 'F12') {
        e.preventDefault();
        if (cartItems.length > 0) {
          setIsPaymentModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cartItems, storeId]);

  const checkActiveShift = async (storeId: string) => {
    try {
      const shift = await shiftService.getActiveShift(storeId);
      setActiveShift(shift);
      if (!shift) {
        alert('No active shift. Please open a shift first.');
      }
    } catch (error) {
      console.error('Failed to check active shift:', error);
    }
  };

  const handleAddProduct = (product: Product) => {
    const existingIndex = cartItems.findIndex(
      (item) => item.product.id === product.id
    );

    if (existingIndex >= 0) {
      // Update quantity
      const newItems = [...cartItems];
      const newQuantity = newItems[existingIndex].quantity + 1;
      
      if (newQuantity > product.stock) {
        alert(`Insufficient stock. Available: ${product.stock}`);
        return;
      }

      newItems[existingIndex].quantity = newQuantity;
      newItems[existingIndex].subtotal = newQuantity * product.price;
      setCartItems(newItems);
    } else {
      // Add new item
      if (product.stock < 1) {
        alert('Product out of stock');
        return;
      }

      setCartItems([
        ...cartItems,
        {
          product,
          quantity: 1,
          price: product.price,
          subtotal: product.price,
        },
      ]);
    }
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;

    const newItems = [...cartItems];
    const item = newItems[index];

    if (quantity > item.product.stock) {
      alert(`Insufficient stock. Available: ${item.product.stock}`);
      return;
    }

    item.quantity = quantity;
    item.subtotal = quantity * item.price;
    setCartItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleApplyDiscount = (amount: number, type: 'percentage' | 'fixed', value: number) => {
    setDiscountAmount(amount);
    setDiscountInfo({ type, value });
  };

  const handleRemoveDiscount = () => {
    setDiscountAmount(0);
    setDiscountInfo(null);
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax - discountAmount;

    return { subtotal, tax, total };
  };

  const handlePayment = async (paymentMethod: PaymentMethodType, paidAmount: number) => {
    if (!activeShift) {
      alert('No active shift. Please open a shift first.');
      return;
    }

    if (cartItems.length === 0) {
      alert('Cart is empty');
      return;
    }

    setLoading(true);

    try {
      const { subtotal, tax, total } = calculateTotals();
      const changeAmount = paidAmount - total;

      // Create transaction
      const transaction = await transactionService.createTransaction({
        storeId: storeId!,
        paymentMethod,
        subtotal,
        taxAmount: tax,
        discountAmount,
        total,
        paidAmount,
        changeAmount,
        customerName: selectedCustomer?.name,
        customerId: selectedCustomer?.id,
        employeeId: user?.id,
        employeeName: user?.name,
        items: cartItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        })),
      });

      // Add loyalty points if customer selected
      if (selectedCustomer) {
        const points = Math.floor(total / 10000); // 1 point per 10k
        if (points > 0) {
          await customerService.addPoints(
            selectedCustomer.id,
            points,
            'Purchase reward',
            transaction.id
          );
        }
      }

      // Success
      alert(`Transaction successful!\nInvoice: ${transaction.invoiceNumber}\nChange: Rp ${changeAmount.toLocaleString('id-ID')}`);

      // Reset cart
      setCartItems([]);
      setSelectedCustomer(null);
      setDiscountAmount(0);
      setDiscountInfo(null);
      setIsPaymentModalOpen(false);

      // TODO: Print receipt
    } catch (error: any) {
      console.error('Transaction failed:', error);
      alert(error.response?.data?.message || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  if (!storeId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!activeShift) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <p className="text-gray-900 font-semibold mb-2">No Active Shift</p>
          <p className="text-gray-600 mb-4">Please open a shift to start selling</p>
          <button
            onClick={() => (window.location.href = '/dashboard/shifts')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Shifts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShoppingCart size={24} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">POS Terminal</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Shift: <span className="font-medium text-gray-900">#{activeShift.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Product Search & Selection */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Product Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Product
              </label>
              <ProductSearch storeId={storeId} onSelectProduct={handleAddProduct} />
            </div>

            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer (Optional)
              </label>
              <CustomerSelect
                storeId={storeId}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
              />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setIsBarcodeScannerOpen(true)}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <Scan size={24} className="mx-auto mb-2 text-gray-600" />
                <div className="text-sm font-medium text-gray-700">Scan Barcode</div>
                <div className="text-xs text-gray-500 mt-1">Press F2</div>
              </button>
              <button
                onClick={() => cartItems.length > 0 && setIsDiscountModalOpen(true)}
                disabled={cartItems.length === 0}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Tag size={24} className="mx-auto mb-2 text-gray-600" />
                <div className="text-sm font-medium text-gray-700">Apply Discount</div>
                <div className="text-xs text-gray-500 mt-1">Press F3</div>
              </button>
            </div>

            {/* Discount Info */}
            {discountInfo && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-green-900">
                      Discount Applied: {discountInfo.type === 'percentage' ? `${discountInfo.value}%` : `Rp ${discountInfo.value.toLocaleString('id-ID')}`}
                    </div>
                    <div className="text-xs text-green-700 mt-1">
                      Discount Amount: Rp {discountAmount.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveDiscount}
                    className="text-green-600 hover:text-green-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Cart & Checkout */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          <div className="flex-1 p-6 overflow-hidden flex flex-col">
            <Cart
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              subtotal={subtotal}
              tax={tax}
              discount={discountAmount}
              total={total}
            />
          </div>

          {/* Checkout Button */}
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={cartItems.length === 0 || loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Receipt size={24} />
              <span>Checkout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        total={total}
        onConfirm={handlePayment}
      />

      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        subtotal={subtotal}
        onApply={handleApplyDiscount}
      />

      <BarcodeScanner
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        storeId={storeId}
        onProductFound={handleAddProduct}
      />
    </div>
  );
}

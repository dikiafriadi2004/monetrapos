'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Receipt, AlertCircle, Scan, Tag, CreditCard } from 'lucide-react';
import ProductSearch from '@/components/pos/ProductSearch';
import Cart from '@/components/pos/Cart';
import CustomerSelect from '@/components/pos/CustomerSelect';
import PaymentModal from '@/components/pos/PaymentModal';
import SplitPaymentModal from '@/components/pos/SplitPaymentModal';
import DiscountModal from '@/components/pos/DiscountModal';
import ItemDiscountModal from '@/components/pos/ItemDiscountModal';
import BarcodeScanner from '@/components/pos/BarcodeScanner';
import ReceiptPreview from '@/components/pos/ReceiptPreview';
import { Product, Customer, CartItem, PaymentMethodType } from '@/types';
import { transactionService } from '@/services/transaction.service';
import { shiftService } from '@/services/shift.service';
import { customerService } from '@/services/customer.service';
import { paymentMethodService } from '@/services/payment-method.service';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentMethod } from '@/types/payment-method.types';

export default function POSPage() {
  const { company, user } = useAuth();
  const storeId = company?.id; // Use company ID as store ID
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSplitPaymentModalOpen, setIsSplitPaymentModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isItemDiscountModalOpen, setIsItemDiscountModalOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [heldTransactions, setHeldTransactions] = useState<Array<{
    id: string;
    items: CartItem[];
    customer: Customer | null;
    discount: number;
    discountInfo: any;
    timestamp: Date;
  }>>([]);

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
      fetchPaymentMethods();
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
      // F5 - Hold Transaction
      if (e.key === 'F5') {
        e.preventDefault();
        if (cartItems.length > 0) {
          handleHoldTransaction();
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

  const fetchPaymentMethods = async () => {
    try {
      const methods = await paymentMethodService.getActive();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
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

  const handleItemDiscount = (index: number) => {
    setSelectedItemIndex(index);
    setIsItemDiscountModalOpen(true);
  };

  const handleApplyItemDiscount = (discountAmount: number, discountType: 'percentage' | 'fixed', discountValue: number) => {
    if (selectedItemIndex === null) return;

    const newItems = [...cartItems];
    const item = newItems[selectedItemIndex];
    const originalSubtotal = item.price * item.quantity;
    item.subtotal = originalSubtotal - discountAmount;
    setCartItems(newItems);
    setSelectedItemIndex(null);
  };

  const handleHoldTransaction = () => {
    if (cartItems.length === 0) {
      alert('Cart is empty');
      return;
    }

    const heldTransaction = {
      id: Date.now().toString(),
      items: [...cartItems],
      customer: selectedCustomer,
      discount: discountAmount,
      discountInfo,
      timestamp: new Date(),
    };

    setHeldTransactions([...heldTransactions, heldTransaction]);
    setCartItems([]);
    setSelectedCustomer(null);
    setDiscountAmount(0);
    setDiscountInfo(null);
    alert('Transaction held successfully');
  };

  const handleResumeTransaction = (heldTransaction: any) => {
    setCartItems(heldTransaction.items);
    setSelectedCustomer(heldTransaction.customer);
    setDiscountAmount(heldTransaction.discount);
    setDiscountInfo(heldTransaction.discountInfo);
    setHeldTransactions(heldTransactions.filter(t => t.id !== heldTransaction.id));
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
        employeeName: `${user?.firstName} ${user?.lastName}`,
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
      setLastTransaction({
        transactionNumber: transaction.transactionNumber,
        items: cartItems,
        subtotal,
        tax,
        discount: discountAmount,
        total,
        paidAmount,
        changeAmount,
        paymentMethod,
        customerName: selectedCustomer?.name,
        employeeName: `${user?.firstName} ${user?.lastName}`,
      });

      // Reset cart
      setCartItems([]);
      setSelectedCustomer(null);
      setDiscountAmount(0);
      setDiscountInfo(null);
      setIsPaymentModalOpen(false);

      // Show receipt preview
      setIsReceiptPreviewOpen(true);
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
            <div className="grid grid-cols-3 gap-4">
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
              <button
                onClick={handleHoldTransaction}
                disabled={cartItems.length === 0}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Receipt size={24} className="mx-auto mb-2 text-gray-600" />
                <div className="text-sm font-medium text-gray-700">Hold Transaction</div>
                <div className="text-xs text-gray-500 mt-1">Press F5</div>
              </button>
            </div>

            {/* Held Transactions */}
            {heldTransactions.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-sm font-medium text-yellow-900 mb-2">
                  Held Transactions ({heldTransactions.length})
                </div>
                <div className="space-y-2">
                  {heldTransactions.map((held) => (
                    <button
                      key={held.id}
                      onClick={() => handleResumeTransaction(held)}
                      className="w-full p-3 bg-white border border-yellow-200 rounded-lg hover:bg-yellow-50 transition-colors text-left"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {held.items.length} items
                            {held.customer && ` - ${held.customer.name}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(held.timestamp).toLocaleTimeString('id-ID')}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          Rp {held.items.reduce((sum, item) => sum + item.subtotal, 0).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
              onItemDiscount={handleItemDiscount}
              subtotal={subtotal}
              tax={tax}
              discount={discountAmount}
              total={total}
            />
          </div>

          {/* Checkout Button */}
          <div className="p-6 border-t border-gray-200 space-y-2">
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={cartItems.length === 0 || loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Receipt size={24} />
              <span>Checkout</span>
            </button>
            <button
              onClick={() => setIsSplitPaymentModalOpen(true)}
              disabled={cartItems.length === 0 || loading}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <CreditCard size={20} />
              <span>Split Payment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        total={total}
        paymentMethods={paymentMethods}
        onConfirm={handlePayment}
      />

      <SplitPaymentModal
        isOpen={isSplitPaymentModalOpen}
        onClose={() => setIsSplitPaymentModalOpen(false)}
        total={total}
        onConfirm={async (payments) => {
          // Handle split payment - use first payment method for now
          // In production, you'd send all payment methods to the API
          await handlePayment(payments[0].method, total);
        }}
      />

      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        subtotal={subtotal}
        onApply={handleApplyDiscount}
      />

      <ItemDiscountModal
        isOpen={isItemDiscountModalOpen}
        onClose={() => {
          setIsItemDiscountModalOpen(false);
          setSelectedItemIndex(null);
        }}
        itemName={selectedItemIndex !== null ? cartItems[selectedItemIndex]?.product.name : ''}
        itemPrice={selectedItemIndex !== null ? cartItems[selectedItemIndex]?.price : 0}
        itemQuantity={selectedItemIndex !== null ? cartItems[selectedItemIndex]?.quantity : 0}
        onApply={handleApplyItemDiscount}
      />

      <BarcodeScanner
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        storeId={storeId}
        onProductFound={handleAddProduct}
      />

      <ReceiptPreview
        isOpen={isReceiptPreviewOpen}
        onClose={() => setIsReceiptPreviewOpen(false)}
        transaction={lastTransaction}
        onPrint={() => {
          // TODO: Implement print functionality
          alert('Print functionality coming soon');
        }}
        onEmail={() => {
          // TODO: Implement email functionality
          alert('Email functionality coming soon');
        }}
      />
    </div>
  );
}

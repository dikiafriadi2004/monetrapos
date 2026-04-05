'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Receipt, AlertCircle, Scan, Tag, CreditCard, UtensilsCrossed } from 'lucide-react';
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
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';

const ORDER_TYPES = [
  { value: 'dine-in',  label: 'Dine-in',  emoji: '🪑' },
  { value: 'takeaway', label: 'Takeaway', emoji: '🥡' },
  { value: 'delivery', label: 'Delivery', emoji: '🛵' },
];

export default function POSPage() {
  const { company, user } = useAuth();
  const businessType = (company as any)?.businessType || 'retail';
  const isFnB = businessType === 'fnb';

  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [stores, setStores] = useState<any[]>([]);
  const storeId = selectedStoreId;
  const [orderType, setOrderType] = useState<string>('dine-in'); // untuk FnB
  const [selectedTableId, setSelectedTableId] = useState<string>(''); // untuk FnB dine-in
  const [tables, setTables] = useState<any[]>([]);
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

  // Tax and discount — fetched from company settings, fallback 11%
  const [taxRate, setTaxRate] = useState(0.11);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountInfo, setDiscountInfo] = useState<{
    type: 'percentage' | 'fixed';
    value: number;
  } | null>(null);

  useEffect(() => {
    // Load stores first
    import('@/services/stores.service').then(({ storesService }) => {
      storesService.getAll({ isActive: 'true' }).then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        setStores(list);
        if (list.length > 0 && !selectedStoreId) {
          setSelectedStoreId(list[0].id);
        }
      }).catch(console.error);
    });
  }, []);

  useEffect(() => {
    if (storeId) {
      setActiveShift(null); // reset shift saat store berubah
      checkActiveShift(storeId);
      fetchPaymentMethods();
      fetchTaxRate();
      if (isFnB) fetchTables(storeId);
    }
  }, [storeId]); // eslint-disable-line

  useEffect(() => {
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
  }, [cartItems]);

  const checkActiveShift = async (storeId: string) => {
    try {
      const shift = await shiftService.getActiveShift(storeId);
      setActiveShift(shift);
      if (!shift) {
        toast.error('No active shift. Please open a shift first.');
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

  const fetchTaxRate = async () => {
    try {
      const res = await apiClient.get('/companies/settings');
      const rate = res.data?.taxSettings?.defaultTaxRate;
      if (typeof rate === 'number' && rate >= 0) {
        setTaxRate(rate / 100); // API returns percentage (e.g. 11), convert to decimal
      }
    } catch {
      // silently fallback to default 11%
    }
  };

  const fetchTables = async (sid: string) => {
    try {
      const res = await apiClient.get('/fnb/tables', { params: { store_id: sid, status: 'available' } });
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setTables(list);
    } catch {
      setTables([]);
    }
  };

  const handleAddProduct = (product: Product, variant?: { id: string; name: string; priceAdjustment: number }) => {
    // Unique key: product + variant combo
    const itemKey = variant ? `${product.id}__${variant.id}` : product.id;
    const existingIndex = cartItems.findIndex(
      (item) => (item as any).itemKey === itemKey
    );

    if (existingIndex >= 0) {
      const newItems = [...cartItems];
      const newQuantity = newItems[existingIndex].quantity + 1;
      if (newQuantity > product.stock) {
        toast.error(`Stok tidak cukup. Tersedia: ${product.stock}`);
        return;
      }
      newItems[existingIndex].quantity = newQuantity;
      newItems[existingIndex].subtotal = newQuantity * product.price;
      setCartItems(newItems);
    } else {
      if (product.stock < 1) {
        toast.error('Stok habis');
        return;
      }
      setCartItems([
        ...cartItems,
        {
          product,
          quantity: 1,
          price: product.price,
          subtotal: product.price,
          variantName: variant?.name,
          variantId: variant?.id,
          itemKey,
        } as any,
      ]);
    }
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;

    const newItems = [...cartItems];
    const item = newItems[index];

    if (quantity > item.product.stock) {
      toast.error(`Insufficient stock. Available: ${item.product.stock}`);
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
      toast.error('Cart is empty');
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
    toast.success('Transaction held successfully');
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
      toast.error('No active shift. Please open a shift first.');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Cart is empty');
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
        shiftId: activeShift?.id,
        ...(isFnB && { orderType }),
        ...(isFnB && orderType === 'dine-in' && selectedTableId && { tableId: selectedTableId }),
        items: cartItems.map((item: any) => ({
          productId: item.product.id,
          productName: item.product.name,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: item.subtotal,
          discountAmount: 0,
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
      toast.error(error.response?.data?.message || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  if (!storeId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 16px', color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!activeShift) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 16px', color: 'var(--danger)' }} />
          <p style={{ fontWeight: 600, marginBottom: 8 }}>No Active Shift</p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Please open a shift to start selling</p>
          <button onClick={() => (window.location.href = '/dashboard/shifts')} className="btn btn-primary">
            Go to Shifts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '12px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShoppingCart size={24} style={{ color: 'var(--accent-base)' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>POS Terminal</h1>
            {stores.length > 1 && (
              <select
                value={selectedStoreId}
                onChange={e => { setSelectedStoreId(e.target.value); setActiveShift(null); }}
                style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', fontSize: '0.875rem' }}
              >
                {stores.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {/* Order Type Selector - hanya untuk FnB */}
            {isFnB && (
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 4 }}>
                {ORDER_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => { setOrderType(t.value); setSelectedTableId(''); }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: orderType === t.value ? 700 : 400,
                      background: orderType === t.value ? 'var(--accent-base)' : 'transparent',
                      color: orderType === t.value ? 'white' : 'var(--text-secondary)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            )}
            {/* Table Selector - hanya untuk FnB dine-in */}
            {isFnB && orderType === 'dine-in' && (
              <select
                value={selectedTableId}
                onChange={e => setSelectedTableId(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', fontSize: '0.875rem', minWidth: 140 }}
              >
                <option value="">🪑 Pilih Meja</option>
                {tables.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    Meja {t.table_number}{t.section ? ` (${t.section})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Shift: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>#{activeShift.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Side */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Product Search */}
            <div>
              <label className="form-label">Search Product</label>
              <ProductSearch storeId={storeId} onSelectProduct={handleAddProduct} />
            </div>

            {/* Customer Selection */}
            <div>
              <label className="form-label">Customer (Optional)</label>
              <CustomerSelect storeId={storeId} selectedCustomer={selectedCustomer} onSelectCustomer={setSelectedCustomer} />
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { icon: Scan, label: 'Scan Barcode', shortcut: 'F2', onClick: () => setIsBarcodeScannerOpen(true), disabled: false, color: 'var(--accent-base)' },
                { icon: Tag, label: 'Apply Discount', shortcut: 'F3', onClick: () => cartItems.length > 0 && setIsDiscountModalOpen(true), disabled: cartItems.length === 0, color: 'var(--success)' },
                { icon: Receipt, label: 'Hold Transaction', shortcut: 'F5', onClick: handleHoldTransaction, disabled: cartItems.length === 0, color: 'var(--warning)' },
              ].map(({ icon: Icon, label, shortcut, onClick, disabled, color }) => (
                <button key={label} onClick={onClick} disabled={disabled} style={{
                  padding: 16, border: '2px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)', cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1, transition: 'all var(--transition-fast)', textAlign: 'center',
                }}>
                  <Icon size={24} style={{ margin: '0 auto 8px', color }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Press {shortcut}</div>
                </button>
              ))}
            </div>

            {/* Held Transactions */}
            {heldTransactions.length > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--warning)', marginBottom: 8 }}>
                  Held Transactions ({heldTransactions.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {heldTransactions.map((held) => (
                    <button key={held.id} onClick={() => handleResumeTransaction(held)} style={{
                      width: '100%', padding: 12, background: 'var(--bg-secondary)', border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                            {held.items.length} items{held.customer && ` — ${held.customer.name}`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            {new Date(held.timestamp).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
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
              <div style={{ padding: 16, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--success)' }}>
                      Discount: {discountInfo.type === 'percentage' ? `${discountInfo.value}%` : `Rp ${discountInfo.value.toLocaleString('id-ID')}`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 4 }}>
                      Saving: Rp {discountAmount.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <button onClick={handleRemoveDiscount} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.875rem' }}>
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Cart */}
        <div style={{ width: 384, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, padding: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
          <div style={{ padding: 24, borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => setIsPaymentModalOpen(true)} disabled={cartItems.length === 0 || loading}
              className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.1rem', justifyContent: 'center', gap: 8 }}>
              <Receipt size={22} /> Checkout (F12)
            </button>
            <button onClick={() => setIsSplitPaymentModalOpen(true)} disabled={cartItems.length === 0 || loading}
              className="btn btn-outline" style={{ width: '100%', padding: '10px', justifyContent: 'center', gap: 8 }}>
              <CreditCard size={18} /> Split Payment
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
          if (!activeShift) { toast.error('No active shift'); return; }
          if (cartItems.length === 0) { toast.error('Cart is empty'); return; }
          setLoading(true);
          try {
            const { subtotal, tax, total: txTotal } = calculateTotals();
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const changeAmount = totalPaid - txTotal;
            // Primary method is the first one; all methods sent for record
            const primaryMethod = payments[0].method;
            const transaction = await transactionService.createTransaction({
              storeId: storeId!,
              paymentMethod: primaryMethod,
              paymentMethods: payments.map(p => ({ method: p.method, amount: p.amount })),
              subtotal,
              taxAmount: tax,
              discountAmount,
              total: txTotal,
              paidAmount: totalPaid,
              changeAmount,
              customerName: selectedCustomer?.name,
              customerId: selectedCustomer?.id,
              employeeId: user?.id,
              employeeName: `${user?.firstName} ${user?.lastName}`,
              shiftId: activeShift?.id,
              items: cartItems.map((item: any) => ({
                productId: item.product.id,
                productName: item.product.name,
                variantName: item.variantName,
                quantity: item.quantity,
                unitPrice: item.price,
                subtotal: item.subtotal,
                discountAmount: 0,
              })),
            });
            setLastTransaction({
              transactionNumber: transaction.transactionNumber,
              items: cartItems,
              subtotal,
              tax,
              discount: discountAmount,
              total: txTotal,
              paidAmount: totalPaid,
              changeAmount,
              paymentMethod: `Split (${payments.map(p => p.method).join(', ')})`,
              customerName: selectedCustomer?.name,
              employeeName: `${user?.firstName} ${user?.lastName}`,
            });
            setCartItems([]);
            setSelectedCustomer(null);
            setDiscountAmount(0);
            setDiscountInfo(null);
            setIsSplitPaymentModalOpen(false);
            setIsReceiptPreviewOpen(true);
            toast.success('Split payment processed');
          } catch (error: any) {
            console.error('Split payment failed:', error);
            toast.error(error?.response?.data?.message || 'Split payment failed');
          } finally {
            setLoading(false);
          }
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
          if (!lastTransaction) return;
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <html><head><title>Receipt</title>
              <style>body{font-family:monospace;max-width:300px;margin:0 auto;padding:20px}
              .center{text-align:center}.divider{border-top:1px dashed #000;margin:8px 0}
              .row{display:flex;justify-content:space-between}</style></head>
              <body>
              <div class="center"><h3>MonetraPOS</h3></div>
              <div class="divider"></div>
              <p>Invoice: ${lastTransaction.transactionNumber}</p>
              <p>Date: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
              ${lastTransaction.customerName ? `<p>Customer: ${lastTransaction.customerName}</p>` : ''}
              <div class="divider"></div>
              ${(lastTransaction.items || []).map((item: any) => `
                <div class="row"><span>${item.quantity}x ${item.product?.name || item.productName}</span><span>Rp ${item.subtotal?.toLocaleString('id-ID')}</span></div>
              `).join('')}
              <div class="divider"></div>
              <div class="row"><span>Subtotal</span><span>Rp ${lastTransaction.subtotal?.toLocaleString('id-ID')}</span></div>
              <div class="row"><span>Tax</span><span>Rp ${lastTransaction.tax?.toLocaleString('id-ID')}</span></div>
              ${lastTransaction.discount ? `<div class="row"><span>Discount</span><span>-Rp ${lastTransaction.discount?.toLocaleString('id-ID')}</span></div>` : ''}
              <div class="row"><strong>Total</strong><strong>Rp ${lastTransaction.total?.toLocaleString('id-ID')}</strong></div>
              <div class="row"><span>Paid</span><span>Rp ${lastTransaction.paidAmount?.toLocaleString('id-ID')}</span></div>
              <div class="row"><span>Change</span><span>Rp ${lastTransaction.changeAmount?.toLocaleString('id-ID')}</span></div>
              <div class="divider"></div>
              <div class="center"><p>Thank you!</p></div>
              </body></html>
            `);
            printWindow.document.close();
            printWindow.print();
          }
        }}
        onEmail={async () => {
          if (!lastTransaction?.customerEmail) {
            toast.error('No customer email available');
            return;
          }
          try {
            await import('@/lib/api-client').then(m => m.default.post('/receipts/email', {
              transactionId: lastTransaction.id,
              email: lastTransaction.customerEmail,
            }));
            toast.success('Receipt sent to ' + lastTransaction.customerEmail);
          } catch {
            toast.error('Failed to send receipt email');
          }
        }}
      />
    </div>
  );
}


'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Receipt, AlertCircle, Scan, Tag, CreditCard, UtensilsCrossed, RefreshCcw, Clock } from 'lucide-react';
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
import { paymentMethodService } from '@/services/payment-method.service';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentMethod } from '@/types/payment-method.types';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';
import { getImageUrl, formatRupiah } from '@/lib/date';

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
  // Active store data (for receipt)
  const [activeStore, setActiveStore] = useState<any>(null);
  const [receiptSettings, setReceiptSettings] = useState<any>({});
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
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

  // Tax and discount � fetched from company settings, fallback 0%
  const [taxRate, setTaxRate] = useState(0);
  const [taxLabel, setTaxLabel] = useState('Tax');
  const [taxNumber, setTaxNumber] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountInfo, setDiscountInfo] = useState<{
    type: 'percentage' | 'fixed';
    value: number;
    promoCode?: string;
  } | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  // Loyalty points redemption (1 point = Rp 100)
  const POINT_VALUE = 100;
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [redeemDiscount, setRedeemDiscount] = useState(0);

  // FnB Active Orders — untuk kasir lihat order aktif per meja
  const [fnbActiveOrders, setFnbActiveOrders] = useState<any[]>([]);
  const [fnbOrdersLoading, setFnbOrdersLoading] = useState(false);
  const [showFnbPanel, setShowFnbPanel] = useState(false);
  const [activeFnbOrderId, setActiveFnbOrderId] = useState<string | null>(null);

  useEffect(() => {
    // Load stores first
    import('@/services/stores.service').then(({ storesService }) => {
      storesService.getAll({ isActive: 'true' }).then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        setStores(list);
        if (list.length > 0 && !selectedStoreId) {
          setSelectedStoreId(list[0].id);
          setActiveStore(list[0]);
        }
      }).catch(console.error);
    });
  }, []);

  useEffect(() => {
    if (storeId) {
      // Update active store data when storeId changes
      const found = stores.find((s: any) => s.id === storeId);
      if (found) setActiveStore(found);
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

  // Fetch FnB active orders (pending/preparing/ready) untuk ditampilkan di POS
  const fetchFnbActiveOrders = useCallback(async () => {
    if (!storeId || !isFnB) return;
    setFnbOrdersLoading(true);
    try {
      const res: any = await apiClient.get('/fnb/orders', {
        params: { store_id: storeId, status: 'pending' },
      });
      const pending = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const res2: any = await apiClient.get('/fnb/orders', {
        params: { store_id: storeId, status: 'preparing' },
      });
      const preparing = Array.isArray(res2.data) ? res2.data : (res2.data?.data || []);
      const res3: any = await apiClient.get('/fnb/orders', {
        params: { store_id: storeId, status: 'ready' },
      });
      const ready = Array.isArray(res3.data) ? res3.data : (res3.data?.data || []);
      const res4: any = await apiClient.get('/fnb/orders', {
        params: { store_id: storeId, status: 'served' },
      });
      const served = Array.isArray(res4.data) ? res4.data : (res4.data?.data || []);
      setFnbActiveOrders([...pending, ...preparing, ...ready, ...served]);
    } catch { /* silent */ }
    finally { setFnbOrdersLoading(false); }
  }, [storeId, isFnB]);

  // Load FnB orders when storeId changes, and auto-refresh every 15s
  useEffect(() => {
    if (isFnB && storeId) {
      fetchFnbActiveOrders();
      const interval = setInterval(fetchFnbActiveOrders, 15000);
      return () => clearInterval(interval);
    }
  }, [storeId, isFnB, fetchFnbActiveOrders]);

  // Load FnB order items into cart
  const loadFnbOrderToCart = async (order: any) => {
    try {
      // Get full order with transaction items
      const res: any = await apiClient.get(`/fnb/orders/${order.id}`);
      const fullOrder = res.data;
      const tx = fullOrder.transaction;
      const items = tx?.items || [];

      if (items.length === 0) {
        toast.error('Order ini belum ada item. Tambahkan menu terlebih dahulu.');
        return;
      }

      // Convert transaction items to cart items
      const newCartItems: CartItem[] = items.map((item: any) => ({
        product: {
          id: item.productId || item.product_id || null,
          name: item.productName || item.product_name || 'Item',
          price: Number(item.unitPrice || item.unit_price || 0),
          stock: 999,
          isActive: true,
        } as any,
        quantity: item.quantity,
        price: Number(item.unitPrice || item.unit_price || 0),
        subtotal: Number(item.subtotal || 0),
        variantName: item.variantName || item.variant_name,
      }));

      setCartItems(newCartItems);
      setActiveFnbOrderId(order.id);

      // Set table if dine-in
      if (order.order_type === 'dine-in' && order.table_id) {
        setOrderType('dine-in');
        setSelectedTableId(order.table_id);
      } else if (order.order_type) {
        setOrderType(order.order_type);
      }

      // Set customer if any
      if (tx?.customer_id || tx?.customerId) {
        // Customer will be loaded by CustomerSelect component
      }

      setShowFnbPanel(false);
      toast.success(`Order ${order.order_number} dimuat ke cart`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memuat order');
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
      const [settingsRes, profileRes] = await Promise.allSettled([
        apiClient.get('/companies/settings'),
        apiClient.get('/companies/profile'),
      ]);

      if (settingsRes.status === 'fulfilled') {
        const data = settingsRes.value.data;
        const rate = data?.taxSettings?.defaultTaxRate;
        const label = data?.taxSettings?.taxLabel;
        const tNum = data?.taxSettings?.taxNumber;
        if (typeof rate === 'number' && rate >= 0) setTaxRate(rate / 100);
        if (label) setTaxLabel(label);
        if (tNum) setTaxNumber(tNum);
        if (data?.receiptSettings) setReceiptSettings(data.receiptSettings);
      }

      if (profileRes.status === 'fulfilled') {
        const profile = profileRes.value.data;
        if (profile?.logoUrl) setCompanyLogoUrl(profile.logoUrl);
      }
    } catch {
      // silently fallback
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
    const itemKey = variant ? `${product.id}__${variant.id}` : product.id;
    // Pastikan price selalu number
    const price = Number(product.price) || 0;
    const existingIndex = cartItems.findIndex(
      (item) => (item as any).itemKey === itemKey
    );

    if (existingIndex >= 0) {
      const newItems = [...cartItems];
      const newQuantity = newItems[existingIndex].quantity + 1;
      if (newQuantity > (product.stock || 0)) {
        toast.error(`Stok tidak cukup. Tersedia: ${product.stock}`);
        return;
      }
      newItems[existingIndex].quantity = newQuantity;
      newItems[existingIndex].subtotal = newQuantity * newItems[existingIndex].price;
      setCartItems(newItems);
    } else {
      if ((product.stock || 0) < 1) {
        toast.error('Stok habis');
        return;
      }
      setCartItems([
        ...cartItems,
        {
          product: { ...product, price },
          quantity: 1,
          price,
          subtotal: price,
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
    if (quantity > (item.product?.stock || 999)) {
      toast.error(`Insufficient stock. Available: ${item.product?.stock}`);
      return;
    }
    item.quantity = quantity;
    item.subtotal = quantity * Number(item.price);
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
    setPromoCode('');
  };

  const handleApplyRedeemPoints = (points: number) => {
    const maxPoints = selectedCustomer?.loyaltyPoints || 0;
    const safePoints = Math.min(points, maxPoints);
    const discount = safePoints * POINT_VALUE;
    setRedeemPoints(safePoints);
    setRedeemDiscount(discount);
  };

  const handleRemoveRedeemPoints = () => {
    setRedeemPoints(0);
    setRedeemDiscount(0);
  };

  const sendReceiptEmail = async (email: string) => {
    if (!lastTransaction?.id) { toast.error('Transaction ID tidak ditemukan'); return; }
    const toastId = toast.loading(`Mengirim struk ke ${email}...`);
    try {
      const res: any = await apiClient.post('/receipts/email', {
        transactionId: lastTransaction.id,
        email: email.trim(),
      });
      const data = res.data || res;
      if (data?.success === false) {
        toast.error(data?.message || 'Gagal mengirim email', { id: toastId });
      } else {
        toast.success(`? Struk berhasil dikirim ke ${email}`, { id: toastId, duration: 4000 });
        setEmailModal(false);
        setEmailInput('');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengirim email struk', { id: toastId });
    }
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) return;
    if (subtotal <= 0) { toast.error('Tambahkan produk ke keranjang terlebih dahulu'); return; }
    setPromoLoading(true);
    try {
      const res = await apiClient.post('/discounts/validate', {
        promoCode: promoCode.trim(),
        transactionTotal: subtotal,
      });
      const data = res.data || res;
      if (data.valid === false) {
        toast.error(data.message || 'Kode promo tidak valid');
        return;
      }
      const discAmt = Number(data.discountAmount || 0);
      const discType = data.discount?.type === 'percentage' ? 'percentage' : 'fixed';
      const discValue = Number(data.discount?.value || discAmt);
      setDiscountAmount(discAmt);
      setDiscountInfo({ type: discType, value: discValue, promoCode: promoCode.trim() });
      toast.success(`Promo "${promoCode.trim()}" berhasil diterapkan! Hemat Rp ${formatRupiah(discAmt)}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Kode promo tidak valid');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleItemDiscount = (index: number) => {
    setSelectedItemIndex(index);
    setIsItemDiscountModalOpen(true);
  };

  const handleApplyItemDiscount = (discountAmount: number, discountType: 'percentage' | 'fixed', discountValue: number) => {
    if (selectedItemIndex === null) return;
    const newItems = [...cartItems];
    const item = newItems[selectedItemIndex];
    const originalSubtotal = Number(item.price) * item.quantity;
    item.subtotal = Math.max(0, originalSubtotal - discountAmount);
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
    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const tax = Math.round(subtotal * taxRate);
    const total = Math.max(0, subtotal + tax - Number(discountAmount) - redeemDiscount);
    return { subtotal, tax, total };
  };

  const handlePayment = async (paymentMethod: PaymentMethodType, paidAmount: number) => {

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
        paymentMethod: paymentMethod as any,
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
        ...(isFnB && { orderType }),
        ...(isFnB && orderType === 'dine-in' && selectedTableId && { tableId: selectedTableId }),
        ...(isFnB && activeFnbOrderId && { fnbOrderId: activeFnbOrderId }),
        items: cartItems.map((item: any) => ({
          productId: item.product?.id || item.productId || '',
          productName: item.product?.name || item.productName || 'Item',
          variantName: item.variantName || undefined,
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: item.subtotal,
          discountAmount: 0,
        })),
      });

      // Success � backend handles loyalty points automatically
      setLastTransaction({
        id: transaction.id,
        transactionNumber: transaction.transactionNumber || (transaction as any).invoiceNumber,
        items: cartItems,
        subtotal,
        tax,
        taxRate: taxRate * 100,
        taxLabel,
        discount: discountAmount,
        total,
        paidAmount,
        changeAmount: Math.max(0, changeAmount),
        paymentMethod,
        customerName: selectedCustomer?.name,
        customerEmail: selectedCustomer?.email || null,
        employeeName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        // Store info for receipt — use store receipt settings, fallback to company settings
        storeName: activeStore?.name || '',
        storeAddress: activeStore?.address || null,
        storePhone: activeStore?.phone || null,
        storeLogo: receiptSettings?.showLogo !== false
          ? getImageUrl(activeStore?.receiptLogoUrl || companyLogoUrl || null)
          : null,
        headerText: activeStore?.receiptHeader || receiptSettings?.headerText || null,
        footerText: activeStore?.receiptFooter || receiptSettings?.footerText || null,
        showTaxNumber: receiptSettings?.showTaxNumber || false,
        taxNumber: taxNumber,
      });

      // Reset cart
      const completedFnbOrderId = activeFnbOrderId; // simpan sebelum di-reset
      setCartItems([]);
      setSelectedCustomer(null);
      setDiscountAmount(0);
      setDiscountInfo(null);
      setPromoCode('');
      setActiveFnbOrderId(null);
      setIsPaymentModalOpen(false);

      toast.success('Transaksi berhasil!');

      // Refresh FnB active orders panel so completed orders disappear
      if (isFnB) {
        if (completedFnbOrderId) {
          // Hapus langsung dari state (optimistic)
          setFnbActiveOrders(prev => prev.filter(o => o.id !== completedFnbOrderId));
        } else if (selectedTableId) {
          // Fallback: hapus berdasarkan table
          setFnbActiveOrders(prev => prev.filter(o => (o.table_id || o.tableId) !== selectedTableId));
        }
        // Refresh dari server setelah delay singkat agar backend selesai update
        setTimeout(() => fetchFnbActiveOrders(), 1500);
      }

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
                onChange={e => { setSelectedStoreId(e.target.value); setActiveStore(stores.find((s: any) => s.id === e.target.value) || null); }}
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
                <option value="">?? Pilih Meja</option>
                {tables.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    Meja {t.table_number}{t.section ? ` (${t.section})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* FnB Active Orders Button — hanya untuk FnB */}
            {isFnB && (
              <button
                onClick={() => { setShowFnbPanel(true); fetchFnbActiveOrders(); }}
                style={{
                  position: 'relative', display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)', background: 'var(--bg-primary)',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                }}
              >
                <UtensilsCrossed size={16} style={{ color: 'var(--warning)' }} />
                Order Aktif
                {fnbActiveOrders.length > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6,
                    background: 'var(--danger)', color: 'white',
                    borderRadius: '50%', width: 18, height: 18,
                    fontSize: '0.7rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {fnbActiveOrders.length}
                  </span>
                )}
              </button>
            )}
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Kasir: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.firstName} {user?.lastName}</span>
            </div>
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
              <CustomerSelect storeId={storeId} selectedCustomer={selectedCustomer} onSelectCustomer={async (c) => {
                setSelectedCustomer(c);
                setRedeemPoints(0);
                setRedeemDiscount(0);
                // Terapkan diskon tier otomatis jika customer punya tier Silver/Gold/Platinum
                if (c?.id) {
                  try {
                    const res: any = await apiClient.get(`/customers/loyalty/${c.id}/tier-info`);
                    const tierInfo = res.data;
                    if (tierInfo?.discountPercentage > 0) {
                      // Hitung diskon tier berdasarkan subtotal saat ini
                      const currentSubtotal = cartItems.reduce((s, i) => s + Number(i.subtotal), 0);
                      const tierDiscount = Math.round(currentSubtotal * (tierInfo.discountPercentage / 100));
                      if (tierDiscount > 0) {
                        setDiscountAmount(tierDiscount);
                        setDiscountInfo({ type: 'percentage', value: tierInfo.discountPercentage });
                        toast.success(`Diskon ${tierInfo.tier.toUpperCase()} ${tierInfo.discountPercentage}% diterapkan otomatis`);
                      }
                    }
                  } catch { /* silent — tidak gagalkan pemilihan customer */ }
                } else {
                  // Customer dihapus — reset diskon tier
                  setDiscountAmount(0);
                  setDiscountInfo(null);
                }
              }} />
            </div>

            {/* Tier badge — tampil jika customer dipilih */}
            {selectedCustomer && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(99,102,241,0.06)', borderRadius: 8, fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 700, color: selectedCustomer.loyaltyTier === 'platinum' ? '#7c3aed' : selectedCustomer.loyaltyTier === 'gold' ? '#d97706' : selectedCustomer.loyaltyTier === 'silver' ? '#6b7280' : '#374151' }}>
                  {selectedCustomer.loyaltyTier === 'platinum' ? '💎' : selectedCustomer.loyaltyTier === 'gold' ? '🥇' : selectedCustomer.loyaltyTier === 'silver' ? '🥈' : '👤'} {(selectedCustomer.loyaltyTier || 'regular').toUpperCase()}
                </span>
                <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                <span style={{ color: 'var(--text-secondary)' }}>{(selectedCustomer.loyaltyPoints || 0).toLocaleString('id-ID')} poin</span>
                {selectedCustomer.loyaltyTier !== 'regular' && (
                  <>
                    <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                      Diskon {selectedCustomer.loyaltyTier === 'platinum' ? '15' : selectedCustomer.loyaltyTier === 'gold' ? '10' : '5'}% otomatis
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Loyalty Points Redemption — tampil jika customer dipilih dan punya poin */}
            {selectedCustomer && (selectedCustomer.loyaltyPoints || 0) > 0 && (
              <div style={{ padding: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: redeemPoints > 0 ? 8 : 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ⭐ {selectedCustomer.loyaltyPoints} poin tersedia
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>
                      (1 poin = Rp {formatRupiah(POINT_VALUE)})
                    </span>
                  </div>
                  {redeemPoints === 0 ? (
                    <button
                      onClick={() => handleApplyRedeemPoints(Math.min(selectedCustomer.loyaltyPoints, Math.floor(calculateTotals().total / POINT_VALUE)))}
                      className="btn btn-outline"
                      style={{ height: 28, padding: '0 10px', fontSize: '0.75rem', color: 'var(--warning)', borderColor: 'var(--warning)' }}
                      disabled={cartItems.length === 0}
                    >
                      Tukar Poin
                    </button>
                  ) : (
                    <button onClick={handleRemoveRedeemPoints} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.75rem' }}>
                      Batalkan
                    </button>
                  )}
                </div>
                {redeemPoints > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>
                    Menggunakan {redeemPoints} poin → Diskon Rp {formatRupiah(redeemDiscount)}
                  </div>
                )}
              </div>
            )}

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
                            {held.items.length} items{held.customer && ` � ${held.customer.name}`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            {new Date(held.timestamp).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          Rp {formatRupiah(held.items.reduce((sum, item) => sum + item.subtotal, 0))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Promo Code Input */}
            {!discountInfo && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleApplyPromoCode()}
                  placeholder="Kode promo..."
                  className="form-input"
                  style={{ flex: 1, height: 36, fontSize: '0.875rem' }}
                  disabled={cartItems.length === 0}
                />
                <button
                  onClick={handleApplyPromoCode}
                  disabled={!promoCode.trim() || promoLoading || cartItems.length === 0}
                  className="btn btn-outline"
                  style={{ height: 36, padding: '0 12px', fontSize: '0.8rem', color: 'var(--success)', borderColor: 'var(--success)' }}
                >
                  {promoLoading ? <span style={{ fontSize: '0.75rem' }}>...</span> : 'Terapkan'}
                </button>
              </div>
            )}

            {/* Discount Info */}
            {discountInfo && (
              <div style={{ padding: 16, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--success)' }}>
                      {discountInfo.promoCode ? `Promo "${discountInfo.promoCode}"` : 'Discount'}: {discountInfo.type === 'percentage' ? `${discountInfo.value}%` : `Rp ${formatRupiah(discountInfo.value)}`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 4 }}>
                      Saving: Rp {formatRupiah(discountAmount)}
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
              redeemDiscount={redeemDiscount}
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
        storeId={storeId}
        companyId={(company as any)?.id}
        paymentMethods={paymentMethods}
        onConfirm={handlePayment}
      />

      <SplitPaymentModal
        isOpen={isSplitPaymentModalOpen}
        onClose={() => setIsSplitPaymentModalOpen(false)}
        total={total}
        onConfirm={async (payments) => {
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
              discountAmount: discountAmount + redeemDiscount,
              total: txTotal,
              paidAmount: totalPaid,
              changeAmount,
              customerName: selectedCustomer?.name,
              customerId: selectedCustomer?.id,
              employeeId: user?.id,
              employeeName: `${user?.firstName} ${user?.lastName}`,
              ...(isFnB && activeFnbOrderId && { fnbOrderId: activeFnbOrderId }),
              items: cartItems.map((item: any) => ({
                productId: item.product?.id || item.productId || '',
                productName: item.product?.name || item.productName || 'Item',
                variantName: item.variantName || undefined,
                quantity: item.quantity,
                unitPrice: item.price,
                subtotal: item.subtotal,
                discountAmount: 0,
              })),
            });
            // Redeem loyalty points if used
            if (redeemPoints > 0 && selectedCustomer?.id) {
              try {
                await apiClient.post('/customers/loyalty/redeem-points', {
                  customerId: selectedCustomer.id,
                  points: redeemPoints,
                  description: `Penukaran poin di POS - ${transaction.transactionNumber || (transaction as any).invoiceNumber}`,
                  referenceType: 'transaction',
                  referenceId: transaction.id,
                });
              } catch (redeemErr) {
                console.error('Failed to redeem loyalty points:', redeemErr);
              }
            }
            setLastTransaction({
              id: transaction.id,
              transactionNumber: transaction.transactionNumber || (transaction as any).invoiceNumber,
              items: cartItems,
              subtotal,
              tax,
              taxRate: taxRate * 100,
              taxLabel,
              discount: discountAmount + redeemDiscount,
              redeemPoints: redeemPoints > 0 ? redeemPoints : undefined,
              redeemDiscount: redeemDiscount > 0 ? redeemDiscount : undefined,
              total: txTotal,
              paidAmount: totalPaid,
              changeAmount: Math.max(0, changeAmount),
              paymentMethod: `Split (${payments.map(p => p.method).join(', ')})`,
              customerName: selectedCustomer?.name,
              customerEmail: selectedCustomer?.email || null,
              employeeName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
              storeName: activeStore?.name || '',
              storeAddress: activeStore?.address || null,
              storePhone: activeStore?.phone || null,
              storeLogo: receiptSettings?.showLogo !== false
                ? getImageUrl(activeStore?.receiptLogoUrl || companyLogoUrl || null)
                : null,
              headerText: activeStore?.receiptHeader || receiptSettings?.headerText || null,
              footerText: activeStore?.receiptFooter || receiptSettings?.footerText || null,
              showTaxNumber: receiptSettings?.showTaxNumber || false,
              taxNumber: taxNumber,
            });
            setCartItems([]);
            setSelectedCustomer(null);
            setDiscountAmount(0);
            setDiscountInfo(null);
            setPromoCode('');
            const completedOrderId = activeFnbOrderId;
            setActiveFnbOrderId(null);
            setIsSplitPaymentModalOpen(false);
            setIsReceiptPreviewOpen(true);
            if (isFnB) {
              if (completedOrderId) {
                setFnbActiveOrders(prev => prev.filter(o => o.id !== completedOrderId));
              }
              setTimeout(() => fetchFnbActiveOrders(), 1500);
            }
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
            const logoHtml = lastTransaction.storeLogo
              ? `<div class="center"><img src="${lastTransaction.storeLogo}" style="max-height:70px;max-width:180px;object-fit:contain;margin-bottom:8px" onerror="this.style.display='none'" /></div>`
              : '';
            const headerHtml = lastTransaction.headerText && lastTransaction.headerText.trim() !== (lastTransaction.storeName || '').trim()
              ? `<div class="center" style="font-size:11px;color:#666;margin-bottom:4px;white-space:pre-line">${lastTransaction.headerText}</div>`
              : '';
            const footerHtml = lastTransaction.footerText
              ? `<div class="center" style="font-size:11px;color:#666;white-space:pre-line">${lastTransaction.footerText}</div>`
              : `<div class="center"><p>Terima kasih atas kunjungan Anda!</p></div>`;
            printWindow.document.write(`
              <html><head><title>Struk</title>
              <style>
                body{font-family:monospace;max-width:300px;margin:0 auto;padding:20px;font-size:12px}
                .center{text-align:center}
                .divider{border-top:1px dashed #000;margin:8px 0}
                .row{display:flex;justify-content:space-between;margin:2px 0}
                h3{margin:4px 0;font-size:14px}
                @media print{body{padding:0}}
              </style></head>
              <body>
              ${logoHtml}
              ${headerHtml}
              <div class="center"><h3>${lastTransaction.storeName || 'MonetraPOS'}</h3></div>
              ${lastTransaction.storeAddress ? `<div class="center" style="font-size:11px">${lastTransaction.storeAddress}</div>` : ''}
              ${lastTransaction.storePhone ? `<div class="center" style="font-size:11px">${lastTransaction.storePhone}</div>` : ''}
              ${lastTransaction.showTaxNumber && lastTransaction.taxNumber ? `<div class="center" style="font-size:11px">NPWP: ${lastTransaction.taxNumber}</div>` : ''}
              <div class="divider"></div>
              <div class="row"><span>Invoice:</span><span><b>${lastTransaction.transactionNumber}</b></span></div>
              <div class="row"><span>Tanggal:</span><span>${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</span></div>
              ${lastTransaction.employeeName ? `<div class="row"><span>Kasir:</span><span>${lastTransaction.employeeName}</span></div>` : ''}
              ${lastTransaction.customerName ? `<div class="row"><span>Pelanggan:</span><span>${lastTransaction.customerName}</span></div>` : ''}
              <div class="row"><span>Pembayaran:</span><span>${(lastTransaction.paymentMethod || '').toUpperCase()}</span></div>
              <div class="divider"></div>
              ${(lastTransaction.items || []).map((item: any) => `
                <div><b>${item.product?.name || item.productName || 'Item'}</b></div>
                <div class="row"><span>${item.quantity}x Rp ${formatRupiah(item.price ?? item.unitPrice ?? 0)}</span><span>Rp ${formatRupiah(item.subtotal || 0)}</span></div>
              `).join('')}
              <div class="divider"></div>
              <div class="row"><span>Subtotal:</span><span>Rp ${formatRupiah(lastTransaction.subtotal || 0)}</span></div>
              ${lastTransaction.discount > 0 ? `<div class="row"><span>Diskon:</span><span>-Rp ${formatRupiah(lastTransaction.discount || 0)}</span></div>` : ''}
              ${lastTransaction.tax > 0 ? `<div class="row"><span>${lastTransaction.taxLabel || 'Pajak'}${lastTransaction.taxRate != null ? ` (${lastTransaction.taxRate}%)` : ''}:</span><span>Rp ${formatRupiah(lastTransaction.tax || 0)}</span></div>` : ''}
              <div class="divider"></div>
              <div class="row"><b>TOTAL:</b><b>Rp ${formatRupiah(lastTransaction.total || 0)}</b></div>
              <div class="row"><span>Bayar:</span><span>Rp ${formatRupiah(lastTransaction.paidAmount || 0)}</span></div>
              <div class="row"><span>Kembalian:</span><span>Rp ${formatRupiah(lastTransaction.changeAmount || 0)}</span></div>
              <div class="divider"></div>
              ${footerHtml}
              </body></html>
            `);
            printWindow.document.close();
            printWindow.print();
          }
        }}
        onEmail={async () => {
          // Jika customer punya email, langsung kirim
          if (lastTransaction?.customerEmail) {
            await sendReceiptEmail(lastTransaction.customerEmail);
          } else {
            // Buka modal input email custom
            setEmailInput('');
            setEmailModal(true);
          }
        }}
      />

      {/* Email Input Modal */}
      {emailModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div
            onClick={() => setEmailModal(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />
          <div style={{
            position: 'relative', zIndex: 10001,
            background: 'var(--bg-secondary, #fff)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            width: '100%', maxWidth: '400px',
            padding: '1.75rem',
          }}>
            {/* Header */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Kirim Struk via Email</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Masukkan alamat email untuk mengirim struk transaksi
              </p>
            </div>

            {/* Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                Alamat Email *
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && emailInput.trim()) sendReceiptEmail(emailInput.trim());
                  if (e.key === 'Escape') setEmailModal(false);
                }}
                placeholder="contoh@email.com"
                autoFocus
                style={{
                  width: '100%', padding: '10px 14px', fontSize: '1rem',
                  border: '2px solid var(--border-color, #e5e7eb)',
                  borderRadius: '8px', outline: 'none', boxSizing: 'border-box',
                  background: 'var(--bg-primary, #fff)',
                  color: 'var(--text-primary, #111)',
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setEmailModal(false)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  background: 'var(--bg-tertiary, #f3f4f6)',
                  cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                }}
              >
                Batal
              </button>
              <button
                onClick={() => emailInput.trim() && sendReceiptEmail(emailInput.trim())}
                disabled={!emailInput.trim()}
                style={{
                  flex: 2, padding: '10px', borderRadius: '8px', border: 'none',
                  background: !emailInput.trim() ? '#9ca3af' : '#10b981',
                  color: 'white', cursor: !emailInput.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: '0.95rem',
                }}
              >
                Kirim Struk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FnB Active Orders Panel ─────────────────────────────────────── */}
      {showFnbPanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
          <div onClick={() => setShowFnbPanel(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />
          <div style={{
            position: 'relative', width: 420, height: '100vh', background: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column',
            zIndex: 9001, overflowY: 'auto',
          }}>
            {/* Panel Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UtensilsCrossed size={20} style={{ color: 'var(--warning)' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>Order Aktif FnB</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Klik order untuk proses pembayaran</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={fetchFnbActiveOrders} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }} title="Refresh">
                  <RefreshCcw size={16} style={{ animation: fnbOrdersLoading ? 'spin 1s linear infinite' : 'none' }} />
                </button>
                <button onClick={() => setShowFnbPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '1.2rem', padding: 4 }}>✕</button>
              </div>
            </div>

            {/* Alur FnB Info */}
            <div style={{ padding: '12px 20px', background: 'rgba(99,102,241,0.06)', borderBottom: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--primary)' }}>Alur FnB:</strong>
              {' '}Pelayan buat order → Dapur terima di KDS → Kasir klik order di sini → Checkout
            </div>

            {/* Orders List */}
            <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fnbOrdersLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>Memuat order...</div>
              ) : fnbActiveOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <UtensilsCrossed size={40} style={{ margin: '0 auto 12px', color: 'var(--text-tertiary)', opacity: 0.4 }} />
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tidak ada order aktif</div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: 4 }}>Order baru akan muncul di sini secara otomatis</div>
                </div>
              ) : (
                fnbActiveOrders.map((order: any) => {
                  const statusColor: Record<string, string> = {
                    pending: 'var(--danger)', preparing: 'var(--warning)',
                    ready: 'var(--success)', served: 'var(--primary)',
                  };
                  const statusLabel: Record<string, string> = {
                    pending: '🔴 Menunggu', preparing: '🟡 Dimasak',
                    ready: '🟢 Siap', served: '🔵 Disajikan',
                  };
                  const isActive = activeFnbOrderId === order.id;
                  const tableNum = order.table?.table_number || order.table?.tableNumber || '';
                  const orderType = order.order_type || order.orderType || '';
                  const items = order.transaction?.items || [];
                  const total = Number(order.transaction?.total || 0);
                  const elapsed = Math.floor((Date.now() - new Date(order.created_at || order.createdAt).getTime()) / 60000);

                  return (
                    <div
                      key={order.id}
                      onClick={() => loadFnbOrderToCart(order)}
                      style={{
                        padding: '14px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        border: `2px solid ${isActive ? 'var(--primary)' : 'var(--border-subtle)'}`,
                        background: isActive ? 'rgba(99,102,241,0.06)' : 'var(--bg-primary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {/* Order header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                            {orderType === 'dine-in' ? `🪑 Meja ${tableNum || '?'}` : orderType === 'takeaway' ? '🥡 Takeaway' : '🛵 Delivery'}
                            {' '}
                            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-tertiary)' }}>#{(order.order_number || order.orderNumber || '').slice(-6)}</span>
                          </div>
                          {order.customer_name || order.customerName ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                              👤 {order.customer_name || order.customerName}
                            </div>
                          ) : null}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: statusColor[order.status] || 'var(--text-secondary)', background: `${statusColor[order.status] || '#6b7280'}15`, padding: '2px 8px', borderRadius: 10 }}>
                            {statusLabel[order.status] || order.status}
                          </span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={10} /> {elapsed < 1 ? 'Baru saja' : `${elapsed} mnt lalu`}
                          </div>
                        </div>
                      </div>

                      {/* Items preview */}
                      {items.length > 0 ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                          {items.slice(0, 3).map((item: any, i: number) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{item.quantity}× {item.productName || item.product_name || 'Item'}</span>
                              <span>Rp {formatRupiah(Number(item.subtotal || 0))}</span>
                            </div>
                          ))}
                          {items.length > 3 && <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>+{items.length - 3} item lainnya</div>}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 8, fontStyle: 'italic' }}>Belum ada item</div>
                      )}

                      {/* Total & action */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)' }}>
                          Rp {formatRupiah(total)}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: isActive ? 'var(--primary)' : 'var(--text-tertiary)', fontWeight: isActive ? 700 : 400 }}>
                          {isActive ? '✓ Dimuat ke cart' : 'Klik untuk checkout →'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}


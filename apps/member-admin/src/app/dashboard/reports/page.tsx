'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Package, Download, Calendar, Store, Filter, X } from 'lucide-react';
import apiClient from '../../../lib/api-client';
import toast from 'react-hot-toast';

// Types
interface SalesReport {
  period: { startDate: string; endDate: string };
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransaction: number;
    totalTax: number;
    totalDiscount: number;
  };
  daily?: Array<{ date: string; revenue: number; transactions: number }>;
  weekly?: Array<{ week: string; revenue: number; transactions: number }>;
  monthly?: Array<{ month: string; revenue: number; transactions: number }>;
}

interface ProductPerformance {
  period: { startDate: string; endDate: string };
  topProducts: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantitySold: number;
    revenue: number;
    profit: number;
    averagePrice: number;
  }>;
  summary: {
    totalProducts: number;
    totalRevenue: number;
    totalProfit: number;
  };
}

interface InventoryReport {
  products: Array<{
    productId: string;
    productName: string;
    sku: string;
    categoryName: string;
    stock: number;
    lowStockThreshold: number;
    isLowStock: boolean;
    cost: number;
    inventoryValue: number;
  }>;
  summary: {
    totalProducts: number;
    lowStockProducts: number;
    totalInventoryValue: number;
  };
}

interface Store {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

type TabType = 'sales' | 'products' | 'inventory';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sales');
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Sales Report State
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [salesFilters, setSalesFilters] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of month
    endDate: new Date().toISOString().split('T')[0], // Today
    groupBy: 'day' as 'day' | 'week' | 'month',
    storeId: '',
  });

  // Product Performance State
  const [productReport, setProductReport] = useState<ProductPerformance | null>(null);
  const [productFilters, setProductFilters] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    storeId: '',
    categoryId: '',
    limit: 20,
  });

  // Inventory Report State
  const [inventoryReport, setInventoryReport] = useState<InventoryReport | null>(null);
  const [inventoryFilters, setInventoryFilters] = useState({
    storeId: '',
    categoryId: '',
    lowStockOnly: false,
  });

  useEffect(() => {
    fetchStoresAndCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'sales') {
      fetchSalesReport();
    } else if (activeTab === 'products') {
      fetchProductReport();
    } else if (activeTab === 'inventory') {
      fetchInventoryReport();
    }
  }, [activeTab]);

  const fetchStoresAndCategories = async () => {
    try {
      const [storesRes, categoriesRes]: any = await Promise.all([
        apiClient.get('/stores'),
        apiClient.get('/categories'),
      ]);
      const storeData = storesRes.data;
      const catData = categoriesRes.data;
      setStores(Array.isArray(storeData) ? storeData : (storeData?.data || []));
      setCategories(Array.isArray(catData) ? catData : (catData?.data || []));
    } catch (err) {
      console.error('Failed to fetch stores and categories:', err);
      // silent - non-critical
    }
  };

  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: salesFilters.startDate,
        endDate: salesFilters.endDate,
        groupBy: salesFilters.groupBy,
      });
      if (salesFilters.storeId) params.append('storeId', salesFilters.storeId);

      const res: any = await apiClient.get(`/reports/sales?${params.toString()}`);
      setSalesReport(res.data ?? res);
    } catch (err) {
      console.error('Failed to fetch sales report:', err);
      toast.error('Gagal memuat laporan penjualan');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: productFilters.startDate,
        endDate: productFilters.endDate,
        limit: productFilters.limit.toString(),
      });
      if (productFilters.storeId) params.append('storeId', productFilters.storeId);
      if (productFilters.categoryId) params.append('categoryId', productFilters.categoryId);

      const res: any = await apiClient.get(`/reports/products?${params.toString()}`);
      setProductReport(res.data ?? res);
    } catch (err) {
      console.error('Failed to fetch product report:', err);
      toast.error('Gagal memuat laporan produk');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lowStockOnly: inventoryFilters.lowStockOnly.toString(),
      });
      if (inventoryFilters.storeId) params.append('storeId', inventoryFilters.storeId);
      if (inventoryFilters.categoryId) params.append('categoryId', inventoryFilters.categoryId);

      const res: any = await apiClient.get(`/reports/inventory?${params.toString()}`);
      setInventoryReport(res.data ?? res);
    } catch (err) {
      console.error('Failed to fetch inventory report:', err);
      toast.error('Gagal memuat laporan inventori');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Jakarta',
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportSales = () => {
    if (!salesReport) return;
    const data = salesReport.daily || salesReport.weekly || salesReport.monthly || [];
    exportToCSV(data, 'sales_report');
  };

  const handleExportProducts = () => {
    if (!productReport) return;
    exportToCSV(productReport.topProducts, 'product_performance');
  };

  const handleExportProductsPdf = async () => {
    if (!productReport) return;
    const params = new URLSearchParams({ startDate: productFilters.startDate, endDate: productFilters.endDate, limit: productFilters.limit.toString() });
    if (productFilters.storeId) params.append('storeId', productFilters.storeId);
    if (productFilters.categoryId) params.append('categoryId', productFilters.categoryId);
    const token = localStorage.getItem('access_token') || '';
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://10.1.2.254:4404/api/v1';
    const url = `${apiBase}/reports/products/export-pdf?${params.toString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { toast.error('Gagal export PDF'); return; }
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `product-report-${productFilters.startDate}-${productFilters.endDate}.pdf`;
    link.click();
  };

  const handleExportInventory = () => {
    if (!inventoryReport) return;
    exportToCSV(inventoryReport.products, 'inventory_report');
  };

  const handleExportSalesPdf = async () => {
    if (!salesReport) return;
    const params = new URLSearchParams({ startDate: salesFilters.startDate, endDate: salesFilters.endDate, groupBy: salesFilters.groupBy });
    if (salesFilters.storeId) params.append('storeId', salesFilters.storeId);
    const token = localStorage.getItem('access_token') || '';
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://10.1.2.254:4404/api/v1';
    const url = `${apiBase}/reports/sales/export-pdf?${params.toString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { toast.error('Gagal export PDF'); return; }
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales-report-${salesFilters.startDate}-${salesFilters.endDate}.pdf`;
    link.click();
  };

  const handleExportInventoryPdf = async () => {
    if (!inventoryReport) return;
    const params = new URLSearchParams({ lowStockOnly: inventoryFilters.lowStockOnly.toString() });
    if (inventoryFilters.storeId) params.append('storeId', inventoryFilters.storeId);
    const token = localStorage.getItem('access_token') || '';
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://10.1.2.254:4404/api/v1';
    const url = `${apiBase}/reports/inventory/export-pdf?${params.toString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { toast.error('Gagal export PDF'); return; }
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory-report.pdf`;
    link.click();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Laporan & Analitik</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Lihat laporan penjualan, performa produk, dan inventori.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-panel" style={{ padding: 0, marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('sales')}
            style={{
              flex: 1,
              padding: 'var(--space-md) var(--space-lg)',
              background: activeTab === 'sales' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'sales' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'sales' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)',
            }}
          >
            <TrendingUp size={18} />
            Laporan Penjualan
          </button>
          <button
            onClick={() => setActiveTab('products')}
            style={{
              flex: 1,
              padding: 'var(--space-md) var(--space-lg)',
              background: activeTab === 'products' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'products' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'products' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)',
            }}
          >
            <BarChart3 size={18} />
            Performa Produk
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            style={{
              flex: 1,
              padding: 'var(--space-md) var(--space-lg)',
              background: activeTab === 'inventory' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'inventory' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'inventory' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)',
            }}
          >
            <Package size={18} />
            Laporan Inventori
          </button>
        </div>
      </div>

      {/* Sales Report Tab */}
      {activeTab === 'sales' && (
        <div className="animate-fade-in">
          {/* Filters */}
          <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Filter size={18} />
                Filter
              </h3>
              <button className="btn btn-primary btn-sm" onClick={fetchSalesReport}>
                Terapkan Filter
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Tanggal Mulai</label>
                <input
                  type="date"
                  className="form-input"
                  value={salesFilters.startDate}
                  onChange={(e) => setSalesFilters({ ...salesFilters, startDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Akhir</label>
                <input
                  type="date"
                  className="form-input"
                  value={salesFilters.endDate}
                  onChange={(e) => setSalesFilters({ ...salesFilters, endDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Kelompokkan</label>
                <select
                  className="form-input"
                  value={salesFilters.groupBy}
                  onChange={(e) => setSalesFilters({ ...salesFilters, groupBy: e.target.value as any })}
                >
                  <option value="day">Harian</option>
                  <option value="week">Mingguan</option>
                  <option value="month">Bulanan</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Toko</label>
                <select
                  className="form-input"
                  value={salesFilters.storeId}
                  onChange={(e) => setSalesFilters({ ...salesFilters, storeId: e.target.value })}
                >
                  <option value="">Semua Toko</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-tertiary)' }}>Memuat laporan penjualan...</p>
            </div>
          ) : salesReport ? (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
                    Total Pendapatan
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                    {formatCurrency(salesReport.summary.totalRevenue)}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
                    Total Transaksi
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {formatNumber(salesReport.summary.totalTransactions)}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
                    Rata-rata Transaksi
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>
                    {formatCurrency(salesReport.summary.averageTransaction)}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
                    Total Pajak
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {formatCurrency(salesReport.summary.totalTax)}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
                    Total Diskon
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>
                    {formatCurrency(salesReport.summary.totalDiscount)}
                  </div>
                </div>
              </div>

              {/* Sales Breakdown Table */}
              <div className="glass-panel" style={{ padding: 0 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: 'var(--space-lg)', 
                  borderBottom: '1px solid var(--border-subtle)' 
                }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                    Rincian Penjualan ({salesFilters.groupBy === 'day' ? 'Harian' : salesFilters.groupBy === 'week' ? 'Mingguan' : 'Bulanan'})
                  </h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={handleExportSales}>
                      <Download size={16} style={{ marginRight: '6px' }} />
                      CSV
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={handleExportSalesPdf} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                      <Download size={16} style={{ marginRight: '6px' }} />
                      PDF
                    </button>
                  </div>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1fr 1fr', 
                  gap: 'var(--space-md)', 
                  padding: 'var(--space-sm) var(--space-lg)', 
                  borderBottom: '1px solid var(--border-subtle)', 
                  color: 'var(--text-tertiary)', 
                  fontSize: '0.8rem', 
                  fontWeight: 600, 
                  textTransform: 'uppercase' 
                }}>
                  <div>{salesFilters.groupBy === 'day' ? 'Tanggal' : salesFilters.groupBy === 'week' ? 'Minggu' : 'Bulan'}</div>
                  <div>Pendapatan</div>
                  <div>Transaksi</div>
                </div>
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {(salesReport.daily || salesReport.weekly || salesReport.monthly || []).map((item: any, index: number) => (
                    <div 
                      key={index}
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 1fr 1fr', 
                        gap: 'var(--space-md)', 
                        padding: 'var(--space-md) var(--space-lg)', 
                        borderBottom: '1px solid var(--border-subtle)', 
                        alignItems: 'center' 
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>
                        {item.date ? formatDate(item.date) : item.week || item.month}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                        {formatCurrency(item.revenue)}
                      </div>
                      <div style={{ fontWeight: 500 }}>
                        {formatNumber(item.transactions)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
              <TrendingUp size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
              <p style={{ color: 'var(--text-tertiary)' }}>Belum ada data penjualan. Terapkan filter untuk melihat laporan.</p>
            </div>
          )}
        </div>
      )}

      {/* Product Performance Tab */}
      {activeTab === 'products' && (
        <div className="animate-fade-in">
          {/* Filters */}
          <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Filter size={18} />
                Filter
              </h3>
              <button className="btn btn-primary btn-sm" onClick={fetchProductReport}>
                Terapkan Filter
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={productFilters.startDate}
                  onChange={(e) => setProductFilters({ ...productFilters, startDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={productFilters.endDate}
                  onChange={(e) => setProductFilters({ ...productFilters, endDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Store</label>
                <select
                  className="form-input"
                  value={productFilters.storeId}
                  onChange={(e) => setProductFilters({ ...productFilters, storeId: e.target.value })}
                >
                  <option value="">All Stores</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={productFilters.categoryId}
                  onChange={(e) => setProductFilters({ ...productFilters, categoryId: e.target.value })}
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Top Products</label>
                <select
                  className="form-input"
                  value={productFilters.limit}
                  onChange={(e) => setProductFilters({ ...productFilters, limit: parseInt(e.target.value) })}
                >
                  <option value="10">Top 10</option>
                  <option value="20">Top 20</option>
                  <option value="50">Top 50</option>
                  <option value="100">Top 100</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-tertiary)' }}>Memuat performa produk...</p>
            </div>
          ) : productReport ? (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
                    Total Produk
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {formatNumber(productReport.summary.totalProducts)}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
                    Total Pendapatan
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                    {formatCurrency(productReport.summary.totalRevenue)}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
                    Total Profit
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>
                    {formatCurrency(productReport.summary.totalProfit)}
                  </div>
                </div>
              </div>

              {/* Top Products Table */}
              <div className="glass-panel" style={{ padding: 0 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: 'var(--space-lg)', 
                  borderBottom: '1px solid var(--border-subtle)' 
                }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                    Top Produk berdasarkan Pendapatan
                  </h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={handleExportProducts}>
                      <Download size={16} style={{ marginRight: '6px' }} />
                      CSV
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={handleExportProductsPdf} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                      <Download size={16} style={{ marginRight: '6px' }} />
                      PDF
                    </button>
                  </div>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', 
                  gap: 'var(--space-md)', 
                  padding: 'var(--space-sm) var(--space-lg)', 
                  borderBottom: '1px solid var(--border-subtle)', 
                  color: 'var(--text-tertiary)', 
                  fontSize: '0.8rem', 
                  fontWeight: 600, 
                  textTransform: 'uppercase' 
                }}>
                  <div>Produk</div>
                  <div>SKU</div>
                  <div>Terjual</div>
                  <div>Pendapatan</div>
                  <div>Profit</div>
                  <div>Harga Rata-rata</div>
                </div>
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {productReport.topProducts.map((product, index) => (
                    <div 
                      key={product.productId}
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', 
                        gap: 'var(--space-md)', 
                        padding: 'var(--space-md) var(--space-lg)', 
                        borderBottom: '1px solid var(--border-subtle)', 
                        alignItems: 'center' 
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                          {index + 1}. {product.productName}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {product.sku}
                      </div>
                      <div style={{ fontWeight: 500 }}>
                        {formatNumber(product.quantitySold)}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                        {formatCurrency(product.revenue)}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--warning)' }}>
                        {formatCurrency(product.profit)}
                      </div>
                      <div style={{ fontWeight: 500 }}>
                        {formatCurrency(product.averagePrice)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
              <BarChart3 size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
              <p style={{ color: 'var(--text-tertiary)' }}>Belum ada data produk. Terapkan filter untuk melihat laporan.</p>
            </div>
          )}
        </div>
      )}

      {/* Inventory Report Tab */}
      {activeTab === 'inventory' && (
        <div className="animate-fade-in">
          {/* Filters */}
          <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Filter size={18} />
                Filter
              </h3>
              <button className="btn btn-primary btn-sm" onClick={fetchInventoryReport}>
                Terapkan Filter
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Store</label>
                <select
                  className="form-input"
                  value={inventoryFilters.storeId}
                  onChange={(e) => setInventoryFilters({ ...inventoryFilters, storeId: e.target.value })}
                >
                  <option value="">All Stores</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={inventoryFilters.categoryId}
                  onChange={(e) => setInventoryFilters({ ...inventoryFilters, categoryId: e.target.value })}
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <input
                    type="checkbox"
                    checked={inventoryFilters.lowStockOnly}
                    onChange={(e) => setInventoryFilters({ ...inventoryFilters, lowStockOnly: e.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  Tampilkan Stok Rendah Saja
                </label>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-tertiary)' }}>Memuat laporan inventori...</p>
            </div>
          ) : inventoryReport ? (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
                    Total Produk
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {formatNumber(inventoryReport.summary.totalProducts)}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
                    Produk Stok Rendah
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>
                    {formatNumber(inventoryReport.summary.lowStockProducts)}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
                    Total Nilai Inventori
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                    {formatCurrency(inventoryReport.summary.totalInventoryValue)}
                  </div>
                </div>
              </div>

              {/* Inventory Table */}
              <div className="glass-panel" style={{ padding: 0 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: 'var(--space-lg)', 
                  borderBottom: '1px solid var(--border-subtle)' 
                }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                    Status Inventori
                  </h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={handleExportInventory}>
                      <Download size={16} style={{ marginRight: '6px' }} />
                      CSV
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={handleExportInventoryPdf} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                      <Download size={16} style={{ marginRight: '6px' }} />
                      PDF
                    </button>
                  </div>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', 
                  gap: 'var(--space-md)', 
                  padding: 'var(--space-sm) var(--space-lg)', 
                  borderBottom: '1px solid var(--border-subtle)', 
                  color: 'var(--text-tertiary)', 
                  fontSize: '0.8rem', 
                  fontWeight: 600, 
                  textTransform: 'uppercase' 
                }}>
                  <div>Produk</div>
                  <div>Kategori</div>
                  <div>Stok</div>
                  <div>Min. Stok</div>
                  <div>Harga Beli</div>
                  <div>Nilai</div>
                </div>
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {inventoryReport.products.map((product) => (
                    <div 
                      key={product.productId}
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', 
                        gap: 'var(--space-md)', 
                        padding: 'var(--space-md) var(--space-lg)', 
                        borderBottom: '1px solid var(--border-subtle)', 
                        alignItems: 'center',
                        background: product.isLowStock ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                          {product.productName}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                          {product.sku}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.9rem' }}>
                        {product.categoryName}
                      </div>
                      <div>
                        <span 
                          className="badge" 
                          style={{ 
                            background: product.isLowStock ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)', 
                            color: product.isLowStock ? '#ef4444' : '#22c55e',
                            fontWeight: 600
                          }}
                        >
                          {formatNumber(product.stock)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {formatNumber(product.lowStockThreshold)}
                      </div>
                      <div style={{ fontWeight: 500 }}>
                        {formatCurrency(product.cost)}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                        {formatCurrency(product.inventoryValue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
              <Package size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
              <p style={{ color: 'var(--text-tertiary)' }}>Belum ada data inventori. Terapkan filter untuk melihat laporan.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Package, Users, Receipt, TrendingUp, ArrowUp, ArrowDown, ShoppingCart, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { format } from 'date-fns';
import Link from 'next/link';

interface DashboardMetrics {
  period: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransaction: number;
    totalProducts: number;
    activeProducts: number;
    totalCustomers: number;
    newCustomers: number;
    lowStockProducts: number;
    totalInventoryValue: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
  lowStockAlerts: Array<{
    productId: string;
    productName: string;
    sku: string;
    currentStock: number;
    lowStockThreshold: number;
  }>;
  revenueChart: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<DashboardMetrics>('/reports/dashboard');
      setMetrics(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch dashboard metrics:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
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

  const stats = [
    {
      name: 'Total Revenue',
      value: loading ? 'Loading...' : formatCurrency(metrics?.metrics.totalRevenue || 0),
      icon: DollarSign,
      change: '+12.5%',
      changeType: 'positive',
      color: 'var(--success)',
      bgColor: 'var(--success-light)',
    },
    {
      name: 'Transactions',
      value: loading ? 'Loading...' : (metrics?.metrics.totalTransactions || 0).toString(),
      icon: Receipt,
      change: '+8.2%',
      changeType: 'positive',
      color: 'var(--accent-base)',
      bgColor: 'var(--accent-light)',
    },
    {
      name: 'Products',
      value: loading ? 'Loading...' : (metrics?.metrics.totalProducts || 0).toString(),
      icon: Package,
      change: '+3',
      changeType: 'positive',
      color: 'var(--info)',
      bgColor: 'var(--info-light)',
    },
    {
      name: 'Customers',
      value: loading ? 'Loading...' : (metrics?.metrics.totalCustomers || 0).toString(),
      icon: Users,
      change: `+${metrics?.metrics.newCustomers || 0} new`,
      changeType: 'positive',
      color: 'var(--warning)',
      bgColor: 'var(--warning-light)',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Welcome back, {user?.firstName || 'User'}! 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger">
          <div style={{ fontSize: '0.875rem' }}>{error}</div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid-cols-4" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
        {stats.map((stat) => (
          <div key={stat.name} className="stat-card">
            <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
              <div 
                className="flex-center" 
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: 'var(--radius-lg)',
                  background: stat.bgColor 
                }}
              >
                <stat.icon size={24} style={{ color: stat.color }} />
              </div>
            </div>
            <div className="stat-label">{stat.name}</div>
            <div className="stat-value">{stat.value}</div>
            <div className={`stat-change ${stat.changeType}`}>
              {stat.changeType === 'positive' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              <span>{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Data */}
      {!loading && metrics && (
        <div className="grid-cols-2" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
          {/* Revenue Trend */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Revenue Trend
              </h3>
            </div>
            <div className="card-body">
              {metrics.revenueChart.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {metrics.revenueChart.slice(0, 7).map((item) => {
                    const maxRevenue = Math.max(...metrics.revenueChart.map(r => r.revenue));
                    const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                    
                    return (
                      <div key={item.date} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', minWidth: '60px' }}>
                          {format(new Date(item.date), 'dd MMM')}
                        </span>
                        <div style={{ flex: 1, height: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${percentage}%`,
                              background: 'var(--accent-base)',
                              borderRadius: 'var(--radius-full)',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: '100px', textAlign: 'right' }}>
                          {formatCurrency(item.revenue)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <TrendingUp className="empty-state-icon" />
                  <p className="empty-state-description">No revenue data available yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Top Selling Products
              </h3>
            </div>
            <div className="card-body">
              {metrics.topProducts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {metrics.topProducts.slice(0, 5).map((product, index) => (
                    <div key={product.productId} className="flex-between">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <div 
                          className="flex-center" 
                          style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--accent-light)',
                            color: 'var(--accent-base)',
                            fontSize: '0.8125rem',
                            fontWeight: 700
                          }}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {product.productName}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {product.quantitySold} sold
                          </p>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatCurrency(product.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Package className="empty-state-icon" />
                  <p className="empty-state-description">No sales data available yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Alerts */}
      {!loading && metrics && metrics.lowStockAlerts.length > 0 && (
        <div className="card">
          <div className="card-header flex-between">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Low Stock Alerts
            </h3>
            <span className="badge badge-danger">
              {metrics.lowStockAlerts.length} items
            </span>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Current Stock</th>
                    <th>Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.lowStockAlerts.slice(0, 5).map((alert) => (
                    <tr key={alert.productId}>
                      <td style={{ fontWeight: 600 }}>{alert.productName}</td>
                      <td>{alert.sku}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 600 }}>
                        {alert.currentStock}
                      </td>
                      <td>{alert.lowStockThreshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Quick Actions
          </h3>
        </div>
        <div className="card-body">
          <div className="grid-cols-4" style={{ display: 'grid', gap: 'var(--space-md)' }}>
            <Link
              href="/dashboard/pos"
              className="card"
              style={{ 
                padding: 'var(--space-lg)', 
                textAlign: 'center',
                cursor: 'pointer',
                textDecoration: 'none'
              }}
            >
              <div 
                className="flex-center" 
                style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--accent-light)',
                  margin: '0 auto var(--space-md)'
                }}
              >
                <ShoppingCart size={28} style={{ color: 'var(--accent-base)' }} />
              </div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                New Sale
              </p>
            </Link>

            <Link
              href="/dashboard/products"
              className="card"
              style={{ 
                padding: 'var(--space-lg)', 
                textAlign: 'center',
                cursor: 'pointer',
                textDecoration: 'none'
              }}
            >
              <div 
                className="flex-center" 
                style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--info-light)',
                  margin: '0 auto var(--space-md)'
                }}
              >
                <Package size={28} style={{ color: 'var(--info)' }} />
              </div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Add Product
              </p>
            </Link>

            <Link
              href="/dashboard/customers"
              className="card"
              style={{ 
                padding: 'var(--space-lg)', 
                textAlign: 'center',
                cursor: 'pointer',
                textDecoration: 'none'
              }}
            >
              <div 
                className="flex-center" 
                style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--warning-light)',
                  margin: '0 auto var(--space-md)'
                }}
              >
                <Users size={28} style={{ color: 'var(--warning)' }} />
              </div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Add Customer
              </p>
            </Link>

            <Link
              href="/dashboard/reports"
              className="card"
              style={{ 
                padding: 'var(--space-lg)', 
                textAlign: 'center',
                cursor: 'pointer',
                textDecoration: 'none'
              }}
            >
              <div 
                className="flex-center" 
                style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--success-light)',
                  margin: '0 auto var(--space-md)'
                }}
              >
                <TrendingUp size={28} style={{ color: 'var(--success)' }} />
              </div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                View Reports
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

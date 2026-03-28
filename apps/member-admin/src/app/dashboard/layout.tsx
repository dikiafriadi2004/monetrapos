"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Store, LayoutDashboard, Package, 
  Users, Settings, LogOut, Banknote, ShieldAlert,
  Percent, Wallet, Receipt, Clock, ChefHat, Warehouse, CreditCard
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const menuItems = [
    { name: 'Analytics', href: '/dashboard', icon: LayoutDashboard },
    { name: 'POS / Cashier', href: '/dashboard/pos', icon: Banknote },
    { name: 'Cashier Shifts', href: '/dashboard/shifts', icon: Clock },
    { name: 'Kitchen Display', href: '/dashboard/kds', icon: ChefHat },
    { name: 'Products & Inventory', href: '/dashboard/products', icon: Package },
    { name: 'Stock Management', href: '/dashboard/inventory', icon: Warehouse },
    { name: 'Taxes & Discounts', href: '/dashboard/taxes', icon: Percent },
    { name: 'Payment Methods', href: '/dashboard/payments', icon: Wallet },
    { name: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
    { name: 'Employees & Roles', href: '/dashboard/employees', icon: ShieldAlert },
    { name: 'Customers', href: '/dashboard/customers', icon: Users },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Store Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 'var(--space-md)' }}>
          <div className="flex-center" style={{ gap: 'var(--space-sm)' }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', 
              background: 'var(--success)', color: 'white', display: 'flex', 
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Store size={18} />
            </div>
            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>MonetRAPOS</h3>
          </div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textAlign: 'center', marginTop: '4px' }}>
            Store Management
          </p>
        </div>

        <nav style={{ flex: 1, padding: '0 var(--space-xs)' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
                style={isActive ? { background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' } : {}}
              >
                <Icon />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: 'var(--space-md)' }}>
          <button 
            onClick={handleLogout}
            className="nav-link" 
            style={{ width: '100%', border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', justifyContent: 'flex-start' }}
          >
            <LogOut />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header flex-between">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 500 }}>
            {menuItems.find(m => m.href === pathname)?.name || 'Dashboard'}
          </h2>
          
          <div className="flex-center" style={{ gap: 'var(--space-md)' }}>
            <div className="badge badge-success">Premium Plan Active</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                {user?.name || 'User'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                {user?.email || ''}
              </div>
            </div>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: 'var(--radius-full)', 
              background: 'linear-gradient(135deg, var(--success), #059669)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, color: 'white'
            }}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <div className="dashboard-content animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import SubscriptionStatusBanner from '@/components/SubscriptionStatusBanner';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Receipt, 
  CreditCard, 
  Settings, 
  LogOut,
  Menu,
  X,
  FolderTree,
  ShoppingCart,
  Warehouse,
  FileText,
  Store,
  UserCog,
  ChevronRight,
  Puzzle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { subscriptionService } from '@/services/subscription.service';
import { Subscription } from '@/types/subscription.types';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'main' },
  { name: 'POS', href: '/dashboard/pos', icon: ShoppingCart, section: 'sales' },
  { name: 'Transactions', href: '/dashboard/transactions', icon: Receipt, section: 'sales' },
  { name: 'Products', href: '/dashboard/products', icon: Package, section: 'inventory' },
  { name: 'Categories', href: '/dashboard/categories', icon: FolderTree, section: 'inventory' },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Warehouse, section: 'inventory' },
  { name: 'Customers', href: '/dashboard/customers', icon: Users, section: 'customers' },
  { name: 'Employees', href: '/dashboard/employees', icon: UserCog, section: 'management' },
  { name: 'Stores', href: '/dashboard/stores', icon: Store, section: 'management' },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText, section: 'reports' },
  { name: 'Add-ons', href: '/dashboard/add-ons', icon: Puzzle, section: 'settings' },
  { name: 'Subscription', href: '/dashboard/subscription', icon: CreditCard, section: 'settings' },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, section: 'settings' },
];

const sections = [
  { id: 'main', title: 'Main' },
  { id: 'sales', title: 'Sales' },
  { id: 'inventory', title: 'Inventory' },
  { id: 'customers', title: 'Customers' },
  { id: 'management', title: 'Management' },
  { id: 'reports', title: 'Reports' },
  { id: 'settings', title: 'Settings' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, company, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // Fetch subscription status on mount
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const data = await subscriptionService.getCurrentSubscription();
        setSubscription(data);
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      }
    };

    fetchSubscription();
  }, []);

  const renderNavigation = () => {
    return sections.map((section) => {
      const sectionItems = navigation.filter((item) => item.section === section.id);
      if (sectionItems.length === 0) return null;

      return (
        <div key={section.id} className="nav-section">
          <div className="nav-section-title">{section.title}</div>
          {sectionItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon />
                <span>{item.name}</span>
                {isActive && <ChevronRight className="ml-auto" size={16} />}
              </Link>
            );
          })}
        </div>
      );
    });
  };

  return (
    <ProtectedRoute>
      <div className="dashboard-layout">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}
          style={{
            position: sidebarOpen ? 'fixed' : undefined,
            zIndex: sidebarOpen ? 50 : undefined,
          }}
        >
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-base)' }}>
                <ShoppingCart size={20} color="white" />
              </div>
              <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>MonetRAPOS</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {renderNavigation()}
          </nav>

          {/* User Profile */}
          <div className="flex-shrink-0 p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white" style={{ background: 'var(--accent-base)' }}>
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {company?.name}
                </p>
              </div>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="dashboard-main">
          {/* Top bar (mobile) */}
          <div className="dashboard-header lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-base)' }}>
                <ShoppingCart size={16} color="white" />
              </div>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>MonetRAPOS</span>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-600"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            {/* Subscription Status Banner */}
            <SubscriptionStatusBanner subscription={subscription} />
            
            <div className="dashboard-content">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

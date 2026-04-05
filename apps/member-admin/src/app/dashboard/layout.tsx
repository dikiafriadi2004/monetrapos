'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePermission, PERMISSIONS } from '@/hooks/usePermission';
import ProtectedRoute from '@/components/ProtectedRoute';
import SubscriptionStatusBanner from '@/components/SubscriptionStatusBanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import NotificationBell from '@/components/NotificationBell';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Users, Receipt, CreditCard, Settings, LogOut, Menu, X,
  FolderTree, ShoppingCart, Warehouse, FileText, Store, UserCog, ChevronRight,
  Puzzle, Star, BarChart3, UtensilsCrossed, Grid3x3, ChefHat, Sliders,
  SplitSquareHorizontal, Shirt, ClipboardList, CalendarDays, Bell, Shield,
  FileCheck, ShieldCheck, Building2, Tag, Percent, Clock,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { subscriptionService } from '@/services/subscription.service';
import { Subscription } from '@/types/subscription.types';

const navigation = [
  { name: 'Dashboard',        href: '/dashboard',                          icon: LayoutDashboard,       section: 'main' },
  { name: 'POS',              href: '/dashboard/pos',                      icon: ShoppingCart,          section: 'sales',      permission: PERMISSIONS.POS_CREATE },
  { name: 'Transactions',     href: '/dashboard/transactions',             icon: Receipt,               section: 'sales',      permission: PERMISSIONS.FINANCE_TRANSACTIONS },
  { name: 'Discounts',        href: '/dashboard/discounts',                icon: Percent,               section: 'sales',      permission: PERMISSIONS.PRODUCT_VIEW },
  { name: 'Shifts',           href: '/dashboard/shifts',                   icon: Clock,                 section: 'sales',      permission: PERMISSIONS.EMPLOYEE_VIEW },
  // Inventory - hanya untuk retail & fnb (laundry tidak butuh produk)
  { name: 'Products',         href: '/dashboard/products',                 icon: Package,               section: 'inventory',  permission: PERMISSIONS.PRODUCT_VIEW,    businessTypes: ['retail', 'fnb'] },
  { name: 'Categories',       href: '/dashboard/categories',               icon: FolderTree,            section: 'inventory',  permission: PERMISSIONS.PRODUCT_VIEW,    businessTypes: ['retail', 'fnb'] },
  { name: 'Inventory',        href: '/dashboard/inventory',                icon: Warehouse,             section: 'inventory',  permission: PERMISSIONS.INVENTORY_VIEW,  businessTypes: ['retail', 'fnb'] },
  { name: 'Suppliers',        href: '/dashboard/inventory/suppliers',      icon: Building2,             section: 'inventory',  permission: PERMISSIONS.INVENTORY_VIEW,  businessTypes: ['retail', 'fnb'] },
  { name: 'Purchase Orders',  href: '/dashboard/inventory/purchase-orders',icon: ClipboardList,         section: 'inventory',  permission: PERMISSIONS.INVENTORY_VIEW,  businessTypes: ['retail', 'fnb'] },
  { name: 'Stock Opname',     href: '/dashboard/inventory/stock-opname',   icon: FileCheck,             section: 'inventory',  permission: PERMISSIONS.INVENTORY_VIEW,  businessTypes: ['retail', 'fnb'] },
  { name: 'Customers',        href: '/dashboard/customers',                icon: Users,                 section: 'customers',  permission: PERMISSIONS.CUSTOMER_VIEW },
  { name: 'Loyalty Program',  href: '/dashboard/customers/loyalty',        icon: Star,                  section: 'customers',  permission: PERMISSIONS.CUSTOMER_LOYALTY },
  { name: 'Employees',        href: '/dashboard/employees',                icon: UserCog,               section: 'management', permission: PERMISSIONS.EMPLOYEE_VIEW },
  { name: 'Users',            href: '/dashboard/users',                    icon: Users,                 section: 'management' },
  { name: 'Stores',           href: '/dashboard/stores',                   icon: Store,                 section: 'management', permission: PERMISSIONS.STORE_VIEW },
  { name: 'Reports',          href: '/dashboard/reports',                  icon: FileText,              section: 'reports',    permission: PERMISSIONS.FINANCE_REPORTS },
  { name: 'Advanced Reports', href: '/dashboard/reports/advanced',         icon: BarChart3,             section: 'reports',    permission: PERMISSIONS.FINANCE_REPORTS },
  // FnB - hanya untuk jenis usaha fnb
  { name: 'FnB Orders',       href: '/dashboard/fnb/orders',               icon: UtensilsCrossed,       section: 'fnb',        permission: PERMISSIONS.KITCHEN_VIEW,    businessTypes: ['fnb'] },
  { name: 'Tables',           href: '/dashboard/fnb/tables',               icon: Grid3x3,               section: 'fnb',        permission: PERMISSIONS.SETTINGS_TABLE,  businessTypes: ['fnb'] },
  { name: 'KDS',              href: '/dashboard/kds',                      icon: ChefHat,               section: 'fnb',        permission: PERMISSIONS.KITCHEN_VIEW,    businessTypes: ['fnb'] },
  { name: 'Modifiers',        href: '/dashboard/fnb/modifiers',            icon: Sliders,               section: 'fnb',        permission: PERMISSIONS.SETTINGS_TABLE,  businessTypes: ['fnb'] },
  { name: 'Split Bill',       href: '/dashboard/fnb/split-bill',           icon: SplitSquareHorizontal, section: 'fnb',        permission: PERMISSIONS.POS_CREATE,      businessTypes: ['fnb'] },
  // Laundry - hanya untuk jenis usaha laundry
  { name: 'Laundry Orders',   href: '/dashboard/laundry/orders',           icon: Shirt,                 section: 'laundry',    permission: PERMISSIONS.LAUNDRY_VIEW,    businessTypes: ['laundry'] },
  { name: 'Item Checklist',   href: '/dashboard/laundry/checklist',        icon: ClipboardList,         section: 'laundry',    permission: PERMISSIONS.LAUNDRY_UPDATE,  businessTypes: ['laundry'] },
  { name: 'Service Types',    href: '/dashboard/laundry/service-types',    icon: Settings,              section: 'laundry',    permission: PERMISSIONS.LAUNDRY_VIEW,    businessTypes: ['laundry'] },
  { name: 'Schedule',         href: '/dashboard/laundry/schedule',         icon: CalendarDays,          section: 'laundry',    permission: PERMISSIONS.LAUNDRY_VIEW,    businessTypes: ['laundry'] },
  { name: 'Notifications',    href: '/dashboard/settings/notifications',   icon: Bell,                  section: 'settings' },
  { name: 'Add-ons',          href: '/dashboard/add-ons',                  icon: Puzzle,                section: 'settings',   permission: PERMISSIONS.SETTINGS_SUBSCRIPTION },
  { name: 'Subscription',     href: '/dashboard/subscription',             icon: CreditCard,            section: 'settings',   permission: PERMISSIONS.SETTINGS_SUBSCRIPTION },
  { name: 'Billing',          href: '/dashboard/billing',                  icon: FileCheck,             section: 'settings',   permission: PERMISSIONS.SETTINGS_SUBSCRIPTION },
  { name: 'Roles',            href: '/dashboard/settings/roles',           icon: ShieldCheck,           section: 'settings',   permission: PERMISSIONS.EMPLOYEE_MANAGE_ROLE },
  { name: 'Audit Logs',       href: '/dashboard/audit',                    icon: Shield,                section: 'settings' },
  { name: 'Settings',         href: '/dashboard/settings',                 icon: Settings,              section: 'settings' },
];

const sections = [
  { id: 'main',       title: 'Main' },
  { id: 'sales',      title: 'Sales' },
  { id: 'inventory',  title: 'Inventory' },
  { id: 'customers',  title: 'Customers' },
  { id: 'management', title: 'Management' },
  { id: 'reports',    title: 'Reports' },
  { id: 'fnb',        title: 'F&B' },
  { id: 'laundry',    title: 'Laundry' },
  { id: 'settings',   title: 'Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, company, logout } = useAuth();
  const { hasPermission, isOwnerOrAdmin } = usePermission();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    subscriptionService.getCurrentSubscription().then(setSubscription).catch(() => {});
  }, []);

  // businessType dari company - default 'retail' jika belum diset
  const businessType = (company as any)?.businessType || 'retail';

  const renderNav = () => sections.map(section => {
    const items = navigation.filter(item => {
      if (item.section !== section.id) return false;
      // Filter berdasarkan jenis usaha
      if ((item as any).businessTypes && !(item as any).businessTypes.includes(businessType)) return false;
      if (!item.permission) return true;
      if (isOwnerOrAdmin) return true;
      return hasPermission(item.permission);
    });
    if (!items.length) return null;
    return (
      <div key={section.id} className="nav-section">
        <div className="nav-section-title">{section.title}</div>
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.name} href={item.href} className={`nav-link ${active ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <item.icon size={18} />
              <span>{item.name}</span>
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
      </div>
    );
  });

  return (
    <ProtectedRoute>
      <div className="dashboard-layout">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''} lg:relative lg:translate-x-0`}>
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <ShoppingCart size={18} className="text-white" />
              </div>
              <span className="font-bold text-gray-900">MonetraPOS</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-2">{renderNav()}</nav>

          {/* User */}
          <div className="flex-shrink-0 p-3 border-t border-gray-200">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500 truncate">{company?.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <NotificationBell />
                <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Logout">
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="dashboard-main">
          {/* Mobile header */}
          <div className="dashboard-header lg:hidden">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700">
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2 mx-auto">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <ShoppingCart size={15} className="text-white" />
              </div>
              <span className="font-bold text-gray-900">MonetraPOS</span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button onClick={logout} className="text-gray-400 hover:text-red-500">
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto">
            <SubscriptionStatusBanner subscription={subscription} />
            <div className="dashboard-content">
              <ErrorBoundary>{children}</ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}


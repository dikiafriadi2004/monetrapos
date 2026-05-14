'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePermission, PERMISSIONS } from '@/hooks/usePermission';
import ProtectedRoute from '@/components/ProtectedRoute';
import SubscriptionStatusBanner from '@/components/SubscriptionStatusBanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import NotificationBell from '@/components/NotificationBell';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, Users, Receipt, CreditCard, Settings, LogOut, Menu, X,
  FolderTree, ShoppingCart, Warehouse, FileText, Store, UserCog, ChevronRight,
  Puzzle, Star, BarChart3, UtensilsCrossed, Grid3x3, ChefHat, Sliders,
  SplitSquareHorizontal, Shirt, ClipboardList, CalendarDays, Bell, Shield,
  FileCheck, ShieldCheck, Building2, Tag, Percent, Lock, Zap,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { subscriptionService } from '@/services/subscription.service';
import { Subscription } from '@/types/subscription.types';

const navigation = [
  { name: 'Dashboard',        href: '/dashboard',                          icon: LayoutDashboard,       section: 'main' },
  { name: 'POS',              href: '/dashboard/pos',                      icon: ShoppingCart,          section: 'sales',      permission: PERMISSIONS.POS_CREATE },
  { name: 'Transactions',     href: '/dashboard/transactions',             icon: Receipt,               section: 'sales',      permission: PERMISSIONS.FINANCE_TRANSACTIONS },
  { name: 'Discounts',        href: '/dashboard/discounts',                icon: Percent,               section: 'sales',      permission: PERMISSIONS.FINANCE_DISCOUNT },
  // Inventory - hanya untuk retail & fnb (laundry tidak butuh produk)
  { name: 'Products',         href: '/dashboard/products',                 icon: Package,               section: 'inventory',  permission: PERMISSIONS.PRODUCT_VIEW,    businessTypes: ['retail', 'fnb'] },
  { name: 'Categories',       href: '/dashboard/categories',               icon: FolderTree,            section: 'inventory',  permission: PERMISSIONS.PRODUCT_VIEW,    businessTypes: ['retail', 'fnb'] },
  { name: 'Inventory',        href: '/dashboard/inventory',                icon: Warehouse,             section: 'inventory',  permission: PERMISSIONS.INVENTORY_VIEW,  businessTypes: ['retail', 'fnb'] },
  { name: 'Suppliers',        href: '/dashboard/inventory/suppliers',      icon: Building2,             section: 'inventory',  permission: PERMISSIONS.INVENTORY_VIEW,  businessTypes: ['retail', 'fnb'] },
  { name: 'Purchase Orders',  href: '/dashboard/inventory/purchase-orders',icon: ClipboardList,         section: 'inventory',  permission: PERMISSIONS.INVENTORY_VIEW,  businessTypes: ['retail', 'fnb'] },
  { name: 'Stock Opname',     href: '/dashboard/inventory/stock-opname',   icon: FileCheck,             section: 'inventory',  permission: PERMISSIONS.INVENTORY_OPNAME,businessTypes: ['retail', 'fnb'] },
  { name: 'Customers',        href: '/dashboard/customers',                icon: Users,                 section: 'customers',  permission: PERMISSIONS.CUSTOMER_VIEW },
  { name: 'Loyalty Program',  href: '/dashboard/customers/loyalty',        icon: Star,                  section: 'customers',  permission: PERMISSIONS.CUSTOMER_LOYALTY },
  { name: 'Employees',        href: '/dashboard/employees',                icon: UserCog,               section: 'management', permission: PERMISSIONS.EMPLOYEE_VIEW },
  { name: 'Absensi',          href: '/dashboard/attendance',               icon: CalendarDays,          section: 'management', permission: PERMISSIONS.EMPLOYEE_CLOCK },
  { name: 'Users',            href: '/dashboard/users',                    icon: Users,                 section: 'management', permission: PERMISSIONS.EMPLOYEE_MANAGE_ROLE },
  { name: 'Stores',           href: '/dashboard/stores',                   icon: Store,                 section: 'management', permission: PERMISSIONS.STORE_VIEW },
  { name: 'Reports',          href: '/dashboard/reports',                  icon: FileText,              section: 'reports',    permission: PERMISSIONS.FINANCE_REPORTS },
  { name: 'Laporan Keuangan', href: '/dashboard/reports/keuangan',         icon: BarChart3,             section: 'reports',    permission: PERMISSIONS.FINANCE_REPORTS },
  { name: 'Biaya Operasional',href: '/dashboard/expenses',                 icon: Tag,                   section: 'reports',    permission: PERMISSIONS.FINANCE_REPORTS },
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
  { name: 'Notifications',    href: '/dashboard/settings/notifications',   icon: Bell,                  section: 'settings',   permission: PERMISSIONS.SETTINGS_STORE },
  { name: 'Integrations',     href: '/dashboard/settings/integrations',    icon: SplitSquareHorizontal, section: 'settings',   permission: PERMISSIONS.SETTINGS_STORE },
  { name: 'Payment Methods',  href: '/dashboard/settings/payment-methods', icon: CreditCard,            section: 'settings',   permission: PERMISSIONS.SETTINGS_STORE },
  { name: 'Add-ons',          href: '/dashboard/add-ons',                  icon: Puzzle,                section: 'settings',   permission: PERMISSIONS.SETTINGS_SUBSCRIPTION },
  { name: 'Subscription',     href: '/dashboard/subscription',             icon: CreditCard,            section: 'settings',   permission: PERMISSIONS.SETTINGS_SUBSCRIPTION },
  { name: 'Billing',          href: '/dashboard/billing',                  icon: FileCheck,             section: 'settings',   permission: PERMISSIONS.SETTINGS_SUBSCRIPTION },
  { name: 'Roles',            href: '/dashboard/settings/roles',           icon: ShieldCheck,           section: 'settings',   permission: PERMISSIONS.EMPLOYEE_MANAGE_ROLE },
  { name: 'Audit Logs',       href: '/dashboard/audit',                    icon: Shield,                section: 'settings',   permission: PERMISSIONS.FINANCE_REPORTS },
  { name: 'Settings',         href: '/dashboard/settings',                 icon: Settings,              section: 'settings',   permission: PERMISSIONS.SETTINGS_STORE },
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
  const { user, company, logout, subscription: authSubscription } = useAuth();
  const { hasPermission, isOwnerOrAdmin } = usePermission();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    // Use subscription from AuthContext first, fallback to service
    if (authSubscription) {
      const sub = authSubscription as any;
      // Normalize trial_end field
      if (sub.trial_end && !sub.trialEnd) sub.trialEnd = sub.trial_end;
      setSubscription(sub);
    } else {
      subscriptionService.getCurrentSubscription().then(setSubscription).catch(() => {});
    }
  }, [authSubscription]);

  // businessType dari company - default 'retail' jika belum diset
  const businessType = (company as any)?.businessType || 'retail';

  // Cek apakah route saat ini membutuhkan permission tertentu
  useEffect(() => {
    if (!user) return;

    // Cari nav item yang paling spesifik match dengan pathname saat ini
    // Exact match selalu menang, lalu ambil yang href-nya paling panjang
    let matchedItem: typeof navigation[0] | null = null;

    for (const item of navigation) {
      if (!item.permission) continue;

      const isExact = pathname === item.href;
      // Untuk startsWith, pastikan ada separator '/' setelah href
      // Ini mencegah '/dashboard/settings' match '/dashboard/settings-other'
      const isChild = pathname.startsWith(item.href + '/');

      if (!isExact && !isChild) continue;

      // Pilih yang paling spesifik (href terpanjang)
      if (!matchedItem || item.href.length > matchedItem.href.length) {
        matchedItem = item;
      }
    }

    if (matchedItem?.permission && !hasPermission(matchedItem.permission)) {
      router.replace('/dashboard?error=forbidden');
    }
  }, [pathname, user, hasPermission, router]);

  // Features blocked during trial
  const TRIAL_BLOCKED_PATHS = [
    '/dashboard/customers',
    '/dashboard/employees',
    '/dashboard/reports/advanced',
    '/dashboard/stores',
    '/dashboard/add-ons',
  ];

  const isTrialBlocked = (href: string) => {
    if (subscription?.status !== 'trial') return false;
    return TRIAL_BLOCKED_PATHS.some(p => href.startsWith(p));
  };

  const renderNav = () => sections.map(section => {
    const items = navigation.filter(item => {
      if (item.section !== section.id) return false;
      // Filter berdasarkan jenis usaha
      if ((item as any).businessTypes && !(item as any).businessTypes.includes(businessType)) return false;
      // Jika tidak ada permission requirement, tampilkan ke semua
      if (!item.permission) return true;
      // Cek permission dari JWT
      return hasPermission(item.permission);
    });
    if (!items.length) return null;

    // Cari item yang paling spesifik match dengan pathname
    const bestMatch = items.reduce((best, item) => {
      if (pathname === item.href) return item; // exact match selalu menang
      if (pathname.startsWith(item.href + '/')) {
        if (!best) return item;
        return item.href.length > best.href.length ? item : best; // lebih panjang = lebih spesifik
      }
      return best;
    }, null as typeof items[0] | null);

    return (
      <div key={section.id} className="nav-section">
        <div className="nav-section-title">{section.title}</div>
        {items.map(item => {
          // Dashboard hanya aktif jika exact match
          const isExact = pathname === item.href;
          // isParent hanya true jika item ini adalah bestMatch (paling spesifik)
          const isParent = item.href !== '/dashboard' &&
            pathname.startsWith(item.href + '/') &&
            bestMatch?.href === item.href;
          const active = isExact || isParent;
          const blocked = isTrialBlocked(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-link ${active ? 'active' : ''} ${blocked ? 'opacity-60' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
              {blocked && <Lock size={12} className="ml-auto text-gray-400" />}
              {!blocked && active && <ChevronRight size={14} className="ml-auto" />}
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

          {/* Trial Badge */}
          {subscription?.status === 'trial' && (() => {
            const trialEnd = subscription.trialEnd || subscription.trial_end;
            const daysLeft = trialEnd
              ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000))
              : 0;
            const isUrgent = daysLeft <= 3;
            return (
              <div style={{
                margin: '0 0.75rem 0.5rem',
                padding: '0.75rem',
                background: isUrgent
                  ? 'linear-gradient(135deg, #fef3c7, #fde68a)'
                  : 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
                borderRadius: 10,
                border: `1px solid ${isUrgent ? '#fbbf24' : '#a78bfa'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isUrgent ? '#92400e' : '#5b21b6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isUrgent ? '⚠️ Trial' : '✨ Trial'}
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isUrgent ? '#dc2626' : '#7c3aed' }}>
                    {daysLeft} hari
                  </span>
                </div>
                <Link
                  href="/upgrade"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '0.375rem',
                    background: isUrgent ? '#f59e0b' : '#7c3aed',
                    color: 'white',
                    borderRadius: 6,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Zap size={12} />
                  Upgrade Sekarang
                </Link>
              </div>
            );
          })()}

          {/* User */}
          <div className="flex-shrink-0 p-3 border-t border-gray-200">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50">
              <Link href="/dashboard/profile" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-indigo-500 truncate">Edit Profile</p>
                </div>
              </Link>
              <div className="flex items-center gap-1 flex-shrink-0">
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


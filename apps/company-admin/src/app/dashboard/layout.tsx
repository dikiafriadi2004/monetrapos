"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Building, LayoutDashboard, Users, Settings, LogOut, PackageSearch, CreditCard, Receipt, Shield, ShoppingBag, Menu, X, Globe, Key } from 'lucide-react';
import { api } from '../../lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('company_token');
    if (!token) { router.push('/login'); } else { api.defaults.headers.common['Authorization'] = `Bearer ${token}`; }
  }, [router]);

  const handleLogout = () => { localStorage.removeItem('company_token'); router.push('/login'); };

  const menuItems = [
    { name: 'Overview',          href: '/dashboard',                    icon: LayoutDashboard },
    { name: 'Members',           href: '/dashboard/members',            icon: Users },
    { name: 'Transactions',      href: '/dashboard/transactions',       icon: Receipt },
    { name: 'Marketplace',       href: '/dashboard/features',           icon: PackageSearch },
    { name: 'Add-ons',           href: '/dashboard/add-ons',            icon: ShoppingBag },
    { name: 'Subscriptions',     href: '/dashboard/subscriptions',      icon: CreditCard },
    { name: 'Permissions',       href: '/dashboard/permissions',        icon: Key },
    { name: 'Audit Logs',        href: '/dashboard/audit',              icon: Shield },
    { name: 'Landing Page',      href: '/dashboard/landing',            icon: Globe },
    { name: 'Platform Settings', href: '/dashboard/settings',           icon: Settings },
  ];

  if (!isClient) return null;

  return (
    <div className="dashboard-layout">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-40 transition-transform duration-300`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center"><Building size={18} className="text-white"/></div>
            <span className="font-bold text-gray-900">MonetraPOS</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        <div className="flex-shrink-0 px-3 py-2 border-b border-gray-100">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-3">Company Admin</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          <div className="nav-section">
            {menuItems.map(item => {
              const active = pathname === item.href;
              return (
                <Link key={item.name} href={item.href} className={`nav-link ${active ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                  <item.icon size={18}/><span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="flex-shrink-0 p-3 border-t border-gray-200">
          <button onClick={handleLogout} className="nav-link text-red-500 hover:bg-red-50 hover:text-red-600 w-full">
            <LogOut size={18}/><span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="dashboard-main">
        <header className="dashboard-header flex-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700"><Menu size={22}/></button>
            <h2 className="text-base font-semibold text-gray-900">{menuItems.find(m => m.href === pathname)?.name || 'Dashboard'}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block"><div className="text-sm font-semibold text-gray-900">Super Admin</div><div className="text-xs text-gray-400">Owner</div></div>
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">SA</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="dashboard-content animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}


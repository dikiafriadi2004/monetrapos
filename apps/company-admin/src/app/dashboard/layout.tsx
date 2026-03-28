"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Building, LayoutDashboard, Users, 
  Settings, LogOut, PackageSearch, CreditCard, Receipt, Shield 
} from 'lucide-react';
import { api } from '../../lib/api';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Simple mock auth guard
    const token = localStorage.getItem('company_token');
    if (!token) {
      router.push('/login');
    } else {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('company_token');
    router.push('/login');
  };

  const menuItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Members', href: '/dashboard/members', icon: Users },
    { name: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
    { name: 'Marketplace', href: '/dashboard/features', icon: PackageSearch },
    { name: 'Subscriptions', href: '/dashboard/subscriptions', icon: CreditCard },
    { name: 'Audit Logs', href: '/dashboard/audit', icon: Shield },
    { name: 'Platform Settings', href: '/dashboard/settings', icon: Settings },
  ];

  if (!isClient) return null; // Prevent hydration mismatch

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 'var(--space-md)' }}>
          <div className="flex-center" style={{ gap: 'var(--space-sm)' }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', 
              background: 'var(--accent-base)', color: 'white', display: 'flex', 
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Building size={18} />
            </div>
            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>MonetRAPOS</h3>
          </div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textAlign: 'center', marginTop: '4px' }}>
            Company Admin
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
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Super Admin</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Owner</div>
            </div>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: 'var(--radius-full)', 
              background: 'linear-gradient(135deg, var(--accent-base), var(--accent-hover))', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, color: 'white'
            }}>
              SA
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

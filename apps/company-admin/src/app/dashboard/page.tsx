"use client";

import { useEffect, useState } from 'react';
import { Users, Building2, CreditCard, TrendingUp, Activity, DollarSign } from 'lucide-react';
import { api } from '../../lib/api';

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  suspendedMembers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalPlans: number;
  activePlans: number;
}

interface RecentMember {
  id: string;
  businessName: string;
  email: string;
  status: string;
  createdAt: string;
  subscriptionPlan?: {
    name: string;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    suspendedMembers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalPlans: 0,
    activePlans: 0
  });
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch members
      const membersData: any = await api.get('/admin/companies');
      const members = Array.isArray(membersData) ? membersData : (membersData?.data || []);

      // Fetch subscription plans
      const plansData: any = await api.get('/subscription-plans');
      const plans = Array.isArray(plansData) ? plansData : [];

      // Fetch invoices for revenue
      let invoices: any[] = [];
      try {
        const invoicesData: any = await api.get('/billing/admin/invoices');
        invoices = Array.isArray(invoicesData) ? invoicesData : [];
      } catch {}

      // Filter out super-admin company
      const realMembers = members.filter((m: any) => m.slug !== 'super-admin');

      // Calculate stats
      const activeMembers = realMembers.filter((m: any) => m.status === 'active').length;
      const suspendedMembers = realMembers.filter((m: any) => m.status === 'suspended').length;
      const activePlans = plans.filter((p: any) => p.isActive).length;

      // Revenue from paid invoices
      const paidInvoices = invoices.filter((i: any) => i.status === 'paid');
      const totalRevenue = paidInvoices.reduce((sum: number, i: any) => sum + Number(i.total || 0), 0);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRevenue = paidInvoices
        .filter((i: any) => new Date(i.createdAt) >= startOfMonth)
        .reduce((sum: number, i: any) => sum + Number(i.total || 0), 0);

      setStats({
        totalMembers: realMembers.length,
        activeMembers,
        suspendedMembers,
        totalRevenue,
        monthlyRevenue,
        totalPlans: plans.length,
        activePlans
      });

      // Get recent members (last 5)
      const recent = realMembers
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      setRecentMembers(recent);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `Rp ${(amount || 0).toLocaleString('id-ID')}`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'var(--success)';
      case 'suspended': return 'var(--danger)';
      case 'pending': return 'var(--warning)';
      default: return 'var(--text-tertiary)';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active': return 'rgba(16, 185, 129, 0.15)';
      case 'suspended': return 'rgba(239, 68, 68, 0.15)';
      case 'pending': return 'rgba(245, 158, 11, 0.15)';
      default: return 'var(--bg-tertiary)';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          border: '4px solid var(--border-base)', 
          borderTopColor: 'var(--accent-base)', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto var(--space-md)'
        }} />
        <p style={{ color: 'var(--text-tertiary)' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Overview of your SaaS platform performance and member activity.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid-cols-4" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Total Members */}
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-lg)' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(99, 102, 241, 0.15)', 
              color: 'var(--accent-base)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Users size={20} />
            </div>
            <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-base)' }}>
              Total
            </span>
          </div>
          <h3 style={{ fontSize: '2rem', marginBottom: '4px' }}>{stats.totalMembers}</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Total Members</p>
        </div>

        {/* Active Members */}
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-lg)', animationDelay: '0.1s' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: 'var(--success)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Activity size={20} />
            </div>
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
              Active
            </span>
          </div>
          <h3 style={{ fontSize: '2rem', marginBottom: '4px' }}>{stats.activeMembers}</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Active Members</p>
        </div>

        {/* Monthly Revenue */}
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-lg)', animationDelay: '0.2s' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(245, 158, 11, 0.15)', 
              color: 'var(--warning)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <DollarSign size={20} />
            </div>
            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}>
              This Month
            </span>
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{formatCurrency(stats.monthlyRevenue)}</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Monthly Revenue</p>
        </div>

        {/* Active Plans */}
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-lg)', animationDelay: '0.3s' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(236, 72, 153, 0.15)', 
              color: '#ec4899', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <CreditCard size={20} />
            </div>
            <span className="badge" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
              Plans
            </span>
          </div>
          <h3 style={{ fontSize: '2rem', marginBottom: '4px' }}>{stats.activePlans}</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Active Plans</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-xl)' }}>
        {/* Recent Members */}
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-xl)', animationDelay: '0.4s' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '1.125rem' }}>Recent Members</h3>
            <a href="/dashboard/members" style={{ fontSize: '0.875rem', color: 'var(--accent-base)', textDecoration: 'none' }}>
              View All →
            </a>
          </div>

          {recentMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-tertiary)' }}>
              <Users size={48} style={{ margin: '0 auto var(--space-md)', opacity: 0.3 }} />
              <p>No members yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {recentMembers.map((member) => (
                <div 
                  key={member.id} 
                  style={{ 
                    padding: 'var(--space-md)', 
                    background: 'var(--bg-tertiary)', 
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)'
                  }}
                >
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: 'var(--accent-base)', 
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    flexShrink: 0
                  }}>
                    {member.businessName?.charAt(0).toUpperCase() || 'M'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '0.9375rem', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {member.businessName}
                    </h4>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {member.email}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span 
                      className="badge" 
                      style={{ 
                        background: getStatusBg(member.status), 
                        color: getStatusColor(member.status),
                        marginBottom: '4px',
                        display: 'inline-block'
                      }}
                    >
                      {member.status}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {formatDate(member.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="glass-panel animate-fade-in" style={{ padding: 'var(--space-xl)', animationDelay: '0.5s' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-lg)' }}>Quick Stats</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Member Status Breakdown */}
            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <div className="flex-between" style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Active</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)' }}>{stats.activeMembers}</span>
              </div>
              <div style={{ 
                height: '6px', 
                background: 'var(--bg-secondary)', 
                borderRadius: '3px', 
                overflow: 'hidden' 
              }}>
                <div style={{ 
                  height: '100%', 
                  width: `${stats.totalMembers > 0 ? (stats.activeMembers / stats.totalMembers * 100) : 0}%`, 
                  background: 'var(--success)',
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>

            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <div className="flex-between" style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Suspended</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--danger)' }}>{stats.suspendedMembers}</span>
              </div>
              <div style={{ 
                height: '6px', 
                background: 'var(--bg-secondary)', 
                borderRadius: '3px', 
                overflow: 'hidden' 
              }}>
                <div style={{ 
                  height: '100%', 
                  width: `${stats.totalMembers > 0 ? (stats.suspendedMembers / stats.totalMembers * 100) : 0}%`, 
                  background: 'var(--danger)',
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>

            {/* Revenue Info */}
            <div style={{ 
              padding: 'var(--space-md)', 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <TrendingUp size={16} style={{ color: 'var(--accent-base)' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-base)' }}>Total Revenue</span>
              </div>
              <h4 style={{ fontSize: '1.5rem', color: 'var(--accent-base)' }}>{formatCurrency(stats.totalRevenue)}</h4>
            </div>

            {/* Plans Info */}
            <div style={{ 
              padding: 'var(--space-md)', 
              background: 'var(--bg-tertiary)', 
              borderRadius: 'var(--radius-md)'
            }}>
              <div className="flex-between" style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Plans</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{stats.totalPlans}</span>
              </div>
              <div className="flex-between">
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Active Plans</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)' }}>{stats.activePlans}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from 'react';
import { Users, CreditCard, TrendingUp, Activity, DollarSign, RefreshCcw } from 'lucide-react';
import { api } from '../../lib/api';
import { format } from 'date-fns';

interface DashboardStats { totalMembers: number; activeMembers: number; suspendedMembers: number; pendingMembers: number; totalRevenue: number; monthlyRevenue: number; totalPlans: number; activePlans: number; totalTransactions: number; paidTransactions: number; }
interface RevenuePoint { date: string; amount: number; transactions: number; }
interface GrowthPoint { date: string; total: number; new: number; }
interface TopPlan { planId: string; planName: string; subscribers: number; }

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [topPlans, setTopPlans] = useState<TopPlan[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => { fetchAll(); }, [period]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsData, revenueData, growthData, plansData, activityData] = await Promise.allSettled([
        api.get('/admin/dashboard/stats'),
        api.get(`/admin/dashboard/revenue?period=${period}`),
        api.get(`/admin/dashboard/member-growth?period=${period}`),
        api.get('/admin/dashboard/top-plans'),
        api.get('/admin/dashboard/recent-activity?limit=8'),
      ]);
      if (statsData.status === 'fulfilled') {
        const d = statsData.value as any;
        setStats({
          totalMembers: d?.totalMembers || 0,
          activeMembers: d?.activeMembers || 0,
          suspendedMembers: d?.suspendedMembers || 0,
          pendingMembers: d?.pendingMembers || 0,
          totalRevenue: d?.totalRevenue || 0,
          monthlyRevenue: d?.monthlyRevenue || 0,
          totalPlans: d?.totalPlans || 0,
          activePlans: d?.activePlans || 0,
          totalTransactions: d?.totalTransactions || 0,
          paidTransactions: d?.paidTransactions || 0,
        });
      }
      if (revenueData.status === 'fulfilled') setRevenue(Array.isArray(revenueData.value) ? revenueData.value as RevenuePoint[] : []);
      if (growthData.status === 'fulfilled') setGrowth(Array.isArray(growthData.value) ? growthData.value as GrowthPoint[] : []);
      if (plansData.status === 'fulfilled') setTopPlans(Array.isArray(plansData.value) ? plansData.value as TopPlan[] : []);
      if (activityData.status === 'fulfilled') {
        const d = activityData.value as any;
        setRecentActivity(Array.isArray(d) ? d : []);
      }
    } catch (err) { console.error('Dashboard fetch error:', err); }
    finally { setLoading(false); }
  };

  const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
  const fmtDate = (d: string) => { try { return format(new Date(d), 'dd/MM'); } catch { return d; } };

  const STATS = [
    { label: 'Total Members', value: stats?.totalMembers || 0, icon: Users, color: 'text-indigo-600 bg-indigo-50', sub: `${stats?.activeMembers || 0} active` },
    { label: 'Monthly Revenue', value: fmt(stats?.monthlyRevenue || 0), icon: DollarSign, color: 'text-amber-600 bg-amber-50', sub: `Total: ${fmt(stats?.totalRevenue || 0)}` },
    { label: 'Active Plans', value: stats?.activePlans || 0, icon: CreditCard, color: 'text-pink-600 bg-pink-50', sub: `${stats?.totalPlans || 0} total plans` },
    { label: 'Paid Invoices', value: stats?.paidTransactions || 0, icon: Activity, color: 'text-emerald-600 bg-emerald-50', sub: `${stats?.totalTransactions || 0} total` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Dashboard</h1><p className="text-sm text-gray-500 mt-1">Platform performance overview</p></div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['week','month','year'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${period===p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{p}</button>
            ))}
          </div>
          <button onClick={fetchAll} className="btn btn-outline btn-sm"><RefreshCcw size={14} className={loading ? 'animate-spin' : ''}/></button>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i) => <div key={i} className="stat-card animate-pulse"><div className="h-10 w-10 bg-gray-200 rounded-lg mb-3"/><div className="h-7 bg-gray-200 rounded w-1/2 mb-2"/><div className="h-4 bg-gray-100 rounded w-3/4"/></div>)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <div key={i} className="stat-card">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}><s.icon size={20}/></div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label mt-0.5">{s.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Revenue</h3><span className="text-xs text-gray-400 capitalize">{period}</span></div>
            <div className="card-body">
              {revenue.length > 0 ? (() => {
                const data = revenue.slice(-14);
                const W=400, H=100, PAD=6;
                const maxVal = Math.max(...data.map(d=>d.amount),1);
                const pts = data.map((d,i) => ({ x: PAD+(i/(data.length-1||1))*(W-PAD*2), y: H-PAD-((d.amount/maxVal)*(H-PAD*2)), ...d }));
                const pathD = pts.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');
                const areaD = `${pathD} L ${pts[pts.length-1].x} ${H} L ${pts[0].x} ${H} Z`;
                return (
                  <div>
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height:100}}>
                      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.25"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0"/></linearGradient></defs>
                      <path d={areaD} fill="url(#cg)"/>
                      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1"><title>{fmtDate(p.date)}: {fmt(p.amount)}</title></circle>)}
                    </svg>
                    <div className="flex justify-between mt-1">{pts.filter((_,i)=>i%2===0).map((p,i)=><span key={i} className="text-xs text-gray-400">{fmtDate(p.date)}</span>)}</div>
                    <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="text-center"><div className="text-xs text-gray-400">Total</div><div className="text-sm font-bold text-emerald-600">{fmt(data.reduce((s,d)=>s+d.amount,0))}</div></div>
                      <div className="text-center"><div className="text-xs text-gray-400">Transactions</div><div className="text-sm font-bold">{data.reduce((s,d)=>s+d.transactions,0)}</div></div>
                    </div>
                  </div>
                );
              })() : <p className="text-sm text-gray-400 text-center py-8">No data for this period</p>}
            </div>
          </div>

          {/* Top Plans */}
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Top Subscription Plans</h3></div>
            <div className="card-body space-y-3">
              {topPlans.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No plan data yet</p> :
                topPlans.map((plan, i) => {
                  const maxSubs = Math.max(...topPlans.map(p=>p.subscribers),1);
                  const colors = ['bg-indigo-500','bg-emerald-500','bg-amber-500','bg-pink-500','bg-purple-500'];
                  return (
                    <div key={plan.planId}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2"><span className={`w-5 h-5 rounded-full ${colors[i]} text-white text-xs flex items-center justify-center font-bold`}>{i+1}</span><span className="text-sm font-medium">{plan.planName}</span></div>
                        <span className="text-sm text-gray-500">{plan.subscribers} subscribers</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${colors[i]} rounded-full transition-all duration-500`} style={{width:`${(plan.subscribers/maxSubs)*100}%`}}/></div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity + Member Status */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Recent Registrations</h3><a href="/dashboard/members" className="text-xs text-indigo-600 hover:underline">View All →</a></div>
            <div className="card-body">
              {recentActivity.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No recent activity</p> :
                <div className="space-y-3">
                  {recentActivity.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">{item.companyName?.charAt(0)?.toUpperCase()||'M'}</div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.companyName}</p><p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString('id-ID')}</p></div>
                      <span className={`badge ${item.status==='active'?'badge-success':item.status==='pending'?'badge-warning':'badge-danger'} text-xs`}>{item.status}</span>
                    </div>
                  ))}
                </div>}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Member Status Overview</h3></div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-3">
                {[['Active', stats?.activeMembers||0, 'text-emerald-600 bg-emerald-50'], ['Pending', stats?.pendingMembers||0, 'text-amber-600 bg-amber-50'], ['Suspended', stats?.suspendedMembers||0, 'text-red-600 bg-red-50'], ['Total', stats?.totalMembers||0, 'text-indigo-600 bg-indigo-50']].map(([l,v,c]) => (
                  <div key={l as string} className={`rounded-xl p-4 text-center ${(c as string).split(' ')[1]}`}>
                    <div className={`text-2xl font-bold ${(c as string).split(' ')[0]}`}>{v}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{l}</div>
                    {stats?.totalMembers ? <div className="text-xs text-gray-400 mt-0.5">{Math.round((Number(v)/stats.totalMembers)*100)}%</div> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

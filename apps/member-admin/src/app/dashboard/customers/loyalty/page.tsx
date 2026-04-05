'use client';

import { useState, useEffect } from 'react';
import { Star, TrendingUp, Users, Gift, Crown, Award, Loader2, RefreshCcw, Calendar } from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

interface TierBenefits {
  tier: string;
  name: string;
  minSpent: number;
  pointsMultiplier: number;
  discountPercentage: number;
  benefits: string[];
  color: string;
}

interface TierStats {
  tier: string;
  count: number;
  percentage: number;
}

interface UpcomingEvent {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  date: string;
  daysUntil: number;
}

const tierConfig: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  regular: { icon: Star, color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)' },
  silver: { icon: Award, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)' },
  gold: { icon: Crown, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  platinum: { icon: TrendingUp, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
};

export default function LoyaltyTiersPage() {
  const [tierBenefits, setTierBenefits] = useState<TierBenefits[]>([]);
  const [tierStats, setTierStats] = useState<TierStats[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<UpcomingEvent[]>([]);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'birthdays' | 'anniversaries'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [benefitsRes, statsRes, birthdaysRes, anniversariesRes]: any[] = await Promise.allSettled([
        apiClient.get('/customers/loyalty/tiers'),
        apiClient.get('/customers/loyalty/statistics'),
        apiClient.get('/customers/loyalty/birthdays/upcoming?days=30'),
        apiClient.get('/customers/loyalty/anniversaries/upcoming?days=30'),
      ]);

      if (benefitsRes.status === 'fulfilled') {
        const data = benefitsRes.value?.data;
        const tiers = data?.tiers || data;
        setTierBenefits(Array.isArray(tiers) ? tiers : []);
      }
      if (statsRes.status === 'fulfilled') {
        const data = statsRes.value?.data;
        // Backend returns { total, byTier: { regular, silver, gold, platinum }, averageSpent }
        if (data?.byTier) {
          const total = data.total || 1;
          const mapped: TierStats[] = Object.entries(data.byTier).map(([tier, count]: [string, any]) => ({
            tier,
            count: Number(count),
            percentage: total > 0 ? (Number(count) / total) * 100 : 0,
          }));
          setTierStats(mapped);
        } else {
          const tiers = data?.tiers || data;
          setTierStats(Array.isArray(tiers) ? tiers : []);
        }
      }
      if (birthdaysRes.status === 'fulfilled') {
        const data = birthdaysRes.value?.data;
        const customers = data?.customers || data;
        setUpcomingBirthdays(Array.isArray(customers) ? customers.map((c: any) => ({
          id: c.id, name: c.name, phone: c.phone, email: c.email,
          date: c.dateOfBirth, daysUntil: getDaysUntilBirthday(c.dateOfBirth),
        })) : []);
      }
      if (anniversariesRes.status === 'fulfilled') {
        const data = anniversariesRes.value?.data;
        const customers = data?.customers || data;
        setUpcomingAnniversaries(Array.isArray(customers) ? customers.map((c: any) => ({
          id: c.id, name: c.name, phone: c.phone, email: c.email,
          date: c.firstPurchaseAt, daysUntil: getDaysUntilAnniversary(c.firstPurchaseAt),
        })) : []);
      }
    } catch (err) {
      console.error('Failed to load loyalty data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeAllTiers = async () => {
    if (!confirm('Check and upgrade all customer tiers based on their total spending?')) return;
    setUpgrading(true);
    try {
      await apiClient.post('/customers/loyalty/upgrade-all-tiers');
      toast.success('Customer tiers updated successfully');
      await loadData();
    } catch (err: any) {
      toast.error('Failed to upgrade tiers');
    } finally {
      setUpgrading(false);
    }
  };

  const getDaysUntilBirthday = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 999;
    const today = new Date();
    const bday = new Date(dateOfBirth);
    const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysUntilAnniversary = (firstPurchaseAt: string): number => {
    if (!firstPurchaseAt) return 999;
    const today = new Date();
    const fp = new Date(firstPurchaseAt);
    const next = new Date(today.getFullYear(), fp.getMonth(), fp.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Loyalty Program</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage customer tiers, benefits, and upcoming events</p>
        </div>
        <button onClick={handleUpgradeAllTiers} disabled={upgrading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {upgrading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCcw size={16} />}
          Sync Tiers
        </button>
      </div>

      {/* Tier Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {['regular', 'silver', 'gold', 'platinum'].map(tier => {
          const config = tierConfig[tier];
          const Icon = config.icon;
          const stat = tierStats.find(s => s.tier === tier);
          return (
            <div key={tier} className="glass-panel" style={{ padding: 'var(--space-lg)', borderLeft: `3px solid ${config.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                <Icon size={20} style={{ color: config.color }} />
                <span style={{ fontWeight: 600, textTransform: 'capitalize', color: config.color }}>{tier}</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stat?.count || 0}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{stat?.percentage?.toFixed(1) || 0}% of customers</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="glass-panel" style={{ padding: 0, marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
          {[
            { key: 'overview', label: 'Tier Benefits', icon: Star },
            { key: 'birthdays', label: `Birthdays (${upcomingBirthdays.length})`, icon: Gift },
            { key: 'anniversaries', label: `Anniversaries (${upcomingAnniversaries.length})`, icon: Calendar },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key as any)} style={{
              flex: 1, padding: 'var(--space-md)', background: activeTab === key ? 'rgba(99,102,241,0.1)' : 'transparent',
              border: 'none', borderBottom: activeTab === key ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === key ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
          {tierBenefits.length > 0 ? tierBenefits.map(tier => {
            const config = tierConfig[tier.tier] || tierConfig.regular;
            const Icon = config.icon;
            return (
              <div key={tier.tier} className="glass-panel animate-fade-in" style={{ padding: 'var(--space-lg)', borderTop: `3px solid ${config.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} style={{ color: config.color }} />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, textTransform: 'capitalize', color: config.color }}>{tier.tier}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Min. {formatCurrency(tier.minSpent)}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: config.color }}>{tier.pointsMultiplier}x</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Points</div>
                  </div>
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: config.color }}>{tier.discountPercentage}%</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Discount</div>
                  </div>
                </div>
                {tier.benefits && tier.benefits.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {tier.benefits.map((benefit, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <span style={{ color: config.color, flexShrink: 0 }}>✓</span> {benefit}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }) : (
            // Default tier display if API not available
            ['regular', 'silver', 'gold', 'platinum'].map(tier => {
              const config = tierConfig[tier];
              const Icon = config.icon;
              const defaults: Record<string, any> = {
                regular: { min: 0, multiplier: 1, discount: 0, benefits: ['Basic loyalty points', 'Member discounts'] },
                silver: { min: 1000000, multiplier: 1.5, discount: 5, benefits: ['1.5x points', '5% discount', 'Birthday bonus'] },
                gold: { min: 5000000, multiplier: 2, discount: 10, benefits: ['2x points', '10% discount', 'Priority service', 'Birthday bonus'] },
                platinum: { min: 20000000, multiplier: 3, discount: 15, benefits: ['3x points', '15% discount', 'VIP service', 'Free delivery', 'Exclusive offers'] },
              };
              const d = defaults[tier];
              return (
                <div key={tier} className="glass-panel animate-fade-in" style={{ padding: 'var(--space-lg)', borderTop: `3px solid ${config.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} style={{ color: config.color }} />
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 700, textTransform: 'capitalize', color: config.color }}>{tier}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Min. {formatCurrency(d.min)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: config.color }}>{d.multiplier}x</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Points</div>
                    </div>
                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: config.color }}>{d.discount}%</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Discount</div>
                    </div>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {d.benefits.map((benefit: string, i: number) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <span style={{ color: config.color, flexShrink: 0 }}>✓</span> {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'birthdays' && (
        <EventList events={upcomingBirthdays} type="birthday" emptyMessage="No upcoming birthdays in the next 30 days" />
      )}

      {activeTab === 'anniversaries' && (
        <EventList events={upcomingAnniversaries} type="anniversary" emptyMessage="No upcoming anniversaries in the next 30 days" />
      )}
    </div>
  );
}

function EventList({ events, type, emptyMessage }: { events: UpcomingEvent[]; type: string; emptyMessage: string }) {
  if (events.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
        <Gift size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: 0 }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Customer', 'Contact', type === 'birthday' ? 'Birthday' : 'First Purchase', 'Days Until'].map(h => (
                <th key={h} style={{ padding: 'var(--space-sm) var(--space-lg)', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: 'var(--space-md) var(--space-lg)', fontWeight: 600 }}>{event.name}</td>
                <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {event.phone || event.email || '-'}
                </td>
                <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)' }}>
                  {new Date(event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                </td>
                <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                  <span style={{
                    display: 'inline-block', padding: '4px 12px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600,
                    background: event.daysUntil <= 3 ? 'rgba(239,68,68,0.1)' : event.daysUntil <= 7 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                    color: event.daysUntil <= 3 ? '#ef4444' : event.daysUntil <= 7 ? '#f59e0b' : '#10b981',
                  }}>
                    {event.daysUntil === 0 ? 'Today!' : `${event.daysUntil} days`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

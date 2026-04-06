'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { addOnsService, CompanyAddOn } from '@/services/add-ons.service';
import { ConfirmModal } from '@/components/ui';
import { 
  Package, 
  Loader2, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  Calendar,
  CreditCard,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';

const statusConfig = {
  active: {
    label: 'Active',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
  },
  pending_payment: {
    label: 'Pending Payment',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200',
  },
  expired: {
    label: 'Expired',
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
  },
};

export default function MyAddOnsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [companyAddOns, setCompanyAddOns] = useState<CompanyAddOn[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [cancelConfirm, setCancelConfirm] = useState<{ open: boolean; addOn: CompanyAddOn | null }>({ open: false, addOn: null });

  useEffect(() => {
    loadCompanyAddOns();
  }, []);

  const loadCompanyAddOns = async () => {
    try {
      setLoading(true);
      const data = await addOnsService.getPurchasedAddOns();
      setCompanyAddOns(data);
    } catch (error: any) {
      console.error('Failed to load purchased add-ons:', error);
      toast.error('Failed to load your add-ons');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (companyAddOn: CompanyAddOn) => {
    setCancelConfirm({ open: true, addOn: companyAddOn });
  };

  const confirmCancel = async () => {
    if (!cancelConfirm.addOn) return;
    try {
      setCancelling(cancelConfirm.addOn.id);
      await addOnsService.cancelAddOn(cancelConfirm.addOn.id);
      toast.success('Add-on cancelled successfully');
      setCancelConfirm({ open: false, addOn: null });
      await loadCompanyAddOns();
    } catch (error: any) {
      console.error('Failed to cancel add-on:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel add-on');
    } finally {
      setCancelling(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const filteredAddOns = companyAddOns.filter((ca) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ca.status === 'active';
    if (filter === 'expired') return ca.status === 'expired' || ca.status === 'cancelled';
    return true;
  });

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 
            size={40} 
            style={{ 
              animation: 'spin 1s linear infinite', 
              color: 'var(--primary)',
              margin: '0 auto 16px'
            }} 
          />
          <p style={{ color: 'var(--text-secondary)' }}>Loading your add-ons...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <button
          onClick={() => router.push('/dashboard/add-ons')}
          className="btn"
          style={{ 
            marginBottom: 'var(--space-md)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ArrowLeft size={16} />
          Back to Marketplace
        </button>

        <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>
          My Add-ons
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage your purchased add-ons and subscriptions
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="glass-panel" style={{ padding: 0, marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'expired', label: 'Expired/Cancelled' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              style={{
                flex: 1,
                padding: 'var(--space-md)',
                background: filter === tab.key ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                border: 'none',
                borderBottom: filter === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                color: filter === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add-ons List */}
      {filteredAddOns.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <Package size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>
            No add-ons found
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            {filter === 'all' 
              ? "You haven't purchased any add-ons yet."
              : `No ${filter} add-ons found.`
            }
          </p>
          <button
            onClick={() => router.push('/dashboard/add-ons')}
            className="btn btn-primary"
          >
            Browse Add-ons Marketplace
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {filteredAddOns.map((companyAddOn) => {
            const config = statusConfig[companyAddOn.status];
            const StatusIcon = config.icon;
            const isCancelling = cancelling === companyAddOn.id;
            const canCancel = companyAddOn.status === 'active' && 
                             companyAddOn.add_on.pricing_type === 'recurring' &&
                             companyAddOn.auto_renew;

            return (
              <div 
                key={companyAddOn.id}
                className="glass-panel animate-fade-in"
                style={{ padding: 'var(--space-lg)' }}
              >
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr auto', 
                  gap: 'var(--space-lg)',
                  alignItems: 'start',
                }}>
                  {/* Left: Add-on Info */}
                  <div>
                    {/* Status Badge */}
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <span 
                        className={`${config.bgColor} ${config.color} ${config.borderColor}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          border: '1px solid',
                        }}
                      >
                        <StatusIcon size={14} />
                        {config.label}
                      </span>
                    </div>

                    {/* Name & Description */}
                    <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-sm)', fontWeight: 600 }}>
                      {companyAddOn.add_on.name}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                      {companyAddOn.add_on.description}
                    </p>

                    {/* Details Grid */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 'var(--space-md)',
                      marginTop: 'var(--space-lg)',
                    }}>
                      <div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          marginBottom: '4px',
                        }}>
                          <CreditCard size={16} style={{ color: 'var(--text-tertiary)' }} />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                            Purchase Price
                          </span>
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                          {formatPrice(companyAddOn.purchase_price)}
                        </div>
                      </div>

                      {companyAddOn.activated_at && (
                        <div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            marginBottom: '4px',
                          }}>
                            <Calendar size={16} style={{ color: 'var(--text-tertiary)' }} />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                              Activated On
                            </span>
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                            {formatDate(companyAddOn.activated_at)}
                          </div>
                        </div>
                      )}

                      {companyAddOn.expires_at && (
                        <div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            marginBottom: '4px',
                          }}>
                            <Calendar size={16} style={{ color: 'var(--text-tertiary)' }} />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                              {companyAddOn.status === 'active' ? 'Expires On' : 'Expired On'}
                            </span>
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                            {formatDate(companyAddOn.expires_at)}
                          </div>
                        </div>
                      )}

                      {companyAddOn.add_on.pricing_type === 'recurring' && companyAddOn.status === 'active' && (
                        <div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            marginBottom: '4px',
                          }}>
                            <RotateCcw size={16} style={{ color: 'var(--text-tertiary)' }} />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                              Auto-Renewal
                            </span>
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                            {companyAddOn.auto_renew ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {canCancel && (
                      <button
                        onClick={() => handleCancel(companyAddOn)}
                        disabled={isCancelling}
                        className="btn"
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          minWidth: '140px',
                        }}
                      >
                        {isCancelling ? (
                          <>
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <XCircle size={16} />
                            Cancel
                          </>
                        )}
                      </button>
                    )}

                    {companyAddOn.status === 'cancelled' && (
                      <div style={{
                        padding: 'var(--space-sm)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: '#ef4444',
                        textAlign: 'center',
                      }}>
                        Cancelled on<br />
                        {formatDate(companyAddOn.cancelled_at || '')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmModal
        open={cancelConfirm.open}
        title="Batalkan Add-on"
        description={`Yakin ingin membatalkan "${cancelConfirm.addOn?.add_on.name}"? Add-on akan tetap aktif hingga ${formatDate(cancelConfirm.addOn?.expires_at || '')}.`}
        confirmLabel="Ya, Batalkan"
        variant="warning"
        loading={!!cancelling}
        onConfirm={confirmCancel}
        onClose={() => setCancelConfirm({ open: false, addOn: null })}
      />
    </div>
  );
}

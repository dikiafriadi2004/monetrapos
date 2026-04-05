'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { addOnsService, AddOn } from '@/services/add-ons.service';
import { 
  ShoppingCart, 
  Check, 
  Loader2, 
  Package, 
  Zap, 
  HeadphonesIcon, 
  TrendingUp,
  Filter
} from 'lucide-react';

const categoryIcons = {
  integration: Package,
  feature: Zap,
  support: HeadphonesIcon,
  capacity: TrendingUp,
};

const categoryColors = {
  integration: 'bg-blue-100 text-blue-700 border-blue-200',
  feature: 'bg-purple-100 text-purple-700 border-purple-200',
  support: 'bg-green-100 text-green-700 border-green-200',
  capacity: 'bg-orange-100 text-orange-700 border-orange-200',
};

export default function AddOnsMarketplacePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadAddOns();
  }, [selectedCategory]);

  const loadAddOns = async () => {
    try {
      setLoading(true);
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const data = await addOnsService.getAvailableAddOns(category);
      setAddOns(data);
    } catch (error: any) {
      console.error('Failed to load add-ons:', error);
      toast.error('Failed to load add-ons');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (addOn: AddOn) => {
    try {
      setPurchasing(addOn.id);
      const result = await addOnsService.purchaseAddOn(addOn.id);
      
      // Redirect ke checkout page kita, bukan langsung ke Xendit
      if (result.paymentUrl) {
        const checkoutUrl = `/checkout?invoice=${encodeURIComponent(result.companyAddOn?.invoice_id || '')}&amount=${addOn.price}&paymentUrl=${encodeURIComponent(result.paymentUrl)}`;
        router.push(checkoutUrl);
      } else {
        toast.error('Gagal mendapatkan URL pembayaran');
        setPurchasing(null);
      }
    } catch (error: any) {
      console.error('Failed to purchase add-on:', error);
      toast.error(error.response?.data?.message || 'Gagal membeli add-on');
      setPurchasing(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      integration: 'Integration',
      feature: 'Feature',
      support: 'Support',
      capacity: 'Capacity',
    };
    return labels[category] || category;
  };

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
          <p style={{ color: 'var(--text-secondary)' }}>Loading add-ons...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>
          Add-ons Marketplace
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Enhance your POS with powerful integrations, features, and support packages
        </p>
      </div>

      {/* Category Filter */}
      <div className="glass-panel" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <Filter size={18} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontWeight: 500 }}>Filter by category:</span>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            {['all', 'integration', 'feature', 'support', 'capacity'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  background: selectedCategory === cat ? 'var(--primary)' : 'transparent',
                  color: selectedCategory === cat ? 'white' : 'var(--text-primary)',
                  border: selectedCategory === cat ? 'none' : '1px solid var(--border)',
                }}
              >
                {cat === 'all' ? 'All' : getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add-ons Grid */}
      {addOns.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <Package size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>
            No add-ons available
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {selectedCategory === 'all' 
              ? 'There are no add-ons available at the moment.'
              : `No ${getCategoryLabel(selectedCategory).toLowerCase()} add-ons available.`
            }
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: 'var(--space-lg)' 
        }}>
          {addOns.map((addOn) => {
            const CategoryIcon = categoryIcons[addOn.category];
            const isPurchasing = purchasing === addOn.id;

            return (
              <div 
                key={addOn.id} 
                className="glass-panel animate-fade-in"
                style={{ 
                  padding: 'var(--space-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                {/* Category Badge */}
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <span 
                    className={categoryColors[addOn.category]}
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
                    <CategoryIcon size={14} />
                    {getCategoryLabel(addOn.category)}
                  </span>
                </div>

                {/* Icon */}
                {addOn.icon_url && (
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '8px',
                      background: 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                    }}>
                      {addOn.icon_url}
                    </div>
                  </div>
                )}

                {/* Name & Description */}
                <h3 style={{ 
                  fontSize: '1.1rem', 
                  marginBottom: 'var(--space-sm)',
                  fontWeight: 600,
                }}>
                  {addOn.name}
                </h3>
                <p style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.9rem',
                  marginBottom: 'var(--space-md)',
                  flexGrow: 1,
                }}>
                  {addOn.description}
                </p>

                {/* Features */}
                {addOn.features && addOn.features.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <ul style={{ 
                      listStyle: 'none', 
                      padding: 0, 
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}>
                      {addOn.features.slice(0, 3).map((feature, index) => (
                        <li 
                          key={index}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <Check size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {addOn.features.length > 3 && (
                        <li style={{ 
                          fontSize: '0.85rem', 
                          color: 'var(--text-tertiary)',
                          marginLeft: '22px',
                        }}>
                          +{addOn.features.length - 3} more features
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Price & Purchase Button */}
                <div style={{ 
                  marginTop: 'auto',
                  paddingTop: 'var(--space-md)',
                  borderTop: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-md)',
                  }}>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {formatPrice(addOn.price)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        {addOn.pricing_type === 'recurring' ? 'per month' : 'one-time'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePurchase(addOn)}
                    disabled={isPurchasing}
                    className="btn btn-primary"
                    style={{ 
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={16} />
                        Purchase Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* My Add-ons Link */}
      <div style={{ marginTop: 'var(--space-2xl)', textAlign: 'center' }}>
        <button
          onClick={() => router.push('/dashboard/add-ons/my-add-ons')}
          className="btn"
          style={{ padding: '12px 24px' }}
        >
          View My Add-ons
        </button>
      </div>
    </div>
  );
}

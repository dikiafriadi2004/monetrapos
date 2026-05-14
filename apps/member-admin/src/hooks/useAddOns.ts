'use client';

import { useState, useEffect, useCallback } from 'react';
import { addOnsService, CompanyAddOn } from '@/services/add-ons.service';

// Slug constants — sinkron dengan DB
export const ADD_ON_SLUGS = {
  WHATSAPP:       'whatsapp-integration',
  ACCOUNTING:     'accounting-integration',
  DELIVERY:       'delivery-integration',
  ECOMMERCE:      'ecommerce-integration',
  ADVANCED_REPORTS: 'advanced-reporting',
  MULTI_LOCATION: 'multi-location',
  LOYALTY_ADVANCED: 'loyalty-program-advanced',
  ONLINE_ORDERING: 'online-ordering',
  EXTRA_PRODUCTS: 'extra-products',
  EXTRA_USERS:    'extra-users',
  PRIORITY_SUPPORT: 'priority-support',
  ONSITE_TRAINING: 'onsite-training',
} as const;

let _cache: CompanyAddOn[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000; // 1 menit

export function useAddOns() {
  const [addOns, setAddOns] = useState<CompanyAddOn[]>(_cache || []);
  const [loading, setLoading] = useState(!_cache);

  const load = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && _cache && now - _cacheTime < CACHE_TTL) {
      setAddOns(_cache);
      setLoading(false);
      return;
    }
    try {
      const data = await addOnsService.getPurchasedAddOns();
      const active = data.filter(a => a.status === 'active');
      _cache = active;
      _cacheTime = now;
      setAddOns(active);
    } catch {
      setAddOns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * Cek apakah add-on dengan slug tertentu aktif
   */
  const hasAddOn = useCallback((slug: string): boolean => {
    return addOns.some(a => a.add_on?.slug === slug || a.add_on_id === slug);
  }, [addOns]);

  /**
   * Ambil data add-on aktif berdasarkan slug
   */
  const getAddOn = useCallback((slug: string): CompanyAddOn | undefined => {
    return addOns.find(a => a.add_on?.slug === slug);
  }, [addOns]);

  // Shorthand checks
  const hasWhatsApp       = hasAddOn(ADD_ON_SLUGS.WHATSAPP);
  const hasAccounting     = hasAddOn(ADD_ON_SLUGS.ACCOUNTING);
  const hasDelivery       = hasAddOn(ADD_ON_SLUGS.DELIVERY);
  const hasEcommerce      = hasAddOn(ADD_ON_SLUGS.ECOMMERCE);
  const hasAdvancedReports = hasAddOn(ADD_ON_SLUGS.ADVANCED_REPORTS);
  const hasMultiLocation  = hasAddOn(ADD_ON_SLUGS.MULTI_LOCATION);
  const hasLoyaltyAdvanced = hasAddOn(ADD_ON_SLUGS.LOYALTY_ADVANCED);
  const hasOnlineOrdering = hasAddOn(ADD_ON_SLUGS.ONLINE_ORDERING);
  const hasExtraProducts  = hasAddOn(ADD_ON_SLUGS.EXTRA_PRODUCTS);
  const hasExtraUsers     = hasAddOn(ADD_ON_SLUGS.EXTRA_USERS);
  const hasPrioritySupport = hasAddOn(ADD_ON_SLUGS.PRIORITY_SUPPORT);

  return {
    addOns,
    loading,
    hasAddOn,
    getAddOn,
    refresh: () => load(true),
    // Shortcuts
    hasWhatsApp,
    hasAccounting,
    hasDelivery,
    hasEcommerce,
    hasAdvancedReports,
    hasMultiLocation,
    hasLoyaltyAdvanced,
    hasOnlineOrdering,
    hasExtraProducts,
    hasExtraUsers,
    hasPrioritySupport,
  };
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';

interface Store {
  id: string;
  name: string;
  isActive: boolean;
}

let cachedStoreId: string | null = null;
let cachedStores: Store[] = [];

export function useStore() {
  const { company } = useAuth();
  const [storeId, setStoreIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentStoreId') || cachedStoreId || '';
    }
    return '';
  });
  const [stores, setStores] = useState<Store[]>(cachedStores);
  const [loading, setLoading] = useState(!storeId);

  useEffect(() => {
    if (!company?.id) return;
    if (storeId && cachedStores.length > 0) { setLoading(false); return; }

    setLoading(true);
    apiClient.get('/stores', { params: { isActive: 'true', limit: 50 } })
      .then(res => {
        const list: Store[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        cachedStores = list;
        setStores(list);

        // Auto-select first store if none selected
        const saved = localStorage.getItem('currentStoreId');
        const valid = saved && list.some(s => s.id === saved);
        if (!valid && list.length > 0) {
          const firstId = list[0].id;
          localStorage.setItem('currentStoreId', firstId);
          cachedStoreId = firstId;
          setStoreIdState(firstId);
        } else if (valid) {
          cachedStoreId = saved!;
          setStoreIdState(saved!);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [company?.id]);

  const setStoreId = (id: string) => {
    localStorage.setItem('currentStoreId', id);
    cachedStoreId = id;
    setStoreIdState(id);
  };

  return { storeId, stores, setStoreId, loading };
}

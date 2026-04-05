import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';

export interface AppNotification {
  id: string;
  type: 'low_stock' | 'new_order' | 'payment' | 'subscription' | 'system' | 'info';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

const POLL_INTERVAL = 30000; // 30 seconds

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get('/notifications?limit=20&isRead=false');
      const data: AppNotification[] = Array.isArray(res.data)
        ? res.data
        : (res.data as any)?.data || [];

      // Detect new notifications
      const newIds = new Set(data.map(n => n.id));
      const addedIds = [...newIds].filter(id => !prevIdsRef.current.has(id));

      if (addedIds.length > 0 && prevIdsRef.current.size > 0) {
        // Play subtle sound for new notifications
        try {
          if (!audioRef.current) {
            audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2ozLS1bnNPsqWI2LCxXl8/nqGM4LCxWlc3lp2Q5LCxVk8vjpmU6LCxUksnhpWY7LCxTkMfgpGc8LCxSjsXfpGg9LCxRjMPepGk+LCxQisHdpGo/LCxPiL/cpGs=');
          }
          audioRef.current.volume = 0.3;
          audioRef.current.play().catch(() => {});
        } catch {}
      }

      prevIdsRef.current = newIds;
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch {
      // Silently fail - notifications are non-critical
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  const refresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh };
}
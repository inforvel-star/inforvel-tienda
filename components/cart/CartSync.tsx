'use client';

import { useEffect, useRef } from 'react';
import { useCartStore } from '@/lib/store/cartStore';
import { authAPI } from '@/lib/api/auth';

const SYNC_INTERVAL_MS = 15_000; // Re-sync every 15 seconds

/**
 * Invisible component that keeps the cart in sync with the server.
 * Re-fetches from server when:
 *  1. The browser tab regains focus (visibilitychange)
 *  2. The window regains focus (e.g. switching between apps on mobile)
 *  3. Every 60 seconds while the tab is visible
 */
export function CartSync() {
  const loadCartFromServer = useCartStore((s) => s.loadCartFromServer);
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    const isLoggedIn = () => authAPI.isAuthenticated();

    const syncIfNeeded = () => {
      if (!isLoggedIn()) return;

      const now = Date.now();
      // Debounce: don't sync more than once every 5 seconds
      if (now - lastSyncRef.current < 5_000) return;

      lastSyncRef.current = now;
      loadCartFromServer();
    };

    // Sync when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncIfNeeded();
      }
    };

    // Sync when window regains focus (covers mobile app-switching)
    const handleFocus = () => {
      syncIfNeeded();
    };

    // Initial sync on mount
    syncIfNeeded();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    // Periodic background sync
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncIfNeeded();
      }
    }, SYNC_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [loadCartFromServer]);

  return null;
}

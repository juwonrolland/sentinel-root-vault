import { useState, useEffect, useCallback } from 'react';

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export const useOfflineMode = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  const cacheData = useCallback(<T>(key: string, data: T, expiryMinutes = 60) => {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiry: expiryMinutes * 60 * 1000,
    };
    try {
      localStorage.setItem(`offline_cache_${key}`, JSON.stringify(cached));
    } catch (e) {
      console.warn('Failed to cache data:', e);
    }
  }, []);

  const getCachedData = useCallback(<T>(key: string): T | null => {
    try {
      const cached = localStorage.getItem(`offline_cache_${key}`);
      if (!cached) return null;

      const parsed: CachedData<T> = JSON.parse(cached);
      const isExpired = Date.now() - parsed.timestamp > parsed.expiry;

      if (isExpired && isOnline) {
        localStorage.removeItem(`offline_cache_${key}`);
        return null;
      }

      return parsed.data;
    } catch (e) {
      return null;
    }
  }, [isOnline]);

  const getCacheAge = useCallback((key: string): string | null => {
    try {
      const cached = localStorage.getItem(`offline_cache_${key}`);
      if (!cached) return null;

      const parsed: CachedData<unknown> = JSON.parse(cached);
      const ageMs = Date.now() - parsed.timestamp;
      const ageMinutes = Math.floor(ageMs / 60000);

      if (ageMinutes < 1) return 'Just now';
      if (ageMinutes < 60) return `${ageMinutes}m ago`;
      const ageHours = Math.floor(ageMinutes / 60);
      if (ageHours < 24) return `${ageHours}h ago`;
      return `${Math.floor(ageHours / 24)}d ago`;
    } catch (e) {
      return null;
    }
  }, []);

  const clearCache = useCallback((key?: string) => {
    if (key) {
      localStorage.removeItem(`offline_cache_${key}`);
    } else {
      Object.keys(localStorage)
        .filter(k => k.startsWith('offline_cache_'))
        .forEach(k => localStorage.removeItem(k));
    }
  }, []);

  return {
    isOnline,
    wasOffline,
    cacheData,
    getCachedData,
    getCacheAge,
    clearCache,
  };
};

import { useOfflineMode } from '@/hooks/useOfflineMode';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface OfflineBannerProps {
  onRetry?: () => void;
  cacheKey?: string;
}

export const OfflineBanner = ({ onRetry, cacheKey }: OfflineBannerProps) => {
  const { isOnline, wasOffline, getCacheAge } = useOfflineMode();
  const [showReconnected, setShowReconnected] = useState(false);
  const cacheAge = cacheKey ? getCacheAge(cacheKey) : null;

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[200] px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium transition-all duration-300 animate-fade-in",
        isOnline
          ? "bg-success/90 text-success-foreground"
          : "bg-warning/90 text-warning-foreground"
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Back online</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-2 px-2 py-0.5 rounded bg-background/20 hover:bg-background/30 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          )}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You're offline</span>
          {cacheAge && (
            <span className="text-xs opacity-80">• Showing cached data from {cacheAge}</span>
          )}
        </>
      )}
    </div>
  );
};

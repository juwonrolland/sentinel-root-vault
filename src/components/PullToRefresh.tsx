import { useState, useRef, useCallback, ReactNode } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export const PullToRefresh = ({ onRefresh, children, className }: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const THRESHOLD = 80;
  const MAX_PULL = 120;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0 && !isRefreshing) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      // Apply resistance to make pull feel natural
      const resistance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(resistance);
      
      // Prevent default scrolling when pulling
      if (diff > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60); // Keep indicator visible during refresh
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh, isPulling]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const shouldTrigger = pullDistance >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-0 right-0 flex items-center justify-center z-50 pointer-events-none transition-opacity duration-200",
          (pullDistance > 0 || isRefreshing) ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: 0,
          height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px`,
        }}
      >
        <div className={cn(
          "flex flex-col items-center gap-1 transition-all duration-200",
          shouldTrigger || isRefreshing ? "text-primary" : "text-muted-foreground"
        )}>
          {isRefreshing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <RefreshCw 
              className={cn(
                "h-6 w-6 transition-transform duration-200",
                shouldTrigger && "text-primary"
              )}
              style={{
                transform: `rotate(${progress * 180}deg)`,
              }}
            />
          )}
          <span className="text-[10px] font-mono uppercase tracking-wider">
            {isRefreshing ? "Refreshing..." : shouldTrigger ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      </div>

      {/* Content with transform */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  AlertTriangle, 
  ShieldAlert, 
  AlertCircle, 
  Info,
  Radio,
  Clock
} from "lucide-react";

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string | null;
  source_ip: string | null;
  detected_at: string;
  metadata: any;
}

interface ThreatIntelligenceFeedProps {
  maxItems?: number;
  className?: string;
}

export const ThreatIntelligenceFeed = ({ 
  maxItems = 15, 
  className 
}: ThreatIntelligenceFeedProps) => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [newEventId, setNewEventId] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEvents();

    // Real-time subscription
    const channel = supabase
      .channel('threat-intelligence-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_events'
        },
        (payload) => {
          const newEvent = payload.new as SecurityEvent;
          setNewEventId(newEvent.id);
          setEvents(prev => [newEvent, ...prev].slice(0, maxItems));
          
          // Clear highlight after animation
          setTimeout(() => setNewEventId(null), 2000);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [maxItems]);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('security_events')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(maxItems);

    if (data && !error) {
      setEvents(data);
    }
  };

  const getSeverityConfig = (severity: SecurityEvent["severity"]) => {
    switch (severity) {
      case "critical":
        return {
          icon: ShieldAlert,
          badge: "bg-destructive/20 text-destructive border-destructive/30",
          dot: "bg-destructive",
          glow: "shadow-threat",
          label: "CRITICAL"
        };
      case "high":
        return {
          icon: AlertTriangle,
          badge: "bg-warning/20 text-warning border-warning/30",
          dot: "bg-warning",
          glow: "shadow-[0_0_15px_hsl(38_92%_50%/0.4)]",
          label: "HIGH"
        };
      case "medium":
        return {
          icon: AlertCircle,
          badge: "bg-info/20 text-info border-info/30",
          dot: "bg-info",
          glow: "",
          label: "MEDIUM"
        };
      default:
        return {
          icon: Info,
          badge: "bg-muted/50 text-muted-foreground border-muted",
          dot: "bg-muted-foreground",
          glow: "",
          label: "LOW"
        };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatTime(dateString);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-semibold text-foreground">THREAT INTELLIGENCE FEED</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-success animate-pulse" : "bg-destructive"
          )} />
          <span className="text-xs text-muted-foreground font-mono">
            {isConnected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Feed */}
      <div 
        ref={feedRef}
        className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin"
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <ShieldAlert className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No security events detected</p>
            <p className="text-xs text-muted-foreground/70 mt-1">System is monitoring for threats</p>
          </div>
        ) : (
          events.map((event, index) => {
            const config = getSeverityConfig(event.severity);
            const Icon = config.icon;
            const isNew = event.id === newEventId;

            return (
              <div
                key={event.id}
                className={cn(
                  "relative p-3 rounded-lg border transition-all duration-500",
                  "bg-secondary/30 border-border/50 hover:border-primary/30",
                  isNew && "animate-slide-down border-primary/50 bg-primary/5",
                  config.glow && isNew && config.glow
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* New indicator */}
                {isNew && (
                  <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded">
                    NEW
                  </div>
                )}

                <div className="flex items-start gap-3">
                  {/* Severity Icon */}
                  <div className={cn(
                    "p-1.5 rounded-md",
                    config.badge
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground truncate">
                        {event.event_type}
                      </span>
                      <span className={cn(
                        "px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border",
                        config.badge
                      )}>
                        {config.label}
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {event.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(event.detected_at)}
                      </span>
                      {event.source_ip && (
                        <span className="truncate">IP: {event.source_ip}</span>
                      )}
                    </div>
                  </div>

                  {/* Pulse indicator for critical/high */}
                  {(event.severity === "critical" || event.severity === "high") && (
                    <div className={cn(
                      "w-2 h-2 rounded-full animate-pulse",
                      config.dot
                    )} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              <span className="text-destructive font-bold">
                {events.filter(e => e.severity === "critical").length}
              </span> Critical
            </span>
            <span className="text-muted-foreground">
              <span className="text-warning font-bold">
                {events.filter(e => e.severity === "high").length}
              </span> High
            </span>
          </div>
          <span className="text-muted-foreground font-mono">
            {events.length} events
          </span>
        </div>
      </div>
    </div>
  );
};

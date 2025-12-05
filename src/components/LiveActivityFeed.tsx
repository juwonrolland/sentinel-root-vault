import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  AlertTriangle,
  Lock,
  Globe,
  Cpu,
  Activity,
  Eye,
  Zap,
  Database,
  Wifi,
  Server,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityEvent {
  id: string;
  type: "security" | "access" | "system" | "network";
  action: string;
  details: string;
  severity?: "info" | "warning" | "critical";
  timestamp: Date;
  source?: string;
  isReal?: boolean;
}

interface LiveActivityFeedProps {
  maxItems?: number;
  className?: string;
}

const generateMockActivity = (): ActivityEvent => {
  const types: ActivityEvent["type"][] = ["security", "access", "system", "network"];
  const type = types[Math.floor(Math.random() * types.length)];
  
  const activities: Record<ActivityEvent["type"], { actions: string[]; details: string[] }> = {
    security: {
      actions: ["Threat blocked", "Firewall triggered", "Anomaly detected", "Scan completed", "Policy enforced", "Intrusion prevented"],
      details: ["Malicious payload neutralized", "Unauthorized access blocked", "Behavioral anomaly flagged", "System scan clean", "Security policy updated", "Attack vector identified"],
    },
    access: {
      actions: ["Login successful", "Session validated", "MFA verified", "Permission granted", "Access revoked", "Token refreshed"],
      details: ["User authenticated via SSO", "Session token verified", "2FA code validated", "Admin access granted", "Inactive session ended", "JWT renewed"],
    },
    system: {
      actions: ["Health check passed", "Resource optimized", "Backup completed", "Update installed", "Cache cleared", "Service restarted"],
      details: ["All services operational", "Memory optimized", "Backup finished", "Security patch applied", "Cache purged", "Service restored"],
    },
    network: {
      actions: ["Connection secured", "Traffic analyzed", "Route optimized", "Latency reduced", "Bandwidth allocated", "Tunnel established"],
      details: ["Secure tunnel created", "DDoS mitigation active", "Network path optimized", "Edge server synced", "QoS policy applied", "VPN connected"],
    },
  };

  const severity: ActivityEvent["severity"] = Math.random() > 0.85 ? "critical" : Math.random() > 0.6 ? "warning" : "info";

  const sources = ["192.168.1.100", "10.0.0.50", "172.16.0.25", "edge-01", "fw-main", "proxy-01", "db-primary", "api-gateway"];

  return {
    id: crypto.randomUUID(),
    type,
    action: activities[type].actions[Math.floor(Math.random() * activities[type].actions.length)],
    details: activities[type].details[Math.floor(Math.random() * activities[type].details.length)],
    severity,
    timestamp: new Date(),
    source: sources[Math.floor(Math.random() * sources.length)],
    isReal: false,
  };
};

export const LiveActivityFeed = ({ maxItems = 20, className }: LiveActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [eventCount, setEventCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Load initial real data from Supabase
    loadRealData();

    // Subscribe to real-time events
    const channel = supabase
      .channel('live-activity-feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_events'
      }, (payload) => {
        const event = payload.new as any;
        const newActivity: ActivityEvent = {
          id: event.id,
          type: 'security',
          action: event.event_type,
          details: event.description || 'Security event detected',
          severity: event.severity === 'critical' ? 'critical' : event.severity === 'high' ? 'warning' : 'info',
          timestamp: new Date(event.detected_at),
          source: event.source_ip || 'Unknown',
          isReal: true,
        };
        setActivities(prev => [newActivity, ...prev].slice(0, maxItems));
        setEventCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'access_logs'
      }, (payload) => {
        const log = payload.new as any;
        const newActivity: ActivityEvent = {
          id: log.id,
          type: 'access',
          action: log.action,
          details: `Resource: ${log.resource}`,
          severity: log.success ? 'info' : 'warning',
          timestamp: new Date(log.timestamp),
          source: log.ip_address || 'Unknown',
          isReal: true,
        };
        setActivities(prev => [newActivity, ...prev].slice(0, maxItems));
        setEventCount(prev => prev + 1);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Generate initial mock activities
    const initial = Array.from({ length: 5 }, () => ({
      ...generateMockActivity(),
      timestamp: new Date(Date.now() - Math.random() * 300000),
    }));
    setActivities(prev => [...prev, ...initial].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, maxItems));
    setEventCount(prev => prev + initial.length);

    // Add new mock activities periodically
    const interval = setInterval(() => {
      setActivities((prev) => {
        const newActivity = generateMockActivity();
        const updated = [newActivity, ...prev].slice(0, maxItems);
        return updated;
      });
      setEventCount(prev => prev + 1);
    }, 4000 + Math.random() * 4000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [maxItems]);

  const loadRealData = async () => {
    // Load recent security events
    const { data: securityEvents } = await supabase
      .from('security_events')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(5);

    if (securityEvents) {
      const realActivities = securityEvents.map(event => ({
        id: event.id,
        type: 'security' as const,
        action: event.event_type,
        details: event.description || 'Security event detected',
        severity: (event.severity === 'critical' ? 'critical' : event.severity === 'high' ? 'warning' : 'info') as ActivityEvent['severity'],
        timestamp: new Date(event.detected_at || new Date()),
        source: event.source_ip || 'Unknown',
        isReal: true,
      }));
      
      setActivities(prev => [...realActivities, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, maxItems));
      setEventCount(prev => prev + realActivities.length);
    }

    // Load recent access logs
    const { data: accessLogs } = await supabase
      .from('access_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(3);

    if (accessLogs) {
      const accessActivities = accessLogs.map(log => ({
        id: log.id,
        type: 'access' as const,
        action: log.action,
        details: `Resource: ${log.resource}`,
        severity: (log.success ? 'info' : 'warning') as ActivityEvent['severity'],
        timestamp: new Date(log.timestamp || new Date()),
        source: log.ip_address || 'Unknown',
        isReal: true,
      }));
      
      setActivities(prev => [...accessActivities, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, maxItems));
      setEventCount(prev => prev + accessActivities.length);
    }
  };

  const getTypeIcon = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "security":
        return <Shield className="h-3 w-3" />;
      case "access":
        return <Lock className="h-3 w-3" />;
      case "system":
        return <Cpu className="h-3 w-3" />;
      case "network":
        return <Globe className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "security":
        return "text-primary bg-primary/10 border-primary/20";
      case "access":
        return "text-success bg-success/10 border-success/20";
      case "system":
        return "text-info bg-info/10 border-info/20";
      case "network":
        return "text-accent bg-accent/10 border-accent/20";
    }
  };

  const getSeverityStyle = (severity?: ActivityEvent["severity"]) => {
    switch (severity) {
      case "critical":
        return "border-l-destructive bg-destructive/5";
      case "warning":
        return "border-l-warning bg-warning/5";
      default:
        return "border-l-border/50 bg-transparent";
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity className="h-4 w-4 text-primary" />
            <div className={cn(
              "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse",
              isConnected ? "bg-success" : "bg-warning"
            )} />
          </div>
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Live Activity</span>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">
          <Zap className="h-2.5 w-2.5 mr-1 text-primary" />
          {eventCount} events
        </Badge>
      </div>

      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-1.5">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className={cn(
                "p-2 rounded-lg border-l-2 transition-all duration-300 hover:bg-secondary/30",
                getSeverityStyle(activity.severity),
                index === 0 && "animate-fade-in"
              )}
            >
              <div className="flex items-start gap-2">
                <div className={cn("p-1 rounded border", getTypeColor(activity.type))}>
                  {getTypeIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">{activity.action}</span>
                    {activity.severity === "critical" && (
                      <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0 animate-pulse" />
                    )}
                    {activity.isReal && (
                      <span className="text-[8px] text-primary font-mono bg-primary/10 px-1 rounded">REAL</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {activity.details}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-primary/70 font-mono bg-primary/5 px-1 rounded">
                      {activity.source}
                    </span>
                    <span className="text-[9px] text-muted-foreground/70">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/30">
        <div className="flex items-center gap-2">
          <Eye className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Monitoring {activities.length} streams
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse",
            isConnected ? "bg-success" : "bg-warning"
          )} />
          <span className={cn(
            "text-[10px] font-mono",
            isConnected ? "text-success" : "text-warning"
          )}>
            {isConnected ? "LIVE" : "CONNECTING"}
          </span>
        </div>
      </div>
    </div>
  );
};

import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  AlertTriangle,
  Lock,
  Globe,
  Server,
  Wifi,
  Activity,
  Cpu,
  Database,
  Eye,
  Zap,
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
  };
};

export const LiveActivityFeed = ({ maxItems = 20, className }: LiveActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    // Generate initial activities
    const initial = Array.from({ length: 8 }, () => ({
      ...generateMockActivity(),
      timestamp: new Date(Date.now() - Math.random() * 300000),
    }));
    setActivities(initial.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    setEventCount(initial.length);

    // Add new activities periodically
    const interval = setInterval(() => {
      setActivities((prev) => {
        const newActivity = generateMockActivity();
        const updated = [newActivity, ...prev].slice(0, maxItems);
        return updated;
      });
      setEventCount(prev => prev + 1);
    }, 2500 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, [maxItems]);

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
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success animate-pulse" />
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
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] text-success font-mono">LIVE</span>
        </div>
      </div>
    </div>
  );
};

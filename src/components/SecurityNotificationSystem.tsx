import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Bell, Shield, AlertTriangle, Info, CheckCircle, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SecurityAlert {
  id: string;
  type: "critical" | "warning" | "info" | "success";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface SecurityNotificationSystemProps {
  className?: string;
}

export const SecurityNotificationSystem = ({ className }: SecurityNotificationSystemProps) => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const { toast } = useToast();

  // Audio context for notification sounds
  const playNotificationSound = (type: SecurityAlert["type"]) => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different sounds for different alert types
      switch (type) {
        case "critical":
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.2);
          break;
        case "warning":
          oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(550, audioContext.currentTime + 0.15);
          break;
        case "success":
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
          break;
        default:
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      }
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log("Audio not supported");
    }
  };

  const addAlert = (alert: Omit<SecurityAlert, "id" | "timestamp" | "read">) => {
    const newAlert: SecurityAlert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };
    
    setAlerts(prev => [newAlert, ...prev].slice(0, 50)); // Keep last 50 alerts
    playNotificationSound(alert.type);
    
    // Show toast notification
    toast({
      title: alert.title,
      description: alert.message,
      variant: alert.type === "critical" ? "destructive" : "default",
    });
  };

  const markAsRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  const clearAll = () => {
    setAlerts([]);
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  // Simulate incoming security alerts for demo
  useEffect(() => {
    const demoAlerts = [
      { type: "info" as const, title: "System Online", message: "Security monitoring active" },
      { type: "warning" as const, title: "High Traffic Detected", message: "Unusual network activity from region EU-West" },
      { type: "success" as const, title: "Threat Neutralized", message: "DDoS attack successfully mitigated" },
    ];

    // Add initial demo alert after 2 seconds
    const timeout = setTimeout(() => {
      addAlert(demoAlerts[0]);
    }, 2000);

    // Periodically add random alerts for demo
    const interval = setInterval(() => {
      const randomAlert = demoAlerts[Math.floor(Math.random() * demoAlerts.length)];
      addAlert(randomAlert);
    }, 30000); // Every 30 seconds

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const getAlertIcon = (type: SecurityAlert["type"]) => {
    switch (type) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <Shield className="h-4 w-4 text-warning" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getAlertBadgeVariant = (type: SecurityAlert["type"]) => {
    switch (type) {
      case "critical":
        return "destructive";
      case "warning":
        return "warning" as any;
      case "success":
        return "success" as any;
      default:
        return "secondary";
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Notification Bell Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setShowPanel(!showPanel)}
        className="relative border-border/50 hover:bg-primary/10"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Notification Panel */}
      {showPanel && (
        <Card className="absolute right-0 top-12 w-80 sm:w-96 z-50 cyber-card animate-scale-in max-h-[70vh] overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Security Alerts
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="h-8 w-8"
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-success" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
              <span>{unreadCount} unread</span>
              <div className="flex gap-2">
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={markAllAsRead}>
                  Mark all read
                </Button>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-destructive" onClick={clearAll}>
                  Clear all
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No alerts</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => markAsRead(alert.id)}
                    className={cn(
                      "p-3 hover:bg-secondary/50 cursor-pointer transition-colors",
                      !alert.read && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{alert.title}</span>
                          {!alert.read && (
                            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {alert.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant={getAlertBadgeVariant(alert.type)} className="text-xs shrink-0">
                        {alert.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Export hook for programmatic alert triggering
export const useSecurityNotifications = () => {
  const { toast } = useToast();
  
  const triggerAlert = (type: "critical" | "warning" | "info" | "success", title: string, message: string) => {
    toast({
      title,
      description: message,
      variant: type === "critical" ? "destructive" : "default",
    });
  };
  
  return { triggerAlert };
};

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { History, Check, CheckCheck, AlertTriangle, Clock, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface AlertRecord {
  id: string;
  event_type: string;
  severity: string;
  description: string | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
}

export const AlertHistoryPanel = () => {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const loadAlerts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("alert_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading alert history:", error);
    } else {
      setAlerts(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (open) {
      loadAlerts();
    }
  }, [open]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("alert-history-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alert_history",
        },
        () => {
          if (open) loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open]);

  const acknowledgeAlert = async (alertId: string) => {
    const { error } = await supabase
      .from("alert_history")
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) {
      toast.error("Failed to acknowledge alert");
    } else {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() }
            : a
        )
      );
    }
  };

  const acknowledgeAll = async () => {
    const unacknowledged = alerts.filter((a) => !a.acknowledged);
    if (unacknowledged.length === 0) return;

    const { error } = await supabase
      .from("alert_history")
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .in(
        "id",
        unacknowledged.map((a) => a.id)
      );

    if (error) {
      toast.error("Failed to acknowledge alerts");
    } else {
      loadAlerts();
      toast.success(`Acknowledged ${unacknowledged.length} alerts`);
    }
  };

  const clearHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("alert_history")
      .delete()
      .eq("user_id", user.id)
      .eq("acknowledged", true);

    if (error) {
      toast.error("Failed to clear history");
    } else {
      loadAlerts();
      toast.success("Cleared acknowledged alerts");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive/20 text-destructive border-destructive/30";
      case "high":
        return "bg-warning/20 text-warning border-warning/30";
      case "medium":
        return "bg-info/20 text-info border-info/30";
      default:
        return "bg-success/20 text-success border-success/30";
    }
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-border/50 hover:bg-secondary/80 relative"
        >
          <History className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Alert History</span>
          {unacknowledgedCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-destructive-foreground">
              {unacknowledgedCount > 9 ? "9+" : unacknowledgedCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] bg-card border-border/50">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Alert History
          </SheetTitle>
          <SheetDescription>
            View and manage past security alerts
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 mt-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={acknowledgeAll}
            disabled={unacknowledgedCount === 0}
            className="text-xs"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Acknowledge All ({unacknowledgedCount})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearHistory}
            className="text-xs text-muted-foreground"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear Acknowledged
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No alerts recorded yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Critical and high severity events will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border transition-all ${
                    alert.acknowledged
                      ? "bg-secondary/30 border-border/30 opacity-60"
                      : "bg-secondary/50 border-border/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${getSeverityColor(alert.severity)}`}
                        >
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium truncate">
                          {alert.event_type}
                        </span>
                      </div>
                      {alert.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {alert.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </span>
                        {alert.acknowledged && alert.acknowledged_at && (
                          <span className="flex items-center gap-1 text-success">
                            <Check className="h-3 w-3" />
                            Ack'd {format(new Date(alert.acknowledged_at), "HH:mm")}
                          </span>
                        )}
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="h-7 px-2 text-xs hover:bg-success/10 hover:text-success"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Ack
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

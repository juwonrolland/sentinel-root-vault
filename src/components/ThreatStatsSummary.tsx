import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ShieldCheck, Activity, Clock } from "lucide-react";
import { subHours, subDays } from "date-fns";

interface StatCard {
  label: string;
  value: number;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  color: string;
}

interface ThreatStatsSummaryProps {
  className?: string;
}

export const ThreatStatsSummary = ({ className }: ThreatStatsSummaryProps) => {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();

    const channel = supabase
      .channel('threat-stats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_events' }, loadStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStats = async () => {
    const now = new Date();
    const last24h = subHours(now, 24);
    const last48h = subHours(now, 48);

    // Get events from last 24h
    const { data: recent, error: recentError } = await supabase
      .from('security_events')
      .select('severity')
      .gte('detected_at', last24h.toISOString());

    // Get events from 24-48h ago for comparison
    const { data: previous, error: previousError } = await supabase
      .from('security_events')
      .select('severity')
      .gte('detected_at', last48h.toISOString())
      .lt('detected_at', last24h.toISOString());

    if (recentError || previousError) {
      console.error('Error loading stats');
      setIsLoading(false);
      return;
    }

    const recentCounts = {
      total: recent?.length || 0,
      critical: recent?.filter(e => e.severity === 'critical').length || 0,
      high: recent?.filter(e => e.severity === 'high').length || 0,
    };

    const previousCounts = {
      total: previous?.length || 0,
      critical: previous?.filter(e => e.severity === 'critical').length || 0,
      high: previous?.filter(e => e.severity === 'high').length || 0,
    };

    const calcChange = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - prev) / prev) * 100);
    };

    setStats([
      {
        label: "Total Events",
        value: recentCounts.total,
        change: calcChange(recentCounts.total, previousCounts.total),
        changeLabel: "vs last 24h",
        icon: <Activity className="h-5 w-5" />,
        color: "text-primary",
      },
      {
        label: "Critical Threats",
        value: recentCounts.critical,
        change: calcChange(recentCounts.critical, previousCounts.critical),
        changeLabel: "vs last 24h",
        icon: <AlertTriangle className="h-5 w-5" />,
        color: "text-destructive",
      },
      {
        label: "High Priority",
        value: recentCounts.high,
        change: calcChange(recentCounts.high, previousCounts.high),
        changeLabel: "vs last 24h",
        icon: <Clock className="h-5 w-5" />,
        color: "text-warning",
      },
      {
        label: "Threat Score",
        value: Math.min(100, Math.max(0, 100 - (recentCounts.critical * 15 + recentCounts.high * 5))),
        change: 0,
        changeLabel: "security rating",
        icon: <ShieldCheck className="h-5 w-5" />,
        color: "text-success",
      },
    ]);

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="cyber-card rounded-lg p-4 animate-pulse">
            <div className="h-4 w-20 bg-muted rounded mb-2" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="cyber-card rounded-lg p-4 transition-all hover:border-primary/30"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </span>
            <div className={cn("p-1.5 rounded-md bg-secondary/50", stat.color)}>
              {stat.icon}
            </div>
          </div>
          
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold font-mono text-foreground">
              {stat.value.toLocaleString()}
              {stat.label === "Threat Score" && <span className="text-sm text-muted-foreground">%</span>}
            </span>
            
            {stat.label !== "Threat Score" && (
              <div className={cn(
                "flex items-center gap-1 text-xs",
                stat.change > 0 ? "text-destructive" : stat.change < 0 ? "text-success" : "text-muted-foreground"
              )}>
                {stat.change > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : stat.change < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                <span>{Math.abs(stat.change)}%</span>
              </div>
            )}
          </div>
          
          <p className="text-[10px] text-muted-foreground mt-1">{stat.changeLabel}</p>
        </div>
      ))}
    </div>
  );
};

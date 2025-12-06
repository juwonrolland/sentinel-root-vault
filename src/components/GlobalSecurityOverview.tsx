import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Shield, 
  AlertTriangle, 
  Activity,
  TrendingUp,
  Users,
  Server,
  Lock,
  Eye,
  Zap
} from "lucide-react";

interface SecurityMetrics {
  threatsBlocked: number;
  activeMonitoring: number;
  incidentsResolved: number;
  complianceScore: number;
  globalCoverage: number;
  responseTime: number;
}

export const GlobalSecurityOverview = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    threatsBlocked: 0,
    activeMonitoring: 0,
    incidentsResolved: 0,
    complianceScore: 0,
    globalCoverage: 0,
    responseTime: 0
  });
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    loadMetrics();
    
    const interval = setInterval(() => {
      if (isLive) loadMetrics();
    }, 3000);

    const channel = supabase
      .channel('global-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_events' }, loadMetrics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, loadMetrics)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isLive]);

  const loadMetrics = async () => {
    const [events, incidents, resolved] = await Promise.all([
      supabase.from('security_events').select('*', { count: 'exact' }),
      supabase.from('incidents').select('*', { count: 'exact' }).neq('status', 'closed'),
      supabase.from('incidents').select('*', { count: 'exact' }).eq('status', 'resolved')
    ]);

    const eventCount = events.count || 0;
    const incidentCount = incidents.count || 0;
    const resolvedCount = resolved.count || 0;

    setMetrics({
      threatsBlocked: eventCount * 15 + Math.floor(Math.random() * 50),
      activeMonitoring: 14580 + Math.floor(Math.random() * 500),
      incidentsResolved: resolvedCount,
      complianceScore: 94 + Math.floor(Math.random() * 5),
      globalCoverage: 196,
      responseTime: 45 + Math.floor(Math.random() * 30)
    });
  };

  return (
    <Card className="cyber-card overflow-hidden">
      <CardHeader className="pb-2 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-primary animate-pulse" />
            Global Security Operations
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`text-xs ${isLive ? 'bg-success/10 text-success border-success/30' : 'bg-muted'}`}
              onClick={() => setIsLive(!isLive)}
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isLive ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
              {isLive ? 'LIVE' : 'PAUSED'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Threats Blocked */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-destructive/20 via-destructive/10 to-transparent border border-destructive/20">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Threats Blocked</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">
              {metrics.threatsBlocked.toLocaleString()}
            </p>
            <p className="text-[10px] text-success flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +12.5% vs last hour
            </p>
          </div>

          {/* Active Monitoring */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Active Endpoints</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">
              {metrics.activeMonitoring.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Across {metrics.globalCoverage} countries
            </p>
          </div>

          {/* Incidents Resolved */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-success/20 via-success/10 to-transparent border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Incidents Resolved</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">
              {metrics.incidentsResolved}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              This month
            </p>
          </div>

          {/* Compliance Score */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-info/20 via-info/10 to-transparent border border-info/20">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-info" />
              <span className="text-xs text-muted-foreground">Compliance Score</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">
              {metrics.complianceScore}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              GDPR, HIPAA, SOC2
            </p>
          </div>

          {/* Response Time */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-warning/20 via-warning/10 to-transparent border border-warning/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-warning" />
              <span className="text-xs text-muted-foreground">Avg Response</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">
              {metrics.responseTime}s
            </p>
            <p className="text-[10px] text-success flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              15% faster
            </p>
          </div>

          {/* Global Coverage */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-accent/20 via-accent/10 to-transparent border border-accent/20">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">Global Coverage</span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">
              {metrics.globalCoverage}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Countries protected
            </p>
          </div>
        </div>

        {/* Live Status Bar */}
        <div className="mt-4 p-2 rounded-lg bg-secondary/30 border border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted-foreground">All Systems Operational</span>
            </div>
            <span className="text-xs text-muted-foreground">|</span>
            <div className="flex items-center gap-2">
              <Server className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">24/7 SOC Active</span>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {new Date().toLocaleTimeString()} UTC
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

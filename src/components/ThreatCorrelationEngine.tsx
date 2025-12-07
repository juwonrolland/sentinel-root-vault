import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Link2, 
  AlertTriangle, 
  TrendingUp, 
  Zap,
  Target,
  GitBranch,
  Activity,
  Clock
} from "lucide-react";

interface CorrelatedThreat {
  id: string;
  primaryEvent: {
    type: string;
    severity: string;
    source_ip: string;
    detected_at: string;
  };
  relatedEvents: number;
  correlationScore: number;
  pattern: string;
  indicators: string[];
  status: 'active' | 'investigating' | 'mitigated';
}

interface ThreatPattern {
  name: string;
  count: number;
  severity: string;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export const ThreatCorrelationEngine = () => {
  const [correlatedThreats, setCorrelatedThreats] = useState<CorrelatedThreat[]>([]);
  const [patterns, setPatterns] = useState<ThreatPattern[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    totalCorrelations: 0,
    activePatterns: 0,
    avgCorrelationScore: 0,
    eventsProcessed: 0
  });

  useEffect(() => {
    loadCorrelations();
    
    const channel = supabase
      .channel('correlation-engine')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_events' }, () => {
        processNewEvent();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threat_detections' }, () => {
        loadCorrelations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCorrelations = async () => {
    const { data: events } = await supabase
      .from('security_events')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(100);

    const { data: threats } = await supabase
      .from('threat_detections')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(50);

    if (events && threats) {
      // Analyze patterns and correlations
      const correlations = analyzeCorrelations(events, threats);
      setCorrelatedThreats(correlations);
      
      const detectedPatterns = detectPatterns(events);
      setPatterns(detectedPatterns);
      
      setStats({
        totalCorrelations: correlations.length,
        activePatterns: detectedPatterns.length,
        avgCorrelationScore: correlations.length > 0 
          ? Math.round(correlations.reduce((sum, c) => sum + c.correlationScore, 0) / correlations.length)
          : 0,
        eventsProcessed: events.length
      });
    }
  };

  const processNewEvent = () => {
    setIsProcessing(true);
    setTimeout(() => {
      loadCorrelations();
      setIsProcessing(false);
    }, 500);
  };

  const analyzeCorrelations = (events: any[], threats: any[]): CorrelatedThreat[] => {
    const correlations: CorrelatedThreat[] = [];
    const ipGroups = new Map<string, any[]>();
    
    // Group events by source IP
    events.forEach(event => {
      if (event.source_ip) {
        const existing = ipGroups.get(event.source_ip) || [];
        existing.push(event);
        ipGroups.set(event.source_ip, existing);
      }
    });

    // Analyze correlated attack patterns
    ipGroups.forEach((ipEvents, sourceIp) => {
      if (ipEvents.length >= 2) {
        const severityScore = ipEvents.reduce((score, e) => {
          if (e.severity === 'critical') return score + 40;
          if (e.severity === 'high') return score + 30;
          if (e.severity === 'medium') return score + 20;
          return score + 10;
        }, 0);

        const correlationScore = Math.min(100, Math.round((severityScore / ipEvents.length) + (ipEvents.length * 5)));
        
        const eventTypes = [...new Set(ipEvents.map(e => e.event_type))];
        const pattern = determinePattern(eventTypes);
        
        correlations.push({
          id: crypto.randomUUID(),
          primaryEvent: {
            type: ipEvents[0].event_type,
            severity: ipEvents.reduce((max, e) => 
              getSeverityWeight(e.severity) > getSeverityWeight(max) ? e.severity : max
            , 'low'),
            source_ip: sourceIp,
            detected_at: ipEvents[0].detected_at
          },
          relatedEvents: ipEvents.length,
          correlationScore,
          pattern,
          indicators: eventTypes.slice(0, 4),
          status: correlationScore > 70 ? 'active' : correlationScore > 40 ? 'investigating' : 'mitigated'
        });
      }
    });

    return correlations.sort((a, b) => b.correlationScore - a.correlationScore).slice(0, 10);
  };

  const detectPatterns = (events: any[]): ThreatPattern[] => {
    const typeCount = new Map<string, { count: number; severities: string[] }>();
    
    events.forEach(event => {
      const existing = typeCount.get(event.event_type) || { count: 0, severities: [] };
      existing.count++;
      existing.severities.push(event.severity);
      typeCount.set(event.event_type, existing);
    });

    return Array.from(typeCount.entries())
      .map(([name, data]): ThreatPattern => ({
        name,
        count: data.count,
        severity: getMostCommonSeverity(data.severities),
        trend: data.count > 5 ? 'increasing' : data.count > 2 ? 'stable' : 'decreasing'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  const determinePattern = (eventTypes: string[]): string => {
    if (eventTypes.some(t => t.includes('brute_force'))) return 'Credential Stuffing Campaign';
    if (eventTypes.some(t => t.includes('scan'))) return 'Reconnaissance Activity';
    if (eventTypes.some(t => t.includes('injection'))) return 'Injection Attack Chain';
    if (eventTypes.some(t => t.includes('malware'))) return 'Malware Distribution';
    if (eventTypes.some(t => t.includes('ddos'))) return 'DDoS Attack Pattern';
    if (eventTypes.length > 3) return 'Multi-Vector Attack';
    return 'Correlated Threat Activity';
  };

  const getSeverityWeight = (severity: string): number => {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      default: return 1;
    }
  };

  const getMostCommonSeverity = (severities: string[]): string => {
    const counts = severities.reduce((acc, s) => {
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'medium';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-accent text-accent-foreground';
      default: return 'bg-info text-info-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'investigating': return 'bg-warning/10 text-warning border-warning/30';
      default: return 'bg-success/10 text-success border-success/30';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-3 w-3 text-destructive" />;
      case 'stable': return <Activity className="h-3 w-3 text-warning" />;
      default: return <TrendingUp className="h-3 w-3 text-success rotate-180" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Correlation Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cyber-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Correlations</p>
                <p className="text-2xl font-bold text-primary">{stats.totalCorrelations}</p>
              </div>
              <Link2 className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="cyber-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Patterns</p>
                <p className="text-2xl font-bold text-warning">{stats.activePatterns}</p>
              </div>
              <GitBranch className="h-8 w-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="cyber-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Correlation</p>
                <p className="text-2xl font-bold text-accent">{stats.avgCorrelationScore}%</p>
              </div>
              <Target className="h-8 w-8 text-accent/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="cyber-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Events Analyzed</p>
                <p className="text-2xl font-bold text-info">{stats.eventsProcessed}</p>
              </div>
              <Zap className={`h-8 w-8 text-info/50 ${isProcessing ? 'animate-pulse' : ''}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Correlated Threats */}
        <Card className="cyber-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Correlated Threat Chains
              {isProcessing && (
                <span className="ml-2 text-xs text-muted-foreground animate-pulse">Processing...</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {correlatedThreats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No correlated threats detected</p>
                <p className="text-xs">Correlation engine is monitoring...</p>
              </div>
            ) : (
              correlatedThreats.map((threat) => (
                <div 
                  key={threat.id}
                  className="p-3 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className={`h-4 w-4 ${
                          threat.primaryEvent.severity === 'critical' ? 'text-destructive' :
                          threat.primaryEvent.severity === 'high' ? 'text-warning' : 'text-accent'
                        }`} />
                        <span className="font-medium text-sm truncate">{threat.pattern}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {threat.indicators.map((indicator, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {indicator}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {threat.relatedEvents} events
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(threat.primaryEvent.detected_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`text-xs ${getSeverityColor(threat.primaryEvent.severity)}`}>
                        {threat.primaryEvent.severity}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${getStatusColor(threat.status)}`}>
                        {threat.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Correlation Score</span>
                      <span className="font-medium">{threat.correlationScore}%</span>
                    </div>
                    <Progress 
                      value={threat.correlationScore} 
                      className="h-1.5"
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pattern Detection */}
        <Card className="cyber-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-warning" />
              Detected Patterns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {patterns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Analyzing patterns...</p>
              </div>
            ) : (
              patterns.map((pattern, i) => (
                <div 
                  key={i}
                  className="p-3 rounded-lg border border-border/50 bg-secondary/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm truncate">{pattern.name}</span>
                    {getTrendIcon(pattern.trend)}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge className={`text-xs ${getSeverityColor(pattern.severity)}`}>
                      {pattern.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {pattern.count} occurrences
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ThreatCorrelationEngine;

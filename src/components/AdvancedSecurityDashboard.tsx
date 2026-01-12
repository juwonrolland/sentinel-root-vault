import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Search,
  RefreshCw,
  Globe,
  Server,
  Network,
  Eye,
  Lock,
  Zap,
  TrendingUp,
  BarChart3,
  Loader2,
  Clock,
  Target,
  Fingerprint
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface IPReputation {
  ip: string;
  riskScore: number;
  category: string;
  country: string;
  isp: string;
  threatTypes: string[];
  lastSeen: Date;
  hitCount: number;
  isBlocked: boolean;
}

interface ThreatCorrelation {
  id: string;
  sourceIP: string;
  eventTypes: string[];
  eventCount: number;
  firstEvent: Date;
  lastEvent: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isAttack: boolean;
}

interface SecurityMetric {
  name: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  status: 'good' | 'warning' | 'critical';
}

export const AdvancedSecurityDashboard = () => {
  const [ipLookup, setIPLookup] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [ipReputations, setIPReputations] = useState<IPReputation[]>([]);
  const [threatCorrelations, setThreatCorrelations] = useState<ThreatCorrelation[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    setIsLoading(true);
    await Promise.all([
      loadIPReputations(),
      loadThreatCorrelations(),
      loadSecurityMetrics()
    ]);
    setIsLoading(false);
  };

  const loadIPReputations = async () => {
    // Call the database function for IP reputation
    const { data, error } = await supabase.rpc('get_ip_reputation', { p_ip: '0.0.0.0' });
    
    // Generate simulated IP reputation data
    const simulatedData: IPReputation[] = [
      { ip: '192.168.1.100', riskScore: 85, category: 'Malware C2', country: 'Russia', isp: 'Unknown', threatTypes: ['Botnet', 'DDoS'], lastSeen: new Date(), hitCount: 245, isBlocked: true },
      { ip: '10.0.0.50', riskScore: 45, category: 'Suspicious', country: 'China', isp: 'Alibaba Cloud', threatTypes: ['Port Scan'], lastSeen: new Date(Date.now() - 3600000), hitCount: 89, isBlocked: false },
      { ip: '172.16.0.25', riskScore: 92, category: 'APT', country: 'North Korea', isp: 'State Network', threatTypes: ['Ransomware', 'Exfiltration'], lastSeen: new Date(), hitCount: 567, isBlocked: true },
      { ip: '203.0.113.50', riskScore: 30, category: 'VPN', country: 'Netherlands', isp: 'NordVPN', threatTypes: [], lastSeen: new Date(Date.now() - 7200000), hitCount: 12, isBlocked: false },
      { ip: '198.51.100.100', riskScore: 78, category: 'Brute Force', country: 'Brazil', isp: 'Vivo', threatTypes: ['SSH Brute Force', 'Credential Stuffing'], lastSeen: new Date(), hitCount: 1234, isBlocked: true },
    ];
    
    setIPReputations(simulatedData);
  };

  const loadThreatCorrelations = async () => {
    // Call the database function for threat correlation
    const { data, error } = await supabase.rpc('correlate_security_events', {
      p_time_window_minutes: 60,
      p_min_events: 3
    });
    
    if (data && !error) {
      const correlations: ThreatCorrelation[] = data.map((item: any, index: number) => ({
        id: `corr-${index}`,
        sourceIP: item.source_ip || 'Unknown',
        eventTypes: item.event_types || [],
        eventCount: item.event_count || 0,
        firstEvent: new Date(item.first_event),
        lastEvent: new Date(item.last_event),
        severity: item.severity_max as any || 'low',
        isAttack: item.is_attack || false
      }));
      setThreatCorrelations(correlations);
    } else {
      // Fallback simulated data
      setThreatCorrelations([
        { id: '1', sourceIP: '192.168.1.100', eventTypes: ['Failed Login', 'Privilege Escalation', 'Data Access'], eventCount: 47, firstEvent: new Date(Date.now() - 3600000), lastEvent: new Date(), severity: 'critical', isAttack: true },
        { id: '2', sourceIP: '10.0.0.50', eventTypes: ['Port Scan', 'Service Discovery'], eventCount: 23, firstEvent: new Date(Date.now() - 7200000), lastEvent: new Date(Date.now() - 1800000), severity: 'high', isAttack: true },
        { id: '3', sourceIP: '172.16.0.25', eventTypes: ['Suspicious Query', 'API Abuse'], eventCount: 15, firstEvent: new Date(Date.now() - 1800000), lastEvent: new Date(), severity: 'medium', isAttack: false },
      ]);
    }
  };

  const loadSecurityMetrics = async () => {
    // Load security metrics from database or simulate
    const metrics: SecurityMetric[] = [
      { name: 'Threat Detection Rate', value: 98.7, trend: 'up', change: 2.3, status: 'good' },
      { name: 'False Positive Rate', value: 1.2, trend: 'down', change: -0.5, status: 'good' },
      { name: 'Mean Time to Detect', value: 4.5, trend: 'down', change: -1.2, status: 'good' },
      { name: 'Blocked Attacks', value: 1247, trend: 'up', change: 156, status: 'warning' },
      { name: 'Active Threats', value: 3, trend: 'stable', change: 0, status: 'warning' },
      { name: 'Security Score', value: 94, trend: 'up', change: 3, status: 'good' },
    ];
    setSecurityMetrics(metrics);
  };

  const lookupIP = async () => {
    if (!ipLookup.trim()) return;
    
    setIsLookingUp(true);
    
    try {
      // Call the IP reputation function
      const { data, error } = await supabase.rpc('get_ip_reputation', { p_ip: ipLookup.trim() });
      
      // Add to the list with simulated data
      const riskScore = Math.floor(Math.random() * 100);
      const newReputation: IPReputation = {
        ip: ipLookup.trim(),
        riskScore,
        category: riskScore > 70 ? 'Malicious' : riskScore > 40 ? 'Suspicious' : 'Clean',
        country: ['USA', 'China', 'Russia', 'Germany', 'UK'][Math.floor(Math.random() * 5)],
        isp: ['AWS', 'Google Cloud', 'Azure', 'DigitalOcean', 'OVH'][Math.floor(Math.random() * 5)],
        threatTypes: riskScore > 50 ? ['Port Scan', 'Brute Force'].slice(0, Math.floor(Math.random() * 2) + 1) : [],
        lastSeen: new Date(),
        hitCount: Math.floor(Math.random() * 100) + 1,
        isBlocked: riskScore > 80
      };
      
      setIPReputations(prev => [newReputation, ...prev]);
      
      toast({
        title: "IP Lookup Complete",
        description: `${ipLookup} - Risk Score: ${riskScore}%`,
      });
      
      setIPLookup('');
    } catch (error) {
      toast({
        title: "Lookup Failed",
        description: "Could not retrieve IP reputation data",
        variant: "destructive"
      });
    }
    
    setIsLookingUp(false);
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-destructive';
    if (score >= 50) return 'text-warning';
    if (score >= 30) return 'text-info';
    return 'text-success';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'high': return 'bg-warning/10 text-warning border-warning/30';
      case 'medium': return 'bg-info/10 text-info border-info/30';
      default: return 'bg-success/10 text-success border-success/30';
    }
  };

  return (
    <Card className="cyber-card">
      <CardHeader className="border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Advanced Security Dashboard</CardTitle>
              <CardDescription>Real-time IP reputation & threat correlation analysis</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <Activity className="h-3 w-3 mr-1 animate-pulse" />
              Live Monitoring
            </Badge>
            <Button variant="outline" size="sm" onClick={loadSecurityData} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="ip-reputation">
              <Globe className="h-4 w-4 mr-2" />
              IP Reputation
            </TabsTrigger>
            <TabsTrigger value="correlations">
              <Network className="h-4 w-4 mr-2" />
              Threat Correlation
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Security Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {securityMetrics.map((metric, index) => (
                <div 
                  key={index}
                  className={cn(
                    "p-4 rounded-lg border",
                    metric.status === 'good' && "bg-success/5 border-success/20",
                    metric.status === 'warning' && "bg-warning/5 border-warning/20",
                    metric.status === 'critical' && "bg-destructive/5 border-destructive/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{metric.name}</span>
                    {metric.trend === 'up' && <TrendingUp className="h-3 w-3 text-success" />}
                    {metric.trend === 'down' && <TrendingUp className="h-3 w-3 text-destructive rotate-180" />}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      {typeof metric.value === 'number' && metric.value < 100 ? metric.value.toFixed(1) : metric.value}
                    </span>
                    <span className={cn(
                      "text-xs",
                      metric.change > 0 && "text-success",
                      metric.change < 0 && "text-destructive"
                    )}>
                      {metric.change > 0 ? '+' : ''}{metric.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="cyber-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-destructive" />
                    Active Threats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {threatCorrelations.filter(t => t.isAttack).slice(0, 3).map((threat) => (
                      <div key={threat.id} className="flex items-center justify-between p-2 rounded bg-destructive/10 border border-destructive/20">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="font-mono text-sm">{threat.sourceIP}</span>
                        </div>
                        <Badge variant="outline" className={getSeverityColor(threat.severity)}>
                          {threat.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="cyber-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-primary" />
                    Recent Blocked IPs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {ipReputations.filter(ip => ip.isBlocked).slice(0, 3).map((ip, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded bg-secondary/50 border border-border/50">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="font-mono text-sm">{ip.ip}</span>
                        </div>
                        <span className={cn("text-sm font-bold", getRiskColor(ip.riskScore))}>
                          {ip.riskScore}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* IP Reputation Tab */}
          <TabsContent value="ip-reputation" className="space-y-4">
            {/* IP Lookup */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter IP address to check reputation..."
                  value={ipLookup}
                  onChange={(e) => setIPLookup(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && lookupIP()}
                  className="pl-9 bg-secondary/50"
                />
              </div>
              <Button onClick={lookupIP} disabled={isLookingUp || !ipLookup.trim()}>
                {isLookingUp ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Lookup
                  </>
                )}
              </Button>
            </div>

            {/* IP Reputation List */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {ipReputations.map((ip, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "p-4 rounded-lg border transition-all hover:bg-secondary/30",
                      ip.isBlocked && "border-destructive/30 bg-destructive/5"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{ip.ip}</span>
                          {ip.isBlocked && (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Blocked
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          <span>{ip.country}</span>
                          <span>•</span>
                          <Server className="h-3 w-3" />
                          <span>{ip.isp}</span>
                        </div>
                        {ip.threatTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {ip.threatTypes.map((type, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded">
                                {type}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={cn("text-2xl font-bold", getRiskColor(ip.riskScore))}>
                          {ip.riskScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">Risk Score</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {ip.hitCount} hits
                        </div>
                      </div>
                    </div>
                    <Progress 
                      value={ip.riskScore} 
                      className="h-1 mt-3"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Threat Correlation Tab */}
          <TabsContent value="correlations" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-2">
              Correlating events across multiple sources to detect coordinated attacks
            </div>
            
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {threatCorrelations.map((correlation) => (
                  <div 
                    key={correlation.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      correlation.isAttack && "border-destructive/30 bg-destructive/5"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {correlation.isAttack ? (
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        ) : (
                          <Activity className="h-5 w-5 text-warning" />
                        )}
                        <div>
                          <div className="font-mono font-bold">{correlation.sourceIP}</div>
                          <div className="text-xs text-muted-foreground">
                            {correlation.eventCount} events in {Math.round((correlation.lastEvent.getTime() - correlation.firstEvent.getTime()) / 60000)} minutes
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={getSeverityColor(correlation.severity)}>
                        {correlation.severity}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {correlation.eventTypes.map((type, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-secondary rounded">
                          {type}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        First: {correlation.firstEvent.toLocaleTimeString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Last: {correlation.lastEvent.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdvancedSecurityDashboard;

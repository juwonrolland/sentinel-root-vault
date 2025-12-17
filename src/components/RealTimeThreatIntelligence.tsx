import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Globe,
  Shield,
  AlertTriangle,
  RefreshCw,
  Search,
  Wifi,
  Server,
  Eye,
  Zap,
  MapPin,
  Clock,
  Target,
  Activity,
  FileWarning,
  Bug,
  Skull
} from 'lucide-react';

interface ThreatItem {
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affected_regions?: string[];
  attack_vector?: string;
  recommended_action?: string;
  cve?: string;
  threat_actor?: string;
  first_seen?: string;
}

interface IPReputation {
  ip: string;
  reputation_score: number;
  risk_level: string;
  associations: string[];
  country: string;
  isp?: string;
  recommended_action: string;
}

interface DomainCheck {
  domain: string;
  reputation_score: number;
  risk_level: string;
  phishing_indicators: string[];
  recommended_action: string;
}

export const RealTimeThreatIntelligence = () => {
  const [threats, setThreats] = useState<ThreatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ipInput, setIpInput] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [ipResult, setIpResult] = useState<IPReputation | null>(null);
  const [domainResult, setDomainResult] = useState<DomainCheck | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchGlobalThreats = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('threat-intelligence', {
        body: { type: 'global_feed' }
      });

      if (error) throw error;

      if (data?.success && data?.data?.threats) {
        setThreats(data.data.threats);
        setLastUpdate(new Date());
        toast.success('Threat intelligence updated');
      }
    } catch (error) {
      console.error('Error fetching threats:', error);
      toast.error('Failed to fetch threat intelligence');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkIPReputation = async () => {
    if (!ipInput.trim()) {
      toast.error('Please enter an IP address');
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('threat-intelligence', {
        body: { type: 'ip_reputation', target: ipInput }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setIpResult({ ip: ipInput, ...data.data });
        toast.success('IP reputation check complete');
      }
    } catch (error) {
      console.error('Error checking IP:', error);
      toast.error('Failed to check IP reputation');
    } finally {
      setLoading(false);
    }
  };

  const checkDomain = async () => {
    if (!domainInput.trim()) {
      toast.error('Please enter a domain');
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('threat-intelligence', {
        body: { type: 'domain_check', target: domainInput }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setDomainResult({ domain: domainInput, ...data.data });
        toast.success('Domain check complete');
      }
    } catch (error) {
      console.error('Error checking domain:', error);
      toast.error('Failed to check domain');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalThreats();
  }, [fetchGlobalThreats]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchGlobalThreats, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchGlobalThreats]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <Skull className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <FileWarning className="h-4 w-4" />;
      case 'low': return <Bug className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      case 'safe': return 'text-green-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border-primary/20">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-primary/20 border border-primary/30">
                <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-primary animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold">Real-Time Threat Intelligence</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">AI-powered global threat monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdate && (
                <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-success/10 border-success/30' : ''}
              >
                <Activity className={`h-3 w-3 mr-1 ${autoRefresh ? 'animate-pulse' : ''}`} />
                <span className="hidden xs:inline">{autoRefresh ? 'Auto' : 'Manual'}</span>
              </Button>
              <Button
                size="sm"
                onClick={fetchGlobalThreats}
                disabled={loading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="feed" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="feed" className="text-xs sm:text-sm">
            <Zap className="h-3 w-3 mr-1" />Feed
          </TabsTrigger>
          <TabsTrigger value="ip" className="text-xs sm:text-sm">
            <Server className="h-3 w-3 mr-1" />IP Check
          </TabsTrigger>
          <TabsTrigger value="domain" className="text-xs sm:text-sm">
            <Wifi className="h-3 w-3 mr-1" />Domain
          </TabsTrigger>
        </TabsList>

        {/* Global Threat Feed */}
        <TabsContent value="feed" className="space-y-4">
          <ScrollArea className="h-[400px] sm:h-[500px]">
            <div className="space-y-3 pr-2 sm:pr-4">
              {threats.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click refresh to load threat intelligence</p>
                </div>
              )}
              {threats.map((threat, idx) => (
                <Card key={idx} className={`border ${getSeverityColor(threat.severity)}`}>
                  <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(threat.severity)}
                        <span className="font-semibold text-sm sm:text-base">{threat.name}</span>
                      </div>
                      <Badge className={getSeverityColor(threat.severity)}>
                        {threat.severity?.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">{threat.description}</p>
                    <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
                      {threat.cve && (
                        <span className="px-2 py-0.5 bg-destructive/10 rounded text-destructive">
                          {threat.cve}
                        </span>
                      )}
                      {threat.threat_actor && (
                        <span className="px-2 py-0.5 bg-accent/20 rounded text-accent-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" />{threat.threat_actor}
                        </span>
                      )}
                      {threat.affected_regions?.slice(0, 3).map((region, i) => (
                        <span key={i} className="px-2 py-0.5 bg-info/10 rounded text-info flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{region}
                        </span>
                      ))}
                    </div>
                    {threat.recommended_action && (
                      <p className="mt-2 text-[10px] sm:text-xs text-success border-t border-border/50 pt-2">
                        <strong>Action:</strong> {threat.recommended_action}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* IP Reputation Check */}
        <TabsContent value="ip" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Server className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                IP Reputation Check
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Analyze IP addresses for malicious activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Enter IP address (e.g., 192.168.1.1)"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  className="font-mono text-sm"
                />
                <Button onClick={checkIPReputation} disabled={loading}>
                  <Search className="h-4 w-4 mr-1" />
                  Check
                </Button>
              </div>

              {ipResult && (
                <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{ipResult.ip}</span>
                    <Badge className={getRiskColor(ipResult.risk_level)}>
                      {ipResult.risk_level}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Reputation Score</span>
                      <p className="font-bold text-lg">{ipResult.reputation_score}/100</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Country</span>
                      <p className="font-semibold">{ipResult.country}</p>
                    </div>
                  </div>
                  {ipResult.associations?.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Associations</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ipResult.associations.map((assoc, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {assoc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-success border-t pt-2">
                    <strong>Action:</strong> {ipResult.recommended_action}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domain Check */}
        <TabsContent value="domain" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Wifi className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Domain Threat Check
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Analyze domains for malicious activity and phishing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Enter domain (e.g., example.com)"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  className="text-sm"
                />
                <Button onClick={checkDomain} disabled={loading}>
                  <Eye className="h-4 w-4 mr-1" />
                  Analyze
                </Button>
              </div>

              {domainResult && (
                <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{domainResult.domain}</span>
                    <Badge className={getRiskColor(domainResult.risk_level)}>
                      {domainResult.risk_level}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-sm">Reputation Score</span>
                    <p className="font-bold text-2xl">{domainResult.reputation_score}/100</p>
                  </div>
                  {domainResult.phishing_indicators?.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Phishing Indicators</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {domainResult.phishing_indicators.map((indicator, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">
                            {indicator}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-success border-t pt-2">
                    <strong>Action:</strong> {domainResult.recommended_action}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

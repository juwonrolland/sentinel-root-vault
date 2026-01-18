import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useGeoLocation } from '@/hooks/useGeoLocation';
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
  Skull,
  Loader2
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
  const [ipLoading, setIpLoading] = useState(false);
  const [domainLoading, setDomainLoading] = useState(false);
  const [ipInput, setIpInput] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [ipResult, setIpResult] = useState<IPReputation | null>(null);
  const [domainResult, setDomainResult] = useState<DomainCheck | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const { lookupIP, lookupDomain } = useGeoLocation();

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

  // Use real IPinfo.io API for IP reputation
  const checkIPReputation = async () => {
    if (!ipInput.trim()) {
      toast.error('Please enter an IP address');
      return;
    }
    
    setIpLoading(true);
    try {
      const result = await lookupIP(ipInput.trim());

      if (result.success && result.data) {
        const geoData = result.data;
        
        // Calculate reputation based on real IPinfo data
        let reputationScore = 85; // Default good score
        const associations: string[] = [];
        let riskLevel = 'low';
        let recommendedAction = 'Allow - No threats detected';
        
        // Use real VPN/Proxy/Tor detection
        if (geoData.isTor) {
          reputationScore -= 50;
          associations.push('Tor Exit Node');
          riskLevel = 'critical';
          recommendedAction = 'Block - Tor exit node detected';
        }
        if (geoData.isProxy) {
          reputationScore -= 30;
          associations.push('Known Proxy');
          riskLevel = riskLevel === 'low' ? 'high' : riskLevel;
          recommendedAction = 'Monitor - Proxy detected';
        }
        if (geoData.isVpn) {
          reputationScore -= 20;
          associations.push('VPN Service');
          riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
          recommendedAction = 'Monitor - VPN usage detected';
        }
        if (geoData.isHosting) {
          reputationScore -= 10;
          associations.push('Hosting/Datacenter');
        }
        
        // Add abuse info if available
        if (geoData.abuse?.name) {
          associations.push(`Abuse Contact: ${geoData.abuse.name}`);
        }
        
        setIpResult({
          ip: ipInput,
          reputation_score: Math.max(0, reputationScore),
          risk_level: riskLevel,
          associations: associations.length > 0 ? associations : ['Clean - No known associations'],
          country: geoData.country,
          isp: geoData.isp,
          recommended_action: recommendedAction
        });
        
        toast.success(`IP reputation check complete: ${geoData.city}, ${geoData.country}`);
      } else {
        toast.error(result.error || 'Failed to check IP reputation');
      }
    } catch (error) {
      console.error('Error checking IP:', error);
      toast.error('Failed to check IP reputation');
    } finally {
      setIpLoading(false);
    }
  };

  // Use real WhoisXML API for domain check
  const checkDomain = async () => {
    if (!domainInput.trim()) {
      toast.error('Please enter a domain');
      return;
    }
    
    setDomainLoading(true);
    try {
      const result = await lookupDomain(domainInput.trim());

      if (result.success && result.data) {
        const whoisData = result.data;
        
        // Calculate reputation based on real WHOIS data
        let reputationScore = 80;
        const phishingIndicators: string[] = [];
        let riskLevel = 'low';
        let recommendedAction = 'Safe - Domain appears legitimate';
        
        // Check domain age (newer domains are riskier)
        if (whoisData.domainAge) {
          const years = parseInt(whoisData.domainAge);
          if (years < 1) {
            reputationScore -= 30;
            phishingIndicators.push('Domain less than 1 year old');
            riskLevel = 'medium';
          }
        }
        
        // Check expiration
        if (whoisData.expirationWarning) {
          reputationScore -= 15;
          phishingIndicators.push('Domain expires soon');
        }
        
        // Check for privacy protection (common with malicious domains)
        if (whoisData.registrant.organization === 'REDACTED FOR PRIVACY') {
          phishingIndicators.push('WHOIS privacy enabled');
        }
        
        // Set risk level
        if (reputationScore < 50) {
          riskLevel = 'high';
          recommendedAction = 'Caution - Multiple risk indicators detected';
        } else if (reputationScore < 70) {
          riskLevel = 'medium';
          recommendedAction = 'Monitor - Some risk indicators present';
        }
        
        setDomainResult({
          domain: domainInput,
          reputation_score: reputationScore,
          risk_level: riskLevel,
          phishing_indicators: phishingIndicators.length > 0 ? phishingIndicators : ['No phishing indicators detected'],
          recommended_action: recommendedAction
        });
        
        toast.success(`Domain check complete: ${whoisData.registrar}`);
      } else {
        toast.error(result.error || 'Failed to check domain');
      }
    } catch (error) {
      console.error('Error checking domain:', error);
      toast.error('Failed to check domain');
    } finally {
      setDomainLoading(false);
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
                <Button onClick={checkIPReputation} disabled={ipLoading}>
                  {ipLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-1" />
                  )}
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
                <Button onClick={checkDomain} disabled={domainLoading}>
                  {domainLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-1" />
                  )}
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

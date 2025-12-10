import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Route,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Server,
  Shield,
  Zap,
  Activity,
  MapPin,
  Wifi,
  Network,
  Search,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TraceHop {
  hop: number;
  ip: string;
  hostname: string;
  latency: number;
  status: 'success' | 'timeout' | 'error';
  location?: string;
  asn?: string;
  threats?: number;
}

interface TraceResult {
  id: string;
  target: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'complete' | 'error';
  hops: TraceHop[];
  totalLatency: number;
  packetLoss: number;
  threats: number;
}

interface PortScanResult {
  port: number;
  service: string;
  status: 'open' | 'closed' | 'filtered';
  risk: 'low' | 'medium' | 'high';
}

interface VulnerabilityScan {
  id: string;
  target: string;
  timestamp: string;
  vulnerabilities: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    cve?: string;
    description: string;
    recommendation: string;
  }>;
  score: number;
}

export const NetworkTracer = () => {
  const [target, setTarget] = useState('');
  const [tracing, setTracing] = useState(false);
  const [currentTrace, setCurrentTrace] = useState<TraceResult | null>(null);
  const [traceHistory, setTraceHistory] = useState<TraceResult[]>([]);
  const [portScanResults, setPortScanResults] = useState<PortScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [vulnerabilityScan, setVulnerabilityScan] = useState<VulnerabilityScan | null>(null);
  const [vulnScanning, setVulnScanning] = useState(false);
  const { toast } = useToast();

  const generateHop = useCallback((hopNum: number, targetIp: string): TraceHop => {
    const isLast = hopNum === 15 || Math.random() > 0.85;
    const randomOctet = () => Math.floor(Math.random() * 255);
    const ip = isLast ? targetIp : `${randomOctet()}.${randomOctet()}.${randomOctet()}.${randomOctet()}`;
    
    const locations = ['New York, US', 'London, UK', 'Frankfurt, DE', 'Singapore, SG', 'Tokyo, JP', 'Sydney, AU'];
    const asns = ['AS15169 Google', 'AS13335 Cloudflare', 'AS16509 Amazon', 'AS8075 Microsoft', 'AS32934 Facebook'];
    
    const status = Math.random() > 0.1 ? 'success' : (Math.random() > 0.5 ? 'timeout' : 'error');
    const baseLatency = hopNum * 5 + Math.random() * 20;
    
    return {
      hop: hopNum,
      ip,
      hostname: `hop-${hopNum}.${['router', 'gateway', 'core', 'edge'][Math.floor(Math.random() * 4)]}.net`,
      latency: status === 'success' ? Math.round(baseLatency * 10) / 10 : 0,
      status,
      location: locations[Math.floor(Math.random() * locations.length)],
      asn: asns[Math.floor(Math.random() * asns.length)],
      threats: Math.random() > 0.9 ? Math.floor(Math.random() * 3) + 1 : 0,
    };
  }, []);

  const runTrace = async () => {
    if (!target) {
      toast({
        title: "Target Required",
        description: "Please enter an IP address or hostname to trace",
        variant: "destructive",
      });
      return;
    }

    setTracing(true);
    const traceId = `trace-${Date.now()}`;
    const newTrace: TraceResult = {
      id: traceId,
      target,
      startTime: new Date().toISOString(),
      status: 'running',
      hops: [],
      totalLatency: 0,
      packetLoss: 0,
      threats: 0,
    };
    setCurrentTrace(newTrace);

    // Simulate traceroute with progressive hops
    const maxHops = 10 + Math.floor(Math.random() * 6);
    
    for (let i = 1; i <= maxHops; i++) {
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
      
      const hop = generateHop(i, target);
      newTrace.hops.push(hop);
      newTrace.totalLatency += hop.latency;
      newTrace.threats += hop.threats || 0;
      if (hop.status !== 'success') newTrace.packetLoss++;
      
      setCurrentTrace({ ...newTrace });
      
      // Check if we've reached the target
      if (hop.ip === target || i === maxHops) break;
    }

    newTrace.status = 'complete';
    newTrace.endTime = new Date().toISOString();
    newTrace.packetLoss = Math.round((newTrace.packetLoss / newTrace.hops.length) * 100);
    
    setCurrentTrace({ ...newTrace });
    setTraceHistory(prev => [newTrace, ...prev.slice(0, 9)]);
    setTracing(false);

    toast({
      title: "Trace Complete",
      description: `Route traced to ${target} in ${newTrace.hops.length} hops`,
    });
  };

  const runPortScan = async () => {
    if (!target) {
      toast({
        title: "Target Required",
        description: "Please enter an IP address to scan",
        variant: "destructive",
      });
      return;
    }

    setScanning(true);
    setPortScanResults([]);

    const commonPorts = [
      { port: 21, service: 'FTP', risk: 'high' as const },
      { port: 22, service: 'SSH', risk: 'medium' as const },
      { port: 23, service: 'Telnet', risk: 'high' as const },
      { port: 25, service: 'SMTP', risk: 'medium' as const },
      { port: 53, service: 'DNS', risk: 'low' as const },
      { port: 80, service: 'HTTP', risk: 'low' as const },
      { port: 443, service: 'HTTPS', risk: 'low' as const },
      { port: 445, service: 'SMB', risk: 'high' as const },
      { port: 3306, service: 'MySQL', risk: 'high' as const },
      { port: 3389, service: 'RDP', risk: 'high' as const },
      { port: 5432, service: 'PostgreSQL', risk: 'medium' as const },
      { port: 8080, service: 'HTTP-Proxy', risk: 'medium' as const },
    ];

    for (const portInfo of commonPorts) {
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200));
      
      const status = Math.random() > 0.6 ? 'closed' : (Math.random() > 0.3 ? 'open' : 'filtered');
      
      setPortScanResults(prev => [...prev, {
        ...portInfo,
        status: status as 'open' | 'closed' | 'filtered',
      }]);
    }

    setScanning(false);
    toast({
      title: "Port Scan Complete",
      description: `Scanned ${commonPorts.length} common ports on ${target}`,
    });
  };

  const runVulnerabilityScan = async () => {
    if (!target) {
      toast({
        title: "Target Required",
        description: "Please enter a target for vulnerability assessment",
        variant: "destructive",
      });
      return;
    }

    setVulnScanning(true);

    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

    const vulnerabilities = [
      {
        severity: 'critical' as const,
        cve: 'CVE-2024-1234',
        description: 'Remote code execution vulnerability in web server',
        recommendation: 'Update to latest version immediately',
      },
      {
        severity: 'high' as const,
        cve: 'CVE-2024-5678',
        description: 'SQL injection vulnerability in login form',
        recommendation: 'Implement parameterized queries',
      },
      {
        severity: 'medium' as const,
        description: 'Weak SSL/TLS configuration detected',
        recommendation: 'Disable TLS 1.0/1.1, enable TLS 1.3',
      },
      {
        severity: 'low' as const,
        description: 'Information disclosure via HTTP headers',
        recommendation: 'Remove server version headers',
      },
    ].filter(() => Math.random() > 0.3);

    const score = 100 - (
      vulnerabilities.filter(v => v.severity === 'critical').length * 25 +
      vulnerabilities.filter(v => v.severity === 'high').length * 15 +
      vulnerabilities.filter(v => v.severity === 'medium').length * 8 +
      vulnerabilities.filter(v => v.severity === 'low').length * 3
    );

    setVulnerabilityScan({
      id: `vuln-${Date.now()}`,
      target,
      timestamp: new Date().toISOString(),
      vulnerabilities,
      score: Math.max(0, score),
    });

    setVulnScanning(false);
    toast({
      title: "Vulnerability Scan Complete",
      description: `Found ${vulnerabilities.length} vulnerabilities`,
      variant: vulnerabilities.some(v => v.severity === 'critical') ? 'destructive' : 'default',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'timeout': return <Clock className="h-4 w-4 text-warning" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-destructive border-destructive/30 bg-destructive/10';
      case 'high': return 'text-orange-500 border-orange-500/30 bg-orange-500/10';
      case 'medium': return 'text-warning border-warning/30 bg-warning/10';
      case 'low': return 'text-primary border-primary/30 bg-primary/10';
      default: return '';
    }
  };

  return (
    <Card className="cyber-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          Network Tracer & Security Scanner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="traceroute" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="traceroute" className="flex items-center gap-1">
              <Route className="h-3 w-3" />
              Traceroute
            </TabsTrigger>
            <TabsTrigger value="portscan" className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              Port Scan
            </TabsTrigger>
            <TabsTrigger value="vulnerability" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Vulnerability
            </TabsTrigger>
          </TabsList>

          {/* Target Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter IP address or hostname (e.g., 8.8.8.8 or google.com)"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runTrace()}
              />
            </div>
          </div>

          <TabsContent value="traceroute" className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={runTrace} 
                disabled={tracing}
                className="flex-1"
              >
                {tracing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Tracing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Traceroute
                  </>
                )}
              </Button>
              {tracing && (
                <Button variant="outline" onClick={() => setTracing(false)}>
                  <Square className="h-4 w-4" />
                </Button>
              )}
            </div>

            {currentTrace && (
              <div className="space-y-4">
                {/* Trace Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="text-xs text-muted-foreground">Hops</div>
                    <div className="text-lg font-bold">{currentTrace.hops.length}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="text-xs text-muted-foreground">Total Latency</div>
                    <div className="text-lg font-bold">{currentTrace.totalLatency.toFixed(1)}ms</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="text-xs text-muted-foreground">Packet Loss</div>
                    <div className={cn("text-lg font-bold", currentTrace.packetLoss > 10 && "text-destructive")}>
                      {currentTrace.packetLoss}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="text-xs text-muted-foreground">Threats</div>
                    <div className={cn("text-lg font-bold", currentTrace.threats > 0 && "text-warning")}>
                      {currentTrace.threats}
                    </div>
                  </div>
                </div>

                {/* Hop List */}
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1">
                    {currentTrace.hops.map((hop) => (
                      <div 
                        key={hop.hop}
                        className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors"
                      >
                        <div className="w-8 text-center font-mono text-sm text-muted-foreground">
                          {hop.hop}
                        </div>
                        {getStatusIcon(hop.status)}
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm truncate">{hop.ip}</div>
                          <div className="text-xs text-muted-foreground truncate">{hop.hostname}</div>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            "text-sm font-mono",
                            hop.latency > 100 && "text-warning",
                            hop.latency > 200 && "text-destructive"
                          )}>
                            {hop.status === 'success' ? `${hop.latency}ms` : '*'}
                          </div>
                          <div className="text-xs text-muted-foreground">{hop.location}</div>
                        </div>
                        {hop.threats && hop.threats > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {hop.threats} threat{hop.threats > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {tracing && (
                      <div className="flex items-center justify-center p-4">
                        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="portscan" className="space-y-4">
            <Button 
              onClick={runPortScan} 
              disabled={scanning}
              className="w-full"
            >
              {scanning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Scanning Ports...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Run Port Scan
                </>
              )}
            </Button>

            {portScanResults.length > 0 && (
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {portScanResults.map((result) => (
                    <div 
                      key={result.port}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        result.status === 'open' ? 'bg-warning/5 border-warning/30' : 'bg-secondary/20 border-border/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={result.status === 'open' ? 'default' : 'outline'}
                          className={result.status === 'open' ? 'bg-warning text-warning-foreground' : ''}
                        >
                          {result.port}
                        </Badge>
                        <span className="font-medium">{result.service}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline"
                          className={cn(
                            result.status === 'open' && 'border-success/30 text-success',
                            result.status === 'closed' && 'border-muted text-muted-foreground',
                            result.status === 'filtered' && 'border-warning/30 text-warning'
                          )}
                        >
                          {result.status}
                        </Badge>
                        {result.status === 'open' && (
                          <Badge 
                            variant="outline"
                            className={cn(
                              result.risk === 'high' && 'border-destructive/30 text-destructive',
                              result.risk === 'medium' && 'border-warning/30 text-warning',
                              result.risk === 'low' && 'border-success/30 text-success'
                            )}
                          >
                            {result.risk} risk
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="vulnerability" className="space-y-4">
            <Button 
              onClick={runVulnerabilityScan} 
              disabled={vulnScanning}
              className="w-full"
            >
              {vulnScanning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Scanning for Vulnerabilities...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Run Vulnerability Scan
                </>
              )}
            </Button>

            {vulnerabilityScan && (
              <div className="space-y-4">
                {/* Security Score */}
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Security Score</span>
                    <span className={cn(
                      "text-2xl font-bold",
                      vulnerabilityScan.score >= 80 && "text-success",
                      vulnerabilityScan.score >= 50 && vulnerabilityScan.score < 80 && "text-warning",
                      vulnerabilityScan.score < 50 && "text-destructive"
                    )}>
                      {vulnerabilityScan.score}/100
                    </span>
                  </div>
                  <Progress 
                    value={vulnerabilityScan.score} 
                    className={cn(
                      "h-2",
                      vulnerabilityScan.score >= 80 && "[&>div]:bg-success",
                      vulnerabilityScan.score >= 50 && vulnerabilityScan.score < 80 && "[&>div]:bg-warning",
                      vulnerabilityScan.score < 50 && "[&>div]:bg-destructive"
                    )}
                  />
                </div>

                {/* Vulnerabilities */}
                <ScrollArea className="h-[280px]">
                  <div className="space-y-3">
                    {vulnerabilityScan.vulnerabilities.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <CheckCircle className="h-12 w-12 text-success mb-3" />
                        <p className="text-success font-medium">No vulnerabilities detected</p>
                        <p className="text-sm text-muted-foreground">Target appears to be secure</p>
                      </div>
                    ) : (
                      vulnerabilityScan.vulnerabilities.map((vuln, idx) => (
                        <div 
                          key={idx}
                          className={cn(
                            "p-4 rounded-lg border",
                            getSeverityColor(vuln.severity)
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={getSeverityColor(vuln.severity)}>
                              {vuln.severity.toUpperCase()}
                            </Badge>
                            {vuln.cve && (
                              <span className="text-xs font-mono">{vuln.cve}</span>
                            )}
                          </div>
                          <p className="text-sm mb-2">{vuln.description}</p>
                          <p className="text-xs text-muted-foreground">
                            <strong>Recommendation:</strong> {vuln.recommendation}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default NetworkTracer;

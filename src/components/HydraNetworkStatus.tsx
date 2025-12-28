import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Globe, 
  Server, 
  Zap, 
  Lock, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Activity,
  Wifi,
  HardDrive,
  Eye
} from 'lucide-react';

interface NodeStatus {
  id: string;
  region: string;
  continent: string;
  status: 'online' | 'standby' | 'syncing';
  load: number;
  connections: number;
  lastSync: Date;
}

interface ThreatMitigation {
  type: string;
  blocked: number;
  mitigated: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const HydraNetworkStatus = () => {
  const [nodes, setNodes] = useState<NodeStatus[]>([]);
  const [threats, setThreats] = useState<ThreatMitigation[]>([]);
  const [networkHealth, setNetworkHealth] = useState(100);
  const [isScanning, setIsScanning] = useState(false);

  const regions = [
    { region: 'US-East', continent: 'North America' },
    { region: 'US-West', continent: 'North America' },
    { region: 'EU-West', continent: 'Europe' },
    { region: 'EU-Central', continent: 'Europe' },
    { region: 'Asia-Pacific', continent: 'Asia' },
    { region: 'Asia-South', continent: 'Asia' },
    { region: 'South America', continent: 'South America' },
    { region: 'Africa-North', continent: 'Africa' },
    { region: 'Oceania', continent: 'Oceania' },
  ];

  const threatTypes = [
    { type: 'DDoS Layer 4 (UDP Flood)', severity: 'critical' as const },
    { type: 'DDoS Layer 4 (TCP SYN)', severity: 'high' as const },
    { type: 'Rootkit Detection', severity: 'critical' as const },
    { type: 'Brute Force Attack', severity: 'medium' as const },
    { type: 'SQL Injection Attempt', severity: 'high' as const },
    { type: 'XSS Attack Vector', severity: 'medium' as const },
  ];

  useEffect(() => {
    // Initialize nodes
    const initialNodes: NodeStatus[] = regions.map((r, i) => ({
      id: `node-${i}`,
      region: r.region,
      continent: r.continent,
      status: 'online' as const,
      load: Math.random() * 40 + 10,
      connections: Math.floor(Math.random() * 1000) + 100,
      lastSync: new Date(),
    }));
    setNodes(initialNodes);

    // Initialize threats (all mitigated)
    const initialThreats: ThreatMitigation[] = threatTypes.map(t => ({
      type: t.type,
      blocked: Math.floor(Math.random() * 10000) + 1000,
      mitigated: true,
      severity: t.severity,
    }));
    setThreats(initialThreats);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setNodes(prev => prev.map(node => ({
        ...node,
        load: Math.max(5, Math.min(95, node.load + (Math.random() - 0.5) * 10)),
        connections: Math.max(50, node.connections + Math.floor((Math.random() - 0.5) * 100)),
        lastSync: new Date(),
      })));

      setThreats(prev => prev.map(t => ({
        ...t,
        blocked: t.blocked + Math.floor(Math.random() * 50),
      })));

      setNetworkHealth(prev => Math.max(95, Math.min(100, prev + (Math.random() - 0.3) * 2)));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const onlineNodes = nodes.filter(n => n.status === 'online').length;
  const totalBlocked = threats.reduce((sum, t) => sum + t.blocked, 0);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      default: return 'text-green-400 bg-green-500/20 border-green-500/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/10 border-green-500/30">
          <CardContent className="p-4 text-center">
            <Globe className="h-8 w-8 mx-auto mb-2 text-green-400" />
            <div className="text-2xl font-bold text-green-400">{onlineNodes}/{nodes.length}</div>
            <div className="text-xs text-muted-foreground">Global Nodes Active</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-600/10 border-blue-500/30">
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-blue-400" />
            <div className="text-2xl font-bold text-blue-400">{networkHealth.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Network Health</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-violet-600/10 border-purple-500/30">
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 mx-auto mb-2 text-purple-400" />
            <div className="text-2xl font-bold text-purple-400">{totalBlocked.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Attacks Blocked</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/20 to-orange-600/10 border-amber-500/30">
          <CardContent className="p-4 text-center">
            <Lock className="h-8 w-8 mx-auto mb-2 text-amber-400" />
            <div className="text-2xl font-bold text-amber-400">100%</div>
            <div className="text-xs text-muted-foreground">Threats Mitigated</div>
          </CardContent>
        </Card>
      </div>

      {/* Hydra Network Visualization */}
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className={`h-5 w-5 text-primary ${isScanning ? 'animate-spin' : ''}`} />
            Hydra Network - Distributed Node Status
            <Badge variant="outline" className="ml-auto bg-green-500/20 text-green-400 border-green-500/50">
              RESILIENT
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {nodes.map((node) => (
              <div 
                key={node.id}
                className="p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/50 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{node.region}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={node.status === 'online' 
                      ? 'bg-green-500/20 text-green-400 border-green-500/50 text-xs' 
                      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs'
                    }
                  >
                    {node.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Load</span>
                    <span className="text-foreground">{node.load.toFixed(1)}%</span>
                  </div>
                  <Progress value={node.load} className="h-1" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Wifi className="h-3 w-3" />
                      {node.connections} conn
                    </span>
                    <span>{node.continent}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-primary font-medium">Hydra Protocol Active</span>
              <span className="text-muted-foreground">— If any node goes down, traffic automatically routes to remaining nodes. New nodes spawn to maintain redundancy.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Threat Mitigation Status */}
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Real-Time Threat Mitigation
            <Badge variant="outline" className="ml-auto bg-green-500/20 text-green-400 border-green-500/50">
              ALL THREATS NEUTRALIZED
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {threats.map((threat, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${getSeverityColor(threat.severity)}`}>
                    {threat.severity === 'critical' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Shield className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{threat.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {threat.blocked.toLocaleString()} attempts blocked
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getSeverityColor(threat.severity)}>
                    {threat.severity.toUpperCase()}
                  </Badge>
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/50 backdrop-blur border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-5 w-5 text-primary" />
              Anonymous Operation Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Zero-knowledge architecture enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>End-to-end encryption active</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>No IP logging policy enforced</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Traffic obfuscation enabled</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="h-5 w-5 text-primary" />
              Rootkit & Malware Defense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Kernel-level integrity monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Behavioral anomaly detection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Memory forensics scanning</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Auto-quarantine threats</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HydraNetworkStatus;

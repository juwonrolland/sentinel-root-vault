import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Globe,
  Server,
  Shield,
  Activity,
  Wifi,
  Database,
  Cloud,
  Lock,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Building2,
  Landmark,
  Factory,
  Hospital,
  GraduationCap,
  Plane
} from "lucide-react";

interface NetworkZone {
  id: string;
  name: string;
  type: 'corporate' | 'government' | 'infrastructure' | 'financial' | 'healthcare' | 'education' | 'defense';
  status: 'secure' | 'warning' | 'critical' | 'offline';
  devices: number;
  threats: number;
  bandwidth: number;
  latency: number;
}

interface GlobalMetrics {
  totalNodes: number;
  activeThreats: number;
  blockedAttacks: number;
  dataProcessed: string;
  uptime: number;
  regions: number;
}

const ZONE_ICONS: Record<string, React.ReactNode> = {
  corporate: <Building2 className="h-4 w-4" />,
  government: <Landmark className="h-4 w-4" />,
  infrastructure: <Factory className="h-4 w-4" />,
  financial: <Database className="h-4 w-4" />,
  healthcare: <Hospital className="h-4 w-4" />,
  education: <GraduationCap className="h-4 w-4" />,
  defense: <Shield className="h-4 w-4" />
};

const STATUS_COLORS: Record<string, string> = {
  secure: 'text-success border-success/30 bg-success/10',
  warning: 'text-warning border-warning/30 bg-warning/10',
  critical: 'text-destructive border-destructive/30 bg-destructive/10',
  offline: 'text-muted-foreground border-border bg-secondary/50'
};

export const EnterpriseNetworkMonitor = () => {
  const [zones, setZones] = useState<NetworkZone[]>([]);
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics>({
    totalNodes: 0,
    activeThreats: 0,
    blockedAttacks: 0,
    dataProcessed: '0 TB',
    uptime: 99.99,
    regions: 0
  });
  const [selectedZone, setSelectedZone] = useState<NetworkZone | null>(null);

  useEffect(() => {
    loadNetworkData();
    
    const interval = setInterval(loadNetworkData, 5000);
    
    // Subscribe to security events for real-time updates
    const channel = supabase
      .channel('network-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_events' }, () => {
        loadNetworkData();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNetworkData = async () => {
    // Get real threat data from database
    const { data: threats } = await supabase
      .from('threat_detections')
      .select('*', { count: 'exact' })
      .eq('status', 'active');

    const { data: events } = await supabase
      .from('security_events')
      .select('*', { count: 'exact' });

    const threatCount = threats?.length || 0;
    const eventCount = events?.length || 0;

    // Simulate enterprise network zones based on real data
    const simulatedZones: NetworkZone[] = [
      {
        id: 'corp-hq',
        name: 'Corporate Headquarters',
        type: 'corporate',
        status: threatCount > 3 ? 'critical' : threatCount > 0 ? 'warning' : 'secure',
        devices: 2450 + Math.floor(Math.random() * 100),
        threats: Math.floor(threatCount * 0.3),
        bandwidth: 85 + Math.floor(Math.random() * 10),
        latency: 12 + Math.floor(Math.random() * 5)
      },
      {
        id: 'gov-dc',
        name: 'Government Data Center',
        type: 'government',
        status: 'secure',
        devices: 890 + Math.floor(Math.random() * 50),
        threats: Math.floor(threatCount * 0.1),
        bandwidth: 92 + Math.floor(Math.random() * 5),
        latency: 8 + Math.floor(Math.random() * 3)
      },
      {
        id: 'fin-sector',
        name: 'Financial Services Hub',
        type: 'financial',
        status: threatCount > 5 ? 'critical' : 'secure',
        devices: 1560 + Math.floor(Math.random() * 80),
        threats: Math.floor(threatCount * 0.25),
        bandwidth: 78 + Math.floor(Math.random() * 15),
        latency: 5 + Math.floor(Math.random() * 2)
      },
      {
        id: 'health-net',
        name: 'Healthcare Network',
        type: 'healthcare',
        status: 'warning',
        devices: 3200 + Math.floor(Math.random() * 150),
        threats: Math.floor(threatCount * 0.15),
        bandwidth: 65 + Math.floor(Math.random() * 20),
        latency: 18 + Math.floor(Math.random() * 8)
      },
      {
        id: 'infra-grid',
        name: 'Critical Infrastructure',
        type: 'infrastructure',
        status: 'secure',
        devices: 780 + Math.floor(Math.random() * 40),
        threats: Math.floor(threatCount * 0.1),
        bandwidth: 45 + Math.floor(Math.random() * 10),
        latency: 25 + Math.floor(Math.random() * 10)
      },
      {
        id: 'edu-campus',
        name: 'Education Network',
        type: 'education',
        status: threatCount > 2 ? 'warning' : 'secure',
        devices: 5600 + Math.floor(Math.random() * 300),
        threats: Math.floor(threatCount * 0.1),
        bandwidth: 55 + Math.floor(Math.random() * 25),
        latency: 35 + Math.floor(Math.random() * 15)
      },
      {
        id: 'def-ops',
        name: 'Defense Operations',
        type: 'defense',
        status: 'secure',
        devices: 450 + Math.floor(Math.random() * 20),
        threats: 0,
        bandwidth: 99,
        latency: 3 + Math.floor(Math.random() * 2)
      }
    ];

    setZones(simulatedZones);
    setGlobalMetrics({
      totalNodes: simulatedZones.reduce((acc, z) => acc + z.devices, 0),
      activeThreats: threatCount,
      blockedAttacks: eventCount * 3,
      dataProcessed: `${(eventCount * 0.5).toFixed(1)} TB`,
      uptime: 99.97 + Math.random() * 0.02,
      regions: 7
    });
  };

  return (
    <Card className="cyber-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary animate-pulse" />
            Enterprise Network Monitor
          </CardTitle>
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            <Activity className="h-3 w-3 mr-1" />
            LIVE
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="zones">Network Zones</TabsTrigger>
            <TabsTrigger value="metrics">Global Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Global Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                <Server className="h-4 w-4 text-primary mb-1" />
                <p className="text-xl font-bold text-foreground">{globalMetrics.totalNodes.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Total Nodes</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/30">
                <AlertTriangle className="h-4 w-4 text-destructive mb-1" />
                <p className="text-xl font-bold text-foreground">{globalMetrics.activeThreats}</p>
                <p className="text-[10px] text-muted-foreground">Active Threats</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-success/20 to-success/5 border border-success/30">
                <Shield className="h-4 w-4 text-success mb-1" />
                <p className="text-xl font-bold text-foreground">{globalMetrics.blockedAttacks.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Attacks Blocked</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-info/20 to-info/5 border border-info/30">
                <Cloud className="h-4 w-4 text-info mb-1" />
                <p className="text-xl font-bold text-foreground">{globalMetrics.dataProcessed}</p>
                <p className="text-[10px] text-muted-foreground">Data Processed</p>
              </div>
            </div>

            {/* Zone Overview Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {zones.slice(0, 4).map((zone) => (
                <div
                  key={zone.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-105 ${STATUS_COLORS[zone.status]}`}
                  onClick={() => setSelectedZone(zone)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {ZONE_ICONS[zone.type]}
                    <span className="text-xs font-medium truncate">{zone.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{zone.devices}</span>
                    {zone.threats > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {zone.threats}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Uptime Bar */}
            <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">System Uptime</span>
                <span className="text-sm font-mono text-success">{globalMetrics.uptime.toFixed(2)}%</span>
              </div>
              <Progress value={globalMetrics.uptime} className="h-2" />
            </div>
          </TabsContent>

          <TabsContent value="zones">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:bg-secondary/30 ${STATUS_COLORS[zone.status]}`}
                    onClick={() => setSelectedZone(zone)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {ZONE_ICONS[zone.type]}
                        <div>
                          <p className="font-medium">{zone.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{zone.type} Network</p>
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[zone.status]}>
                        {zone.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Devices</p>
                        <p className="font-mono">{zone.devices.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Threats</p>
                        <p className="font-mono text-destructive">{zone.threats}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Bandwidth</p>
                        <p className="font-mono">{zone.bandwidth}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Latency</p>
                        <p className="font-mono">{zone.latency}ms</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="metrics">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="font-medium">Performance</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CPU Usage</span>
                    <span className="font-mono">34%</span>
                  </div>
                  <Progress value={34} className="h-1" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Memory</span>
                    <span className="font-mono">67%</span>
                  </div>
                  <Progress value={67} className="h-1" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Network I/O</span>
                    <span className="font-mono">82%</span>
                  </div>
                  <Progress value={82} className="h-1" />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="h-4 w-4 text-primary" />
                  <span className="font-medium">Security Status</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Firewall</span>
                    <Badge className="bg-success/10 text-success">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">IDS/IPS</span>
                    <Badge className="bg-success/10 text-success">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">SIEM</span>
                    <Badge className="bg-success/10 text-success">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Regions</span>
                    <span className="font-mono">{globalMetrics.regions}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Wifi,
  Shield,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Lock,
  Unlock,
  Server,
  Database,
  FileText,
  Image,
  Video,
  Music,
  Code,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  Eye,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface TrafficPacket {
  id: string;
  timestamp: string;
  sourceIP: string;
  destIP: string;
  protocol: string;
  port: number;
  size: number;
  encrypted: boolean;
  type: 'HTTP' | 'HTTPS' | 'DNS' | 'FTP' | 'SSH' | 'SMTP' | 'TCP' | 'UDP' | 'ICMP' | 'OTHER';
  direction: 'inbound' | 'outbound';
  threat: boolean;
  deviceId?: string;
}

interface ProtocolStats {
  name: string;
  packets: number;
  bytes: number;
  percentage: number;
  color: string;
}

interface BandwidthData {
  time: string;
  inbound: number;
  outbound: number;
}

interface DeviceBandwidth {
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  inbound: number;
  outbound: number;
  total: number;
  packets: number;
}

interface NetworkTrafficAnalyzerProps {
  className?: string;
  deviceFilter?: string;
}

const PROTOCOL_COLORS: Record<string, string> = {
  HTTPS: 'hsl(142 76% 45%)',
  HTTP: 'hsl(38 92% 50%)',
  DNS: 'hsl(185 100% 50%)',
  FTP: 'hsl(280 100% 60%)',
  SSH: 'hsl(200 100% 50%)',
  SMTP: 'hsl(340 80% 55%)',
  TCP: 'hsl(220 80% 55%)',
  UDP: 'hsl(160 70% 45%)',
  ICMP: 'hsl(30 90% 55%)',
  OTHER: 'hsl(215 20% 55%)',
};

const CONTENT_TYPES = [
  { type: 'Web', icon: Globe, color: 'text-primary' },
  { type: 'Documents', icon: FileText, color: 'text-info' },
  { type: 'Media', icon: Video, color: 'text-warning' },
  { type: 'API', icon: Code, color: 'text-accent' },
  { type: 'Database', icon: Database, color: 'text-success' },
];

export const NetworkTrafficAnalyzer = ({ className, deviceFilter }: NetworkTrafficAnalyzerProps) => {
  const [packets, setPackets] = useState<TrafficPacket[]>([]);
  const [protocolStats, setProtocolStats] = useState<ProtocolStats[]>([]);
  const [bandwidthHistory, setBandwidthHistory] = useState<BandwidthData[]>([]);
  const [deviceBandwidth, setDeviceBandwidth] = useState<DeviceBandwidth[]>([]);
  const [totalStats, setTotalStats] = useState({
    packetsPerSecond: 0,
    bytesPerSecond: 0,
    inboundMbps: 0,
    outboundMbps: 0,
    encryptedPercent: 0,
    threatsBlocked: 0,
    activeConnections: 0,
  });
  const [isLive, setIsLive] = useState(true);

  const generatePacket = useCallback((): TrafficPacket => {
    const protocols: TrafficPacket['type'][] = ['HTTPS', 'HTTP', 'DNS', 'FTP', 'SSH', 'SMTP', 'TCP', 'UDP', 'ICMP', 'OTHER'];
    const protocolWeights = [40, 15, 20, 2, 5, 3, 8, 5, 1, 1];
    
    let rand = Math.random() * 100;
    let protocolIndex = 0;
    let cumulative = 0;
    for (let i = 0; i < protocolWeights.length; i++) {
      cumulative += protocolWeights[i];
      if (rand <= cumulative) {
        protocolIndex = i;
        break;
      }
    }
    
    const protocol = protocols[protocolIndex];
    const direction = Math.random() > 0.45 ? 'inbound' : 'outbound';
    
    return {
      id: `pkt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sourceIP: direction === 'inbound' 
        ? `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`
        : `192.168.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 254) + 1}`,
      destIP: direction === 'outbound'
        ? `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`
        : `192.168.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 254) + 1}`,
      protocol: protocol,
      port: protocol === 'HTTPS' ? 443 : protocol === 'HTTP' ? 80 : protocol === 'DNS' ? 53 : 
            protocol === 'SSH' ? 22 : protocol === 'FTP' ? 21 : protocol === 'SMTP' ? 25 :
            Math.floor(Math.random() * 60000) + 1024,
      size: Math.floor(Math.random() * 15000) + 64,
      encrypted: ['HTTPS', 'SSH', 'SMTP'].includes(protocol) || Math.random() > 0.7,
      type: protocol,
      direction,
      threat: Math.random() < 0.02,
      deviceId: deviceFilter,
    };
  }, [deviceFilter]);

  const updateProtocolStats = useCallback((currentPackets: TrafficPacket[]) => {
    const stats: Record<string, { packets: number; bytes: number }> = {};
    
    currentPackets.forEach(pkt => {
      if (!stats[pkt.type]) {
        stats[pkt.type] = { packets: 0, bytes: 0 };
      }
      stats[pkt.type].packets++;
      stats[pkt.type].bytes += pkt.size;
    });

    const totalPackets = currentPackets.length || 1;
    const protocolList: ProtocolStats[] = Object.entries(stats).map(([name, data]) => ({
      name,
      packets: data.packets,
      bytes: data.bytes,
      percentage: (data.packets / totalPackets) * 100,
      color: PROTOCOL_COLORS[name] || PROTOCOL_COLORS.OTHER,
    })).sort((a, b) => b.packets - a.packets);

    setProtocolStats(protocolList);
  }, []);

  const updateBandwidthHistory = useCallback(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    setBandwidthHistory(prev => {
      const newData = [...prev, {
        time: timeStr,
        inbound: Math.random() * 500 + 100,
        outbound: Math.random() * 400 + 80,
      }];
      return newData.slice(-30);
    });
  }, []);

  const updateDeviceBandwidth = useCallback(() => {
    const devices: DeviceBandwidth[] = [
      { deviceId: '1', deviceName: 'Web Server', ipAddress: '192.168.1.10', inbound: 0, outbound: 0, total: 0, packets: 0 },
      { deviceId: '2', deviceName: 'Database Server', ipAddress: '192.168.1.20', inbound: 0, outbound: 0, total: 0, packets: 0 },
      { deviceId: '3', deviceName: 'Application Server', ipAddress: '192.168.1.30', inbound: 0, outbound: 0, total: 0, packets: 0 },
      { deviceId: '4', deviceName: 'File Server', ipAddress: '192.168.1.40', inbound: 0, outbound: 0, total: 0, packets: 0 },
      { deviceId: '5', deviceName: 'Gateway Router', ipAddress: '192.168.1.1', inbound: 0, outbound: 0, total: 0, packets: 0 },
    ].map(dev => ({
      ...dev,
      inbound: Math.random() * 200 + 50,
      outbound: Math.random() * 150 + 30,
      total: Math.random() * 350 + 80,
      packets: Math.floor(Math.random() * 5000) + 1000,
    }));

    setDeviceBandwidth(devices.sort((a, b) => b.total - a.total));
  }, []);

  useEffect(() => {
    if (!isLive) return;

    const packetInterval = setInterval(() => {
      const newPackets: TrafficPacket[] = [];
      const batchSize = Math.floor(Math.random() * 10) + 5;
      
      for (let i = 0; i < batchSize; i++) {
        newPackets.push(generatePacket());
      }
      
      setPackets(prev => {
        const updated = [...newPackets, ...prev].slice(0, 100);
        updateProtocolStats(updated);
        return updated;
      });
    }, 500);

    const bandwidthInterval = setInterval(() => {
      updateBandwidthHistory();
      updateDeviceBandwidth();
      
      setTotalStats({
        packetsPerSecond: Math.floor(Math.random() * 5000) + 2000,
        bytesPerSecond: Math.floor(Math.random() * 50000000) + 10000000,
        inboundMbps: Math.random() * 500 + 150,
        outboundMbps: Math.random() * 400 + 100,
        encryptedPercent: Math.random() * 15 + 80,
        threatsBlocked: Math.floor(Math.random() * 50),
        activeConnections: Math.floor(Math.random() * 2000) + 5000,
      });
    }, 1000);

    return () => {
      clearInterval(packetInterval);
      clearInterval(bandwidthInterval);
    };
  }, [isLive, generatePacket, updateProtocolStats, updateBandwidthHistory, updateDeviceBandwidth]);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <Card className={cn("cyber-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary animate-pulse" />
            Deep Packet Inspection
            <Badge 
              variant="outline" 
              className={cn(
                "ml-2",
                isLive ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground"
              )}
              onClick={() => setIsLive(!isLive)}
              style={{ cursor: 'pointer' }}
            >
              {isLive ? 'LIVE' : 'PAUSED'}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <ArrowDownRight className="h-3.5 w-3.5 text-success" />
              <span className="text-muted-foreground">IN:</span>
              <span className="font-mono font-bold text-success">{totalStats.inboundMbps.toFixed(1)} Mbps</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-info" />
              <span className="text-muted-foreground">OUT:</span>
              <span className="font-mono font-bold text-info">{totalStats.outboundMbps.toFixed(1)} Mbps</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="protocols">Protocols</TabsTrigger>
            <TabsTrigger value="devices">Per Device</TabsTrigger>
            <TabsTrigger value="packets">Live Packets</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                <Zap className="h-4 w-4 text-primary mb-1" />
                <p className="text-xl font-bold">{totalStats.packetsPerSecond.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Packets/sec</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-success/20 to-success/5 border border-success/30">
                <Lock className="h-4 w-4 text-success mb-1" />
                <p className="text-xl font-bold">{totalStats.encryptedPercent.toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">Encrypted</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-info/20 to-info/5 border border-info/30">
                <Network className="h-4 w-4 text-info mb-1" />
                <p className="text-xl font-bold">{totalStats.activeConnections.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Connections</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/30">
                <Shield className="h-4 w-4 text-destructive mb-1" />
                <p className="text-xl font-bold">{totalStats.threatsBlocked}</p>
                <p className="text-[10px] text-muted-foreground">Threats Blocked</p>
              </div>
            </div>

            {/* Bandwidth Chart */}
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Real-time Bandwidth Usage
              </h4>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bandwidthHistory}>
                    <defs>
                      <linearGradient id="inboundGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142 76% 45%)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(142 76% 45%)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="outboundGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(200 100% 50%)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(200 100% 50%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
                      tickFormatter={(v) => `${v} Mbps`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(222 47% 8%)', 
                        border: '1px solid hsl(222 30% 18%)',
                        borderRadius: '8px',
                        color: 'hsl(210 40% 98%)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="inbound" 
                      stroke="hsl(142 76% 45%)" 
                      fill="url(#inboundGradient)"
                      strokeWidth={2}
                      name="Inbound"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="outbound" 
                      stroke="hsl(200 100% 50%)" 
                      fill="url(#outboundGradient)"
                      strokeWidth={2}
                      name="Outbound"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="protocols" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Protocol Distribution Pie */}
              <div className="p-4 rounded-lg border border-border bg-card/50">
                <h4 className="text-sm font-medium mb-3">Protocol Distribution</h4>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={protocolStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="packets"
                        nameKey="name"
                      >
                        {protocolStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(222 47% 8%)', 
                          border: '1px solid hsl(222 30% 18%)',
                          borderRadius: '8px',
                          color: 'hsl(210 40% 98%)'
                        }}
                        formatter={(value, name) => [`${value} packets`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Protocol List */}
              <div className="p-4 rounded-lg border border-border bg-card/50">
                <h4 className="text-sm font-medium mb-3">Protocol Breakdown</h4>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    {protocolStats.map((proto) => (
                      <div key={proto.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: proto.color }}
                            />
                            <span className="font-medium">{proto.name}</span>
                            {['HTTPS', 'SSH'].includes(proto.name) && (
                              <Lock className="h-3 w-3 text-success" />
                            )}
                          </div>
                          <span className="text-muted-foreground">
                            {proto.packets.toLocaleString()} pkts ({formatBytes(proto.bytes)})
                          </span>
                        </div>
                        <Progress 
                          value={proto.percentage} 
                          className="h-1.5"
                          style={{ '--progress-color': proto.color } as any}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                Bandwidth Usage per Device
              </h4>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deviceBandwidth} layout="vertical">
                    <XAxis 
                      type="number" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
                      tickFormatter={(v) => `${v} Mbps`}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="deviceName" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
                      width={120}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(222 47% 8%)', 
                        border: '1px solid hsl(222 30% 18%)',
                        borderRadius: '8px',
                        color: 'hsl(210 40% 98%)'
                      }}
                    />
                    <Bar dataKey="inbound" fill="hsl(142 76% 45%)" name="Inbound" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="outbound" fill="hsl(200 100% 50%)" name="Outbound" stackId="a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Device List */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {deviceBandwidth.map((device) => (
                <div 
                  key={device.deviceId}
                  className="p-3 rounded-lg border border-border bg-card/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm truncate">{device.deviceName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">{device.ipAddress}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <ArrowDownRight className="h-3 w-3 text-success" />
                      <span>{device.inbound.toFixed(1)} Mbps</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3 text-info" />
                      <span>{device.outbound.toFixed(1)} Mbps</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {device.packets.toLocaleString()} packets
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="packets" className="space-y-4">
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Live Packet Stream
              </h4>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1 font-mono text-xs">
                  {packets.map((pkt) => (
                    <div 
                      key={pkt.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded border transition-all",
                        pkt.threat 
                          ? "border-destructive/50 bg-destructive/10" 
                          : "border-border/50 bg-card/30 hover:bg-secondary/30"
                      )}
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full animate-pulse",
                        pkt.direction === 'inbound' ? "bg-success" : "bg-info"
                      )} />
                      <Badge 
                        variant="outline" 
                        className="text-[10px] w-14 justify-center"
                        style={{ borderColor: PROTOCOL_COLORS[pkt.type], color: PROTOCOL_COLORS[pkt.type] }}
                      >
                        {pkt.type}
                      </Badge>
                      <span className="text-muted-foreground w-28 truncate">{pkt.sourceIP}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-muted-foreground w-28 truncate">{pkt.destIP}</span>
                      <span className="text-muted-foreground">:{pkt.port}</span>
                      <span className="text-muted-foreground ml-auto">{formatBytes(pkt.size)}</span>
                      {pkt.encrypted && <Lock className="h-3 w-3 text-success" />}
                      {pkt.threat && <AlertTriangle className="h-3 w-3 text-destructive animate-pulse" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

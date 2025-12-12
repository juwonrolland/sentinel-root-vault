import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Search,
  Network,
  Server,
  Database,
  Cloud,
  Wifi,
  Lock,
  Monitor,
  Cpu,
  Globe,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Link2,
  Eye,
  Plus,
} from "lucide-react";

interface DiscoveredDevice {
  id: string;
  ip: string;
  hostname: string;
  type: "server" | "router" | "switch" | "firewall" | "endpoint" | "database" | "cloud" | "unknown";
  status: "online" | "offline" | "warning";
  mac?: string;
  vendor?: string;
  os?: string;
  openPorts?: number[];
  services?: string[];
  latency: number;
  discoveredAt: Date;
  connections: string[];
}

interface TopologyLink {
  source: string;
  target: string;
  bandwidth: number;
  latency: number;
  status: "active" | "slow" | "down";
}

const generateMockDevices = (count: number): DiscoveredDevice[] => {
  const types: DiscoveredDevice["type"][] = ["server", "router", "switch", "firewall", "endpoint", "database", "cloud"];
  const vendors = ["Cisco", "Dell", "HP", "Juniper", "Fortinet", "VMware", "AWS", "Azure"];
  const osTypes = ["Linux", "Windows Server", "Cisco IOS", "FortiOS", "Ubuntu", "CentOS", "ESXi"];
  const services = ["HTTP", "HTTPS", "SSH", "FTP", "DNS", "SMTP", "MySQL", "PostgreSQL", "Redis", "MongoDB"];

  return Array.from({ length: count }, (_, i) => {
    const id = `device-${i + 1}`;
    const type = types[Math.floor(Math.random() * types.length)];
    const deviceConnections = Array.from(
      { length: Math.floor(Math.random() * 3) + 1 },
      () => `device-${Math.floor(Math.random() * count) + 1}`
    ).filter(c => c !== id);

    return {
      id,
      ip: `192.168.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 254) + 1}`,
      hostname: `${type}-${String(i + 1).padStart(3, "0")}.local`,
      type,
      status: Math.random() > 0.1 ? "online" : Math.random() > 0.5 ? "warning" : "offline",
      mac: Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join(":"),
      vendor: vendors[Math.floor(Math.random() * vendors.length)],
      os: osTypes[Math.floor(Math.random() * osTypes.length)],
      openPorts: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () => [22, 80, 443, 3306, 5432, 8080, 8443][Math.floor(Math.random() * 7)]),
      services: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => services[Math.floor(Math.random() * services.length)]),
      latency: Math.floor(Math.random() * 50) + 1,
      discoveredAt: new Date(Date.now() - Math.random() * 3600000),
      connections: deviceConnections,
    };
  });
};

export const NetworkAutoDiscovery = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [topologyLinks, setTopologyLinks] = useState<TopologyLink[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(null);
  const [scanPhase, setScanPhase] = useState<string>("");

  const getDeviceIcon = (type: DiscoveredDevice["type"]) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case "server": return <Server className={iconClass} />;
      case "router": return <Wifi className={iconClass} />;
      case "switch": return <Network className={iconClass} />;
      case "firewall": return <Lock className={iconClass} />;
      case "endpoint": return <Monitor className={iconClass} />;
      case "database": return <Database className={iconClass} />;
      case "cloud": return <Cloud className={iconClass} />;
      default: return <Globe className={iconClass} />;
    }
  };

  const getStatusColor = (status: DiscoveredDevice["status"]) => {
    switch (status) {
      case "online": return "text-success bg-success/10 border-success/30";
      case "warning": return "text-warning bg-warning/10 border-warning/30";
      case "offline": return "text-destructive bg-destructive/10 border-destructive/30";
    }
  };

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setScanProgress(0);
    setDiscoveredDevices([]);
    setTopologyLinks([]);
    setSelectedDevice(null);

    const phases = [
      "Initializing network scan...",
      "Discovering active hosts...",
      "Identifying device types...",
      "Scanning open ports...",
      "Detecting services...",
      "Mapping connections...",
      "Building topology...",
      "Finalizing discovery...",
    ];

    for (let i = 0; i <= 100; i += 2) {
      await new Promise(resolve => setTimeout(resolve, 80));
      setScanProgress(i);
      setScanPhase(phases[Math.floor((i / 100) * (phases.length - 1))]);

      // Progressively add discovered devices
      if (i % 15 === 0 && i > 0) {
        const newDevices = generateMockDevices(Math.floor(Math.random() * 3) + 1);
        setDiscoveredDevices(prev => [...prev, ...newDevices]);
      }
    }

    // Generate final topology links
    setDiscoveredDevices(prev => {
      const devices = prev;
      const links: TopologyLink[] = [];
      
      devices.forEach(device => {
        device.connections.forEach(targetId => {
          const target = devices.find(d => d.id === targetId);
          if (target && !links.some(l => (l.source === device.id && l.target === targetId) || (l.source === targetId && l.target === device.id))) {
            links.push({
              source: device.id,
              target: targetId,
              bandwidth: Math.floor(Math.random() * 1000) + 100,
              latency: Math.floor(Math.random() * 20) + 1,
              status: Math.random() > 0.1 ? "active" : Math.random() > 0.5 ? "slow" : "down",
            });
          }
        });
      });
      
      setTopologyLinks(links);
      return devices;
    });

    setIsScanning(false);
    setScanPhase("Scan complete");
  }, []);

  // Calculate positions for visual topology
  const getDevicePosition = (index: number, total: number, layer: number) => {
    const layerRadius = 80 + layer * 60;
    const angleOffset = (layer * Math.PI) / 6;
    const itemsInLayer = Math.min(8, total - layer * 8);
    const indexInLayer = index % 8;
    const angle = (indexInLayer / itemsInLayer) * 2 * Math.PI + angleOffset;
    
    return {
      x: 50 + (layerRadius / 2) * Math.cos(angle),
      y: 50 + (layerRadius / 2.5) * Math.sin(angle),
    };
  };

  const devicesByType = discoveredDevices.reduce((acc, device) => {
    acc[device.type] = (acc[device.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Scan Controls */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              Network Auto-Discovery
            </CardTitle>
            <Button
              onClick={startScan}
              disabled={isScanning}
              size="sm"
              className="gap-2"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Start Discovery
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isScanning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{scanPhase}</span>
                <span className="text-primary font-medium">{scanProgress}%</span>
              </div>
              <Progress value={scanProgress} className="h-2" />
            </div>
          )}

          {!isScanning && discoveredDevices.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-primary">{discoveredDevices.length}</p>
                <p className="text-xs text-muted-foreground">Devices Found</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-success">{discoveredDevices.filter(d => d.status === "online").length}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-info">{topologyLinks.length}</p>
                <p className="text-xs text-muted-foreground">Connections</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-warning">{Object.keys(devicesByType).length}</p>
                <p className="text-xs text-muted-foreground">Device Types</p>
              </div>
            </div>
          )}

          {!isScanning && discoveredDevices.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Click "Start Discovery" to scan your network</p>
              <p className="text-xs mt-1">Auto-discovers devices and maps connections</p>
            </div>
          )}
        </CardContent>
      </Card>

      {discoveredDevices.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Visual Topology Map */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Network className="w-4 h-4 text-primary" />
                Network Topology Map
                <Badge variant="outline" className="ml-auto text-xs">
                  <Activity className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-80 bg-muted/20 rounded-lg overflow-hidden cyber-grid-dense">
                {/* Connection Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--primary) / 0.3)" />
                      <stop offset="50%" stopColor="hsl(var(--primary) / 0.8)" />
                      <stop offset="100%" stopColor="hsl(var(--primary) / 0.3)" />
                    </linearGradient>
                  </defs>
                  
                  {topologyLinks.map((link, i) => {
                    const sourceIdx = discoveredDevices.findIndex(d => d.id === link.source);
                    const targetIdx = discoveredDevices.findIndex(d => d.id === link.target);
                    if (sourceIdx === -1 || targetIdx === -1) return null;

                    const sourcePos = getDevicePosition(sourceIdx, discoveredDevices.length, Math.floor(sourceIdx / 8));
                    const targetPos = getDevicePosition(targetIdx, discoveredDevices.length, Math.floor(targetIdx / 8));

                    const strokeColor = link.status === "active" 
                      ? "hsl(var(--primary) / 0.4)" 
                      : link.status === "slow" 
                        ? "hsl(var(--warning) / 0.4)" 
                        : "hsl(var(--destructive) / 0.4)";

                    return (
                      <g key={i}>
                        <line
                          x1={`${sourcePos.x}%`}
                          y1={`${sourcePos.y}%`}
                          x2={`${targetPos.x}%`}
                          y2={`${targetPos.y}%`}
                          stroke={strokeColor}
                          strokeWidth="1.5"
                          strokeDasharray={link.status === "down" ? "4 4" : "none"}
                        />
                        {link.status === "active" && (
                          <circle r="2" fill="hsl(var(--primary))">
                            <animateMotion
                              dur={`${1 + Math.random()}s`}
                              repeatCount="indefinite"
                              path={`M${sourcePos.x * 3.2},${sourcePos.y * 3.2} L${targetPos.x * 3.2},${targetPos.y * 3.2}`}
                            />
                          </circle>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Device Nodes */}
                {discoveredDevices.slice(0, 24).map((device, i) => {
                  const pos = getDevicePosition(i, Math.min(discoveredDevices.length, 24), Math.floor(i / 8));
                  const isSelected = selectedDevice?.id === device.id;

                  return (
                    <div
                      key={device.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      onClick={() => setSelectedDevice(device)}
                    >
                      <div
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-all duration-200",
                          "bg-card/90 backdrop-blur-sm hover:scale-110",
                          getStatusColor(device.status),
                          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                        )}
                      >
                        {getDeviceIcon(device.type)}
                      </div>
                      
                      {/* Quick Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                        <div className="bg-card border border-border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                          <p className="font-medium">{device.hostname}</p>
                          <p className="text-muted-foreground">{device.ip}</p>
                        </div>
                      </div>

                      {/* Status pulse */}
                      {device.status === "warning" && (
                        <div className="absolute inset-0 rounded-lg border-2 border-warning animate-ping opacity-30" />
                      )}
                    </div>
                  );
                })}

                {/* Center Hub */}
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                </div>

                {/* Legend */}
                <div className="absolute bottom-2 left-2 flex items-center gap-3 text-[9px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span>Online</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-warning" />
                    <span>Warning</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                    <span>Offline</span>
                  </div>
                </div>

                {discoveredDevices.length > 24 && (
                  <div className="absolute top-2 right-2 text-xs text-muted-foreground">
                    Showing 24 of {discoveredDevices.length} devices
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Device List & Details */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                Discovered Devices
                <Badge variant="secondary" className="ml-auto">{discoveredDevices.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-80">
                <div className="p-3 space-y-2">
                  {discoveredDevices.map((device) => (
                    <div
                      key={device.id}
                      onClick={() => setSelectedDevice(device)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        "hover:bg-muted/50",
                        selectedDevice?.id === device.id
                          ? "bg-primary/10 border-primary/50"
                          : "bg-muted/20 border-border/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center border",
                          getStatusColor(device.status)
                        )}>
                          {getDeviceIcon(device.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{device.hostname}</p>
                            <Badge variant="outline" className="text-[10px] capitalize">{device.type}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{device.ip}</span>
                            <span>•</span>
                            <span>{device.vendor}</span>
                            <span>•</span>
                            <span>{device.latency}ms</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Link2 className="w-3 h-3" />
                          <span>{device.connections.length}</span>
                        </div>
                      </div>

                      {selectedDevice?.id === device.id && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">MAC Address</p>
                              <p className="font-mono text-foreground">{device.mac}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Operating System</p>
                              <p className="text-foreground">{device.os}</p>
                            </div>
                          </div>
                          
                          {device.openPorts && device.openPorts.length > 0 && (
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Open Ports</p>
                              <div className="flex flex-wrap gap-1">
                                {[...new Set(device.openPorts)].map(port => (
                                  <Badge key={port} variant="secondary" className="text-[10px]">
                                    {port}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {device.services && device.services.length > 0 && (
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Services</p>
                              <div className="flex flex-wrap gap-1">
                                {[...new Set(device.services)].map(service => (
                                  <Badge key={service} variant="outline" className="text-[10px]">
                                    {service}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button size="sm" variant="outline" className="flex-1 text-xs h-7">
                              <Eye className="w-3 h-3 mr-1" />
                              Details
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 text-xs h-7">
                              <Plus className="w-3 h-3 mr-1" />
                              Add to Monitor
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Device Type Breakdown */}
      {discoveredDevices.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Device Type Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {Object.entries(devicesByType).map(([type, count]) => (
                <div
                  key={type}
                  className="p-3 bg-muted/30 rounded-lg text-center hover:bg-muted/50 transition-colors"
                >
                  <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {getDeviceIcon(type as DiscoveredDevice["type"])}
                  </div>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{type}s</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

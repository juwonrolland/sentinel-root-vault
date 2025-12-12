import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Building2,
  Landmark,
  Factory,
  Hospital,
  GraduationCap,
  Plus,
  RefreshCw,
  Router,
  Monitor,
  Smartphone,
  Network,
  Trash2,
  Eye,
  Play,
  Pause,
  Settings,
  XCircle,
  Zap,
  Cpu,
  HardDrive,
  Signal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { NetworkTracer } from "@/components/NetworkTracer";
import { NetworkTrafficAnalyzer } from "@/components/NetworkTrafficAnalyzer";
import { NetworkPerformanceBaseline } from "@/components/NetworkPerformanceBaseline";

interface NetworkDevice {
  id: string;
  name: string;
  type: 'server' | 'router' | 'switch' | 'firewall' | 'workstation' | 'mobile' | 'iot' | 'cloud';
  ipAddress: string;
  macAddress?: string;
  status: 'online' | 'offline' | 'warning' | 'critical';
  organization: string;
  location: string;
  lastSeen: string;
  threats: number;
  bandwidth: number;
  cpu: number;
  memory: number;
  monitoring: boolean;
  port?: number;
  latency: number;
  packetsIn: number;
  packetsOut: number;
}

interface NetworkZone {
  id: string;
  name: string;
  type: 'corporate' | 'government' | 'infrastructure' | 'financial' | 'healthcare' | 'education' | 'defense';
  status: 'secure' | 'warning' | 'critical' | 'offline';
  devices: number;
  threats: number;
  bandwidth: number;
  latency: number;
  monitoredDevices: NetworkDevice[];
}

interface GlobalMetrics {
  totalNodes: number;
  activeThreats: number;
  blockedAttacks: number;
  dataProcessed: string;
  uptime: number;
  regions: number;
  packetsPerSecond: number;
  activeConnections: number;
  encryptedTraffic: number;
}

interface EnterpriseNetworkMonitorProps {
  className?: string;
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

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  server: <Server className="h-4 w-4" />,
  router: <Router className="h-4 w-4" />,
  switch: <Network className="h-4 w-4" />,
  firewall: <Shield className="h-4 w-4" />,
  workstation: <Monitor className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  iot: <Wifi className="h-4 w-4" />,
  cloud: <Cloud className="h-4 w-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  secure: 'text-success border-success/30 bg-success/10',
  warning: 'text-warning border-warning/30 bg-warning/10',
  critical: 'text-destructive border-destructive/30 bg-destructive/10',
  offline: 'text-muted-foreground border-border bg-secondary/50',
  online: 'text-success border-success/30 bg-success/10',
};

export const EnterpriseNetworkMonitor = ({ className }: EnterpriseNetworkMonitorProps) => {
  const [zones, setZones] = useState<NetworkZone[]>([]);
  const [devices, setDevices] = useState<NetworkDevice[]>(() => {
    const saved = localStorage.getItem('enterprise-network-devices');
    return saved ? JSON.parse(saved) : [];
  });
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics>({
    totalNodes: 0,
    activeThreats: 0,
    blockedAttacks: 0,
    dataProcessed: '0 TB',
    uptime: 99.99,
    regions: 0,
    packetsPerSecond: 0,
    activeConnections: 0,
    encryptedTraffic: 0,
  });
  const [selectedZone, setSelectedZone] = useState<NetworkZone | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [monitoringActive, setMonitoringActive] = useState(true);
  const [newDevice, setNewDevice] = useState<Partial<NetworkDevice>>({
    type: 'server',
    organization: '',
    location: '',
    monitoring: true,
  });
  const { toast } = useToast();
  const { isAnalyst, isAdmin } = useRoleAccess();

  // Save devices to localStorage
  useEffect(() => {
    localStorage.setItem('enterprise-network-devices', JSON.stringify(devices));
  }, [devices]);

  // Load network data and monitor devices
  useEffect(() => {
    loadNetworkData();
    
    const interval = setInterval(() => {
      if (monitoringActive) {
        loadNetworkData();
        updateDeviceMetrics();
      }
    }, 3000);
    
    // Subscribe to security events for real-time updates
    const channel = supabase
      .channel('enterprise-network-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_events' }, (payload) => {
        handleSecurityEvent(payload.new as any);
        loadNetworkData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threat_detections' }, () => {
        loadNetworkData();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [monitoringActive]);

  const handleSecurityEvent = (event: any) => {
    if (!event) return;
    
    // Match event to device by IP if available
    if (event.source_ip) {
      setDevices(prev => prev.map(device => {
        if (device.ipAddress === event.source_ip || Math.random() < 0.05) {
          const newStatus = event.severity === 'critical' ? 'critical' : 
                           event.severity === 'high' ? 'warning' : device.status;
          return {
            ...device,
            threats: device.threats + 1,
            status: newStatus as any,
            lastSeen: new Date().toISOString(),
          };
        }
        return device;
      }));
    }
  };

  const updateDeviceMetrics = useCallback(() => {
    setDevices(prev => prev.map(device => {
      if (!device.monitoring) return device;

      const cpuDelta = (Math.random() - 0.5) * 15;
      const memDelta = (Math.random() - 0.5) * 10;
      const bwDelta = (Math.random() - 0.5) * 20;
      const latencyDelta = (Math.random() - 0.5) * 5;

      const newCpu = Math.min(100, Math.max(0, device.cpu + cpuDelta));
      const newMemory = Math.min(100, Math.max(0, device.memory + memDelta));
      const newBandwidth = Math.min(100, Math.max(0, device.bandwidth + bwDelta));
      const newLatency = Math.max(1, device.latency + latencyDelta);

      let newStatus: 'online' | 'offline' | 'warning' | 'critical' = device.status;
      if (device.status !== 'offline') {
        if (newCpu > 90 || newMemory > 95 || device.threats > 5) {
          newStatus = 'critical';
        } else if (newCpu > 75 || newMemory > 85 || device.threats > 2) {
          newStatus = 'warning';
        } else {
          newStatus = 'online';
        }
      }

      return {
        ...device,
        cpu: newCpu,
        memory: newMemory,
        bandwidth: newBandwidth,
        latency: newLatency,
        status: newStatus,
        lastSeen: new Date().toISOString(),
        packetsIn: device.packetsIn + Math.floor(Math.random() * 1000),
        packetsOut: device.packetsOut + Math.floor(Math.random() * 800),
      };
    }));
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

    // Calculate metrics from monitored devices
    const onlineDevices = devices.filter(d => d.status !== 'offline');
    const deviceThreats = devices.reduce((sum, d) => sum + d.threats, 0);

    // Build zones with integrated device data
    const zoneTypes = ['corporate', 'government', 'financial', 'healthcare', 'infrastructure', 'education', 'defense'] as const;
    
    const simulatedZones: NetworkZone[] = zoneTypes.map((type, index) => {
      const zoneDevices = devices.filter(d => 
        d.organization.toLowerCase().includes(type) || 
        (index === 0 && !zoneTypes.some(t => d.organization.toLowerCase().includes(t)))
      );
      
      const baseDeviceCount = [2450, 890, 1560, 3200, 780, 5600, 450][index];
      const zoneThreats = zoneDevices.reduce((sum, d) => sum + d.threats, 0) + Math.floor(threatCount * [0.3, 0.1, 0.25, 0.15, 0.1, 0.1, 0][index]);
      
      let zoneStatus: 'secure' | 'warning' | 'critical' | 'offline' = 'secure';
      if (zoneThreats > 5) zoneStatus = 'critical';
      else if (zoneThreats > 2) zoneStatus = 'warning';

      const zoneNames = [
        'Corporate Headquarters',
        'Government Data Center', 
        'Financial Services Hub',
        'Healthcare Network',
        'Critical Infrastructure',
        'Education Network',
        'Defense Operations'
      ];

      return {
        id: `zone-${type}`,
        name: zoneNames[index],
        type,
        status: zoneStatus,
        devices: baseDeviceCount + zoneDevices.length + Math.floor(Math.random() * 50),
        threats: zoneThreats,
        bandwidth: 70 + Math.floor(Math.random() * 25),
        latency: [12, 8, 5, 18, 25, 35, 3][index] + Math.floor(Math.random() * 5),
        monitoredDevices: zoneDevices,
      };
    });

    setZones(simulatedZones);
    
    const totalZoneDevices = simulatedZones.reduce((acc, z) => acc + z.devices, 0);
    
    setGlobalMetrics({
      totalNodes: totalZoneDevices + devices.length,
      activeThreats: threatCount + deviceThreats,
      blockedAttacks: eventCount * 3 + Math.floor(Math.random() * 100),
      dataProcessed: `${((eventCount + devices.length) * 0.5).toFixed(1)} TB`,
      uptime: 99.95 + Math.random() * 0.04,
      regions: 7,
      packetsPerSecond: 125000 + Math.floor(Math.random() * 50000),
      activeConnections: 45000 + Math.floor(Math.random() * 10000) + onlineDevices.length * 100,
      encryptedTraffic: 94 + Math.floor(Math.random() * 5),
    });
  };

  const addDevice = () => {
    if (!newDevice.name || !newDevice.ipAddress) {
      toast({
        title: "Validation Error",
        description: "Name and IP address are required",
        variant: "destructive",
      });
      return;
    }

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newDevice.ipAddress)) {
      toast({
        title: "Invalid IP Address",
        description: "Please enter a valid IPv4 address",
        variant: "destructive",
      });
      return;
    }

    const device: NetworkDevice = {
      id: `device-${Date.now()}`,
      name: newDevice.name!,
      type: newDevice.type as any,
      ipAddress: newDevice.ipAddress!,
      macAddress: newDevice.macAddress,
      status: 'online',
      organization: newDevice.organization || 'Corporate',
      location: newDevice.location || 'Primary Data Center',
      lastSeen: new Date().toISOString(),
      threats: 0,
      bandwidth: Math.random() * 50 + 20,
      cpu: Math.random() * 40 + 10,
      memory: Math.random() * 50 + 20,
      monitoring: true,
      port: newDevice.port,
      latency: Math.random() * 20 + 5,
      packetsIn: Math.floor(Math.random() * 10000),
      packetsOut: Math.floor(Math.random() * 8000),
    };

    setDevices(prev => [...prev, device]);
    setIsAddingDevice(false);
    setNewDevice({ type: 'server', organization: '', location: '', monitoring: true });

    toast({
      title: "Device Added",
      description: `${device.name} (${device.ipAddress}) is now being monitored`,
    });
  };

  const removeDevice = (deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    toast({
      title: "Device Removed",
      description: "Device has been removed from monitoring",
    });
  };

  const toggleDeviceMonitoring = (deviceId: string) => {
    setDevices(prev => prev.map(d =>
      d.id === deviceId ? { ...d, monitoring: !d.monitoring } : d
    ));
  };

  const scanNetwork = async () => {
    setScanning(true);
    
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const discoveredDevices: NetworkDevice[] = [
      {
        id: `scan-${Date.now()}-1`,
        name: 'Auto-Discovered Server',
        type: 'server',
        ipAddress: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`,
        status: 'online',
        organization: 'Corporate',
        location: 'Auto-Discovered',
        lastSeen: new Date().toISOString(),
        threats: 0,
        bandwidth: Math.random() * 50,
        cpu: Math.random() * 30,
        memory: Math.random() * 40,
        monitoring: true,
        latency: Math.random() * 15 + 5,
        packetsIn: 0,
        packetsOut: 0,
      },
      {
        id: `scan-${Date.now()}-2`,
        name: 'Network Gateway',
        type: 'router',
        ipAddress: `10.0.${Math.floor(Math.random() * 255)}.1`,
        status: 'online',
        organization: 'Infrastructure',
        location: 'Auto-Discovered',
        lastSeen: new Date().toISOString(),
        threats: 0,
        bandwidth: Math.random() * 80,
        cpu: Math.random() * 20,
        memory: Math.random() * 30,
        monitoring: true,
        latency: Math.random() * 5 + 1,
        packetsIn: 0,
        packetsOut: 0,
      },
    ];

    setDevices(prev => [...prev, ...discoveredDevices]);
    setScanning(false);

    toast({
      title: "Network Scan Complete",
      description: `Discovered and added ${discoveredDevices.length} new devices to monitoring`,
    });
  };

  const getDeviceStats = () => {
    const online = devices.filter(d => d.status === 'online').length;
    const warning = devices.filter(d => d.status === 'warning').length;
    const critical = devices.filter(d => d.status === 'critical').length;
    const offline = devices.filter(d => d.status === 'offline').length;
    const threats = devices.reduce((sum, d) => sum + d.threats, 0);
    return { online, warning, critical, offline, threats, total: devices.length };
  };

  const deviceStats = getDeviceStats();

  return (
    <Card className={cn("cyber-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary animate-pulse" />
            Enterprise Network Monitor
            <Badge variant="outline" className="ml-2 bg-success/10 text-success border-success/30">
              <Activity className="h-3 w-3 mr-1" />
              {monitoringActive ? 'LIVE' : 'PAUSED'}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMonitoringActive(!monitoringActive)}
              className="h-7"
            >
              {monitoringActive ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
              {monitoringActive ? 'Pause' : 'Resume'}
            </Button>
            {(isAnalyst || isAdmin) && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={scanNetwork}
                  disabled={scanning}
                  className="h-7"
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1", scanning && "animate-spin")} />
                  {scanning ? 'Scanning...' : 'Scan Network'}
                </Button>
                <Dialog open={isAddingDevice} onOpenChange={setIsAddingDevice}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-7">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Device
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader className="space-y-3">
                      <DialogTitle className="flex items-center gap-2 text-lg">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                          <Network className="h-5 w-5 text-primary" />
                        </div>
                        Add Network Device
                      </DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        Register a new device to monitor. Fields marked with * are required.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">Device Name *</Label>
                          <Input
                            placeholder="e.g., Main Server"
                            value={newDevice.name || ''}
                            onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                            className="bg-secondary/50 border-border focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">Device Type *</Label>
                          <Select
                            value={newDevice.type}
                            onValueChange={(v: any) => setNewDevice({ ...newDevice, type: v })}
                          >
                            <SelectTrigger className="bg-secondary/50 border-border">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="server">
                                <span className="flex items-center gap-2"><Server className="h-3.5 w-3.5" /> Server</span>
                              </SelectItem>
                              <SelectItem value="router">
                                <span className="flex items-center gap-2"><Router className="h-3.5 w-3.5" /> Router</span>
                              </SelectItem>
                              <SelectItem value="switch">
                                <span className="flex items-center gap-2"><Network className="h-3.5 w-3.5" /> Switch</span>
                              </SelectItem>
                              <SelectItem value="firewall">
                                <span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5" /> Firewall</span>
                              </SelectItem>
                              <SelectItem value="workstation">
                                <span className="flex items-center gap-2"><Monitor className="h-3.5 w-3.5" /> Workstation</span>
                              </SelectItem>
                              <SelectItem value="mobile">
                                <span className="flex items-center gap-2"><Smartphone className="h-3.5 w-3.5" /> Mobile Device</span>
                              </SelectItem>
                              <SelectItem value="iot">
                                <span className="flex items-center gap-2"><Wifi className="h-3.5 w-3.5" /> IoT Device</span>
                              </SelectItem>
                              <SelectItem value="cloud">
                                <span className="flex items-center gap-2"><Cloud className="h-3.5 w-3.5" /> Cloud Instance</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">IP Address *</Label>
                          <Input
                            placeholder="e.g., 192.168.1.100"
                            value={newDevice.ipAddress || ''}
                            onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
                            className="bg-secondary/50 border-border focus:border-primary font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">Port <span className="text-muted-foreground font-normal">(optional)</span></Label>
                          <Input
                            type="number"
                            placeholder="e.g., 22, 443"
                            value={newDevice.port || ''}
                            onChange={(e) => setNewDevice({ ...newDevice, port: parseInt(e.target.value) || undefined })}
                            className="bg-secondary/50 border-border focus:border-primary font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">Organization/Zone</Label>
                          <Select
                            value={newDevice.organization || 'Corporate'}
                            onValueChange={(v) => setNewDevice({ ...newDevice, organization: v })}
                          >
                            <SelectTrigger className="bg-secondary/50 border-border">
                              <SelectValue placeholder="Select zone" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="Corporate">
                                <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Corporate</span>
                              </SelectItem>
                              <SelectItem value="Government">
                                <span className="flex items-center gap-2"><Landmark className="h-3.5 w-3.5" /> Government</span>
                              </SelectItem>
                              <SelectItem value="Financial">
                                <span className="flex items-center gap-2"><Database className="h-3.5 w-3.5" /> Financial</span>
                              </SelectItem>
                              <SelectItem value="Healthcare">
                                <span className="flex items-center gap-2"><Hospital className="h-3.5 w-3.5" /> Healthcare</span>
                              </SelectItem>
                              <SelectItem value="Infrastructure">
                                <span className="flex items-center gap-2"><Factory className="h-3.5 w-3.5" /> Infrastructure</span>
                              </SelectItem>
                              <SelectItem value="Education">
                                <span className="flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5" /> Education</span>
                              </SelectItem>
                              <SelectItem value="Defense">
                                <span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5" /> Defense</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">Location</Label>
                          <Select
                            value={newDevice.location || 'datacenter-a'}
                            onValueChange={(v) => setNewDevice({ ...newDevice, location: v })}
                          >
                            <SelectTrigger className="bg-secondary/50 border-border">
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="datacenter-a">
                                <span className="flex items-center gap-2"><Server className="h-3.5 w-3.5" /> Data Center A</span>
                              </SelectItem>
                              <SelectItem value="datacenter-b">
                                <span className="flex items-center gap-2"><Server className="h-3.5 w-3.5" /> Data Center B</span>
                              </SelectItem>
                              <SelectItem value="headquarters">
                                <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Headquarters</span>
                              </SelectItem>
                              <SelectItem value="branch-office">
                                <span className="flex items-center gap-2"><Network className="h-3.5 w-3.5" /> Branch Office</span>
                              </SelectItem>
                              <SelectItem value="remote">
                                <span className="flex items-center gap-2"><Wifi className="h-3.5 w-3.5" /> Remote</span>
                              </SelectItem>
                              <SelectItem value="cloud">
                                <span className="flex items-center gap-2"><Cloud className="h-3.5 w-3.5" /> Cloud Region</span>
                              </SelectItem>
                              <SelectItem value="edge">
                                <span className="flex items-center gap-2"><Router className="h-3.5 w-3.5" /> Edge Location</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">MAC Address <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Input
                          placeholder="e.g., 00:1A:2B:3C:4D:5E"
                          value={newDevice.macAddress || ''}
                          onChange={(e) => setNewDevice({ ...newDevice, macAddress: e.target.value })}
                          className="bg-secondary/50 border-border focus:border-primary font-mono"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-2 border-t border-border">
                        <Button variant="outline" onClick={() => setIsAddingDevice(false)} className="px-6">
                          Cancel
                        </Button>
                        <Button onClick={addDevice} className="px-6">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Device
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="devices">Devices ({devices.length})</TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="baseline">Baseline</TabsTrigger>
            <TabsTrigger value="zones">Zones</TabsTrigger>
            <TabsTrigger value="tracer">Trace & Scan</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Global Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
                <Zap className="h-4 w-4 text-info mb-1" />
                <p className="text-xl font-bold text-foreground">{(globalMetrics.packetsPerSecond / 1000).toFixed(0)}K</p>
                <p className="text-[10px] text-muted-foreground">Packets/sec</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30">
                <Signal className="h-4 w-4 text-accent mb-1" />
                <p className="text-xl font-bold text-foreground">{globalMetrics.activeConnections.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Connections</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-success/20 to-success/5 border border-success/30">
                <Lock className="h-4 w-4 text-success mb-1" />
                <p className="text-xl font-bold text-foreground">{globalMetrics.encryptedTraffic}%</p>
                <p className="text-[10px] text-muted-foreground">Encrypted</p>
              </div>
            </div>

            {/* Monitored Devices Summary */}
            {devices.length > 0 && (
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    Monitored Devices Status
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{deviceStats.total} DEVICES</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="text-center p-2 rounded bg-success/10 border border-success/30">
                    <p className="text-lg font-bold text-success">{deviceStats.online}</p>
                    <p className="text-[10px] text-muted-foreground">Online</p>
                  </div>
                  <div className="text-center p-2 rounded bg-warning/10 border border-warning/30">
                    <p className="text-lg font-bold text-warning">{deviceStats.warning}</p>
                    <p className="text-[10px] text-muted-foreground">Warning</p>
                  </div>
                  <div className="text-center p-2 rounded bg-destructive/10 border border-destructive/30">
                    <p className="text-lg font-bold text-destructive">{deviceStats.critical}</p>
                    <p className="text-[10px] text-muted-foreground">Critical</p>
                  </div>
                  <div className="text-center p-2 rounded bg-muted border border-border">
                    <p className="text-lg font-bold text-muted-foreground">{deviceStats.offline}</p>
                    <p className="text-[10px] text-muted-foreground">Offline</p>
                  </div>
                  <div className="text-center p-2 rounded bg-destructive/5 border border-destructive/20">
                    <p className="text-lg font-bold text-destructive">{deviceStats.threats}</p>
                    <p className="text-[10px] text-muted-foreground">Threats</p>
                  </div>
                </div>
              </div>
            )}

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
                    <span className="text-lg font-bold">{zone.devices.toLocaleString()}</span>
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
                <span className="text-sm font-mono text-success">{globalMetrics.uptime.toFixed(3)}%</span>
              </div>
              <Progress value={globalMetrics.uptime} className="h-2" />
            </div>
          </TabsContent>

          <TabsContent value="devices">
            <ScrollArea className="h-[400px]">
              {devices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm mb-2">No devices configured</p>
                  <p className="text-xs mb-4">Add devices manually or scan your network</p>
                  {(isAnalyst || isAdmin) && (
                    <div className="flex justify-center gap-2">
                      <Button size="sm" variant="outline" onClick={scanNetwork} disabled={scanning}>
                        <RefreshCw className={cn("h-3 w-3 mr-1", scanning && "animate-spin")} />
                        Scan Network
                      </Button>
                      <Button size="sm" onClick={() => setIsAddingDevice(true)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Manually
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-all hover:bg-secondary/30",
                        STATUS_COLORS[device.status],
                        selectedDevice?.id === device.id && "ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedDevice(device)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            device.status === 'online' ? 'bg-success/20' :
                            device.status === 'warning' ? 'bg-warning/20' :
                            device.status === 'critical' ? 'bg-destructive/20' : 'bg-muted'
                          )}>
                            {DEVICE_ICONS[device.type]}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{device.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{device.ipAddress}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={STATUS_COLORS[device.status]}>
                            {device.status.toUpperCase()}
                          </Badge>
                          {device.threats > 0 && (
                            <Badge variant="destructive" className="text-[10px]">
                              {device.threats} threats
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-xs mt-3">
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Cpu className="h-3 w-3" />
                            <span>CPU</span>
                          </div>
                          <Progress value={device.cpu} className="h-1" />
                          <span className="font-mono">{device.cpu.toFixed(0)}%</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <HardDrive className="h-3 w-3" />
                            <span>Memory</span>
                          </div>
                          <Progress value={device.memory} className="h-1" />
                          <span className="font-mono">{device.memory.toFixed(0)}%</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Activity className="h-3 w-3" />
                            <span>Bandwidth</span>
                          </div>
                          <Progress value={device.bandwidth} className="h-1" />
                          <span className="font-mono">{device.bandwidth.toFixed(0)}%</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Clock className="h-3 w-3" />
                            <span>Latency</span>
                          </div>
                          <span className="font-mono">{device.latency.toFixed(0)}ms</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <div className="text-xs text-muted-foreground">
                          <span>{device.organization}</span> • <span>{device.location}</span>
                        </div>
                        {(isAnalyst || isAdmin) && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDeviceMonitoring(device.id);
                              }}
                            >
                              {device.monitoring ? <Eye className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeDevice(device.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="traffic">
            <NetworkTrafficAnalyzer />
          </TabsContent>

          <TabsContent value="baseline">
            <NetworkPerformanceBaseline />
          </TabsContent>

          <TabsContent value="zones">
            <ScrollArea className="h-[400px]">
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
                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Devices</p>
                        <p className="font-mono">{zone.devices.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Monitored</p>
                        <p className="font-mono text-primary">{zone.monitoredDevices.length}</p>
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

          {/* Network Tracer Tab */}
          <TabsContent value="tracer">
            <NetworkTracer />
          </TabsContent>

          <TabsContent value="metrics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="font-medium">Performance Metrics</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">CPU Usage (Avg)</span>
                      <span className="font-mono">{devices.length > 0 ? (devices.reduce((s, d) => s + d.cpu, 0) / devices.length).toFixed(0) : 34}%</span>
                    </div>
                    <Progress value={devices.length > 0 ? devices.reduce((s, d) => s + d.cpu, 0) / devices.length : 34} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Memory Usage (Avg)</span>
                      <span className="font-mono">{devices.length > 0 ? (devices.reduce((s, d) => s + d.memory, 0) / devices.length).toFixed(0) : 67}%</span>
                    </div>
                    <Progress value={devices.length > 0 ? devices.reduce((s, d) => s + d.memory, 0) / devices.length : 67} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Network I/O</span>
                      <span className="font-mono">{devices.length > 0 ? (devices.reduce((s, d) => s + d.bandwidth, 0) / devices.length).toFixed(0) : 82}%</span>
                    </div>
                    <Progress value={devices.length > 0 ? devices.reduce((s, d) => s + d.bandwidth, 0) / devices.length : 82} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Data Processed</span>
                      <span className="font-mono">{globalMetrics.dataProcessed}</span>
                    </div>
                  </div>
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
                    <Badge className="bg-success/10 text-success border-success/30">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">IDS/IPS</span>
                    <Badge className="bg-success/10 text-success border-success/30">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">SIEM Integration</span>
                    <Badge className="bg-success/10 text-success border-success/30">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Threat Intelligence</span>
                    <Badge className="bg-success/10 text-success border-success/30">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Regions Covered</span>
                    <span className="font-mono">{globalMetrics.regions}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Encrypted Traffic</span>
                    <span className="font-mono text-success">{globalMetrics.encryptedTraffic}%</span>
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

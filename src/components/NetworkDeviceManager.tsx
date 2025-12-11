import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Server,
  Router,
  Laptop,
  Smartphone,
  Wifi,
  HardDrive,
  Shield,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Globe,
  Network,
  Monitor,
  Database,
  Cloud,
  Lock,
  Unlock,
  Eye,
  Play,
  Pause,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
}

interface DeviceStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  threatsDetected: number;
  bandwidthUsage: number;
}

interface NetworkDeviceManagerProps {
  className?: string;
  onDeviceSelect?: (device: NetworkDevice) => void;
}

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

const STATUS_STYLES: Record<string, string> = {
  online: 'bg-success/10 text-success border-success/30',
  offline: 'bg-muted text-muted-foreground border-border',
  warning: 'bg-warning/10 text-warning border-warning/30',
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
};

export const NetworkDeviceManager = ({ className, onDeviceSelect }: NetworkDeviceManagerProps) => {
  const [devices, setDevices] = useState<NetworkDevice[]>(() => {
    const saved = localStorage.getItem('network-devices');
    return saved ? JSON.parse(saved) : [];
  });
  const [stats, setStats] = useState<DeviceStats>({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    threatsDetected: 0,
    bandwidthUsage: 0,
  });
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [newDevice, setNewDevice] = useState<Partial<NetworkDevice>>({
    type: 'server',
    organization: '',
    location: '',
    monitoring: true,
  });
  const [scanning, setScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem('network-devices', JSON.stringify(devices));
    updateStats();
  }, [devices]);

  useEffect(() => {
    // Simulate real-time monitoring updates
    const interval = setInterval(() => {
      updateDeviceMetrics();
    }, 5000);

    // Subscribe to security events for threat detection
    const channel = supabase
      .channel('device-monitor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_events' }, (payload) => {
        handleSecurityEvent(payload.new as any);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [devices]);

  const updateStats = () => {
    const online = devices.filter(d => d.status === 'online').length;
    const offline = devices.filter(d => d.status === 'offline').length;
    const threats = devices.reduce((sum, d) => sum + d.threats, 0);
    const avgBandwidth = devices.length > 0
      ? devices.reduce((sum, d) => sum + d.bandwidth, 0) / devices.length
      : 0;

    setStats({
      totalDevices: devices.length,
      onlineDevices: online,
      offlineDevices: offline,
      threatsDetected: threats,
      bandwidthUsage: Math.round(avgBandwidth),
    });
  };

  const updateDeviceMetrics = () => {
    setDevices(prev => prev.map(device => {
      if (!device.monitoring) return device;

      // Simulate metric changes
      return {
        ...device,
        cpu: Math.min(100, Math.max(0, device.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.min(100, Math.max(0, device.memory + (Math.random() - 0.5) * 5)),
        bandwidth: Math.min(100, Math.max(0, device.bandwidth + (Math.random() - 0.5) * 15)),
        status: device.cpu > 90 || device.memory > 95 ? 'critical' 
          : device.cpu > 70 || device.memory > 80 ? 'warning'
          : device.status === 'offline' ? 'offline' : 'online',
        lastSeen: new Date().toISOString(),
      };
    }));
  };

  const handleSecurityEvent = (event: any) => {
    // Match event to device by IP if available
    if (event.source_ip) {
      setDevices(prev => prev.map(device => {
        if (device.ipAddress === event.source_ip || Math.random() < 0.1) {
          return {
            ...device,
            threats: device.threats + 1,
            status: event.severity === 'critical' ? 'critical' : 
                   event.severity === 'high' ? 'warning' : device.status,
          };
        }
        return device;
      }));
    }
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

    // Validate IP address
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
      organization: newDevice.organization || 'Default',
      location: newDevice.location || 'Unknown',
      lastSeen: new Date().toISOString(),
      threats: 0,
      bandwidth: Math.random() * 50 + 10,
      cpu: Math.random() * 40 + 10,
      memory: Math.random() * 50 + 20,
      monitoring: newDevice.monitoring ?? true,
      port: newDevice.port,
    };

    setDevices(prev => [...prev, device]);
    setIsAddingDevice(false);
    setNewDevice({ type: 'server', organization: '', location: '', monitoring: true });

    toast({
      title: "Device Added",
      description: `${device.name} is now being monitored`,
    });
  };

  const removeDevice = (deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    toast({
      title: "Device Removed",
      description: "Device has been removed from monitoring",
    });
  };

  const toggleMonitoring = (deviceId: string) => {
    setDevices(prev => prev.map(d =>
      d.id === deviceId ? { ...d, monitoring: !d.monitoring } : d
    ));
  };

  const scanNetwork = async () => {
    setScanning(true);
    
    // Simulate network scan
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Add some discovered devices
    const discoveredDevices: NetworkDevice[] = [
      {
        id: `scan-${Date.now()}-1`,
        name: 'Discovered Server',
        type: 'server',
        ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        status: 'online',
        organization: 'Auto-discovered',
        location: 'Local Network',
        lastSeen: new Date().toISOString(),
        threats: 0,
        bandwidth: Math.random() * 50,
        cpu: Math.random() * 30,
        memory: Math.random() * 40,
        monitoring: true,
      },
      {
        id: `scan-${Date.now()}-2`,
        name: 'Network Switch',
        type: 'switch',
        ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        status: 'online',
        organization: 'Auto-discovered',
        location: 'Local Network',
        lastSeen: new Date().toISOString(),
        threats: 0,
        bandwidth: Math.random() * 80,
        cpu: Math.random() * 20,
        memory: Math.random() * 30,
        monitoring: true,
      },
    ];

    setDevices(prev => [...prev, ...discoveredDevices]);
    setScanning(false);

    toast({
      title: "Scan Complete",
      description: `Discovered ${discoveredDevices.length} new devices`,
    });
  };

  return (
    <Card className={cn("cyber-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Network className="h-4 w-4 text-primary animate-pulse" />
            Network Device Manager
          </CardTitle>
          <div className="flex items-center gap-2">
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
                      <Label className="text-sm font-medium text-foreground">Organization</Label>
                      <Input
                        placeholder="e.g., IT Department"
                        value={newDevice.organization || ''}
                        onChange={(e) => setNewDevice({ ...newDevice, organization: e.target.value })}
                        className="bg-secondary/50 border-border focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Location</Label>
                      <Input
                        placeholder="e.g., Data Center A"
                        value={newDevice.location || ''}
                        onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                        className="bg-secondary/50 border-border focus:border-primary"
                      />
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
            <Globe className="h-4 w-4 text-primary mb-1" />
            <p className="text-lg font-bold">{stats.totalDevices}</p>
            <p className="text-[10px] text-muted-foreground">Total Devices</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-success/20 to-success/5 border border-success/30">
            <CheckCircle className="h-4 w-4 text-success mb-1" />
            <p className="text-lg font-bold">{stats.onlineDevices}</p>
            <p className="text-[10px] text-muted-foreground">Online</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-muted to-muted/5 border border-border">
            <XCircle className="h-4 w-4 text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{stats.offlineDevices}</p>
            <p className="text-[10px] text-muted-foreground">Offline</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/30">
            <AlertTriangle className="h-4 w-4 text-destructive mb-1" />
            <p className="text-lg font-bold">{stats.threatsDetected}</p>
            <p className="text-[10px] text-muted-foreground">Threats</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-info/20 to-info/5 border border-info/30">
            <Activity className="h-4 w-4 text-info mb-1" />
            <p className="text-lg font-bold">{stats.bandwidthUsage}%</p>
            <p className="text-[10px] text-muted-foreground">Bandwidth</p>
          </div>
        </div>

        {/* Device List */}
        <ScrollArea className="h-[400px]">
          {devices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm mb-2">No devices configured</p>
              <p className="text-xs">Add devices manually or scan your network</p>
            </div>
          ) : (
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  onClick={() => {
                    setSelectedDevice(device);
                    onDeviceSelect?.(device);
                  }}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all hover:bg-secondary/30",
                    selectedDevice?.id === device.id && "border-primary bg-primary/5",
                    STATUS_STYLES[device.status]
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        device.status === 'online' && "bg-success/20",
                        device.status === 'offline' && "bg-muted",
                        device.status === 'warning' && "bg-warning/20",
                        device.status === 'critical' && "bg-destructive/20"
                      )}>
                        {DEVICE_ICONS[device.type]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{device.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{device.ipAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={STATUS_STYLES[device.status]}>
                        {device.status.toUpperCase()}
                      </Badge>
                      {device.threats > 0 && (
                        <Badge variant="destructive" className="text-[10px]">
                          {device.threats} threats
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMonitoring(device.id);
                        }}
                      >
                        {device.monitoring ? (
                          <Eye className="h-3 w-3 text-primary" />
                        ) : (
                          <Pause className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDevice(device.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {device.monitoring && (
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">CPU</p>
                        <Progress value={device.cpu} className="h-1" />
                        <p className="text-[10px] font-mono mt-1">{device.cpu.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Memory</p>
                        <Progress value={device.memory} className="h-1" />
                        <p className="text-[10px] font-mono mt-1">{device.memory.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Bandwidth</p>
                        <Progress value={device.bandwidth} className="h-1" />
                        <p className="text-[10px] font-mono mt-1">{device.bandwidth.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Organization</p>
                        <p className="text-[10px] font-mono truncate">{device.organization}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{device.location}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

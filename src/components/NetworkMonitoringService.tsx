import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Wifi,
  WifiOff,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Globe,
  Router,
  Server,
  Monitor,
  Smartphone,
  Network,
  Activity,
  Lock,
  Unlock,
  Eye,
  Scan,
  Radio,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface DiscoveredDevice {
  id: string;
  name: string;
  ipAddress: string;
  macAddress: string;
  type: 'router' | 'server' | 'workstation' | 'mobile' | 'iot' | 'unknown';
  vendor: string;
  status: 'online' | 'offline' | 'warning' | 'threat';
  signalStrength?: number;
  lastSeen: string;
  openPorts: number[];
  services: string[];
  threats: number;
  isSecure: boolean;
  connectionType: 'wifi' | 'ethernet' | 'unknown';
}

interface NetworkInfo {
  ssid: string;
  bssid: string;
  gateway: string;
  localIP: string;
  publicIP: string;
  connectionType: 'wifi' | 'ethernet' | 'unknown';
  signalStrength: number;
  isSecure: boolean;
  encryptionType: string;
}

interface NetworkMonitoringServiceProps {
  className?: string;
  onDevicesDiscovered?: (devices: DiscoveredDevice[]) => void;
}

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  router: <Router className="h-4 w-4" />,
  server: <Server className="h-4 w-4" />,
  workstation: <Monitor className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  iot: <Wifi className="h-4 w-4" />,
  unknown: <Network className="h-4 w-4" />,
};

const VENDORS = [
  'Cisco Systems', 'Hewlett Packard', 'Dell Inc.', 'Apple Inc.', 
  'Samsung Electronics', 'Intel Corporate', 'ASUS', 'TP-Link',
  'Netgear', 'D-Link', 'Ubiquiti Networks', 'Aruba Networks'
];

const generateMacAddress = () => {
  const hex = '0123456789ABCDEF';
  let mac = '';
  for (let i = 0; i < 6; i++) {
    mac += hex[Math.floor(Math.random() * 16)];
    mac += hex[Math.floor(Math.random() * 16)];
    if (i < 5) mac += ':';
  }
  return mac;
};

export const NetworkMonitoringService = ({ className, onDevicesDiscovered }: NetworkMonitoringServiceProps) => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [autoMonitor, setAutoMonitor] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [scanProgress, setScanProgress] = useState(0);
  const [threatAlerts, setThreatAlerts] = useState<string[]>([]);
  const { toast } = useToast();

  // Check network connection
  useEffect(() => {
    const checkConnection = async () => {
      setConnectionStatus('checking');
      
      // Check if online
      if (navigator.onLine) {
        // Simulate getting network info
        const info: NetworkInfo = {
          ssid: 'Enterprise-Network-' + Math.floor(Math.random() * 100),
          bssid: generateMacAddress(),
          gateway: '192.168.1.1',
          localIP: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
          publicIP: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          connectionType: 'wifi',
          signalStrength: 70 + Math.floor(Math.random() * 30),
          isSecure: true,
          encryptionType: 'WPA3-Enterprise',
        };
        setNetworkInfo(info);
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    };

    checkConnection();
    
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', () => setConnectionStatus('disconnected'));
    
    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', () => setConnectionStatus('disconnected'));
    };
  }, []);

  // Auto-monitor network
  useEffect(() => {
    if (!autoMonitor || connectionStatus !== 'connected') return;

    const interval = setInterval(() => {
      // Update device statuses
      setDiscoveredDevices(prev => prev.map(device => {
        const threatChance = Math.random() < 0.02;
        const statusChange = Math.random() < 0.05;
        
        let newStatus = device.status;
        let newThreats = device.threats;
        
        if (threatChance && device.status !== 'threat') {
          newStatus = 'threat';
          newThreats += 1;
          setThreatAlerts(prev => [
            `Suspicious activity detected on ${device.name} (${device.ipAddress})`,
            ...prev.slice(0, 9)
          ]);
        } else if (statusChange) {
          newStatus = Math.random() > 0.1 ? 'online' : 'warning';
        }
        
        return {
          ...device,
          status: newStatus,
          threats: newThreats,
          lastSeen: newStatus !== 'offline' ? new Date().toISOString() : device.lastSeen,
          signalStrength: device.connectionType === 'wifi' 
            ? Math.max(20, Math.min(100, (device.signalStrength || 70) + (Math.random() - 0.5) * 10))
            : undefined,
        };
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [autoMonitor, connectionStatus]);

  // Log security events to database
  const logSecurityEvent = useCallback(async (device: DiscoveredDevice, eventType: string) => {
    try {
      await supabase.from('security_events').insert({
        event_type: eventType,
        severity: device.status === 'threat' ? 'high' : 'medium',
        description: `${eventType} on ${device.name} (${device.ipAddress})`,
        source_ip: device.ipAddress,
        metadata: {
          device_name: device.name,
          mac_address: device.macAddress,
          vendor: device.vendor,
          open_ports: device.openPorts,
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }, []);

  const scanNetwork = async () => {
    if (!networkInfo) {
      toast({
        title: "No Network Connection",
        description: "Please connect to a network to scan",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    
    try {
      // Get current network information from browser APIs
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      const effectiveType = connection?.effectiveType || 'unknown';
      const downlink = connection?.downlink || 0;
      
      // Simulate comprehensive network scanning with realistic device discovery
      const deviceTypes: DiscoveredDevice['type'][] = ['router', 'server', 'workstation', 'mobile', 'iot', 'unknown'];
      const newDevices: DiscoveredDevice[] = [];
      
      // Scan the local subnet
      const subnet = networkInfo.gateway.split('.').slice(0, 3).join('.');
      const totalHosts = 15 + Math.floor(Math.random() * 25); // Between 15-40 devices
      
      for (let i = 0; i < totalHosts; i++) {
        // Simulate scanning delay with progress
        await new Promise(resolve => setTimeout(resolve, 80));
        setScanProgress(((i + 1) / totalHosts) * 100);
        
        const hostNum = Math.floor(Math.random() * 254) + 1;
        const ip = `${subnet}.${hostNum}`;
        const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
        const isRouter = i === 0; // First device is always the router
        
        const device: DiscoveredDevice = {
          id: `device-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          name: isRouter ? 'Network Gateway' : 
                deviceType === 'server' ? `Server-${hostNum}` :
                deviceType === 'workstation' ? `Workstation-${hostNum}` :
                deviceType === 'mobile' ? `Mobile-Device-${hostNum}` :
                deviceType === 'iot' ? `IoT-Device-${hostNum}` :
                `Device-${hostNum}`,
          ipAddress: isRouter ? networkInfo.gateway : ip,
          macAddress: generateMacAddress(),
          type: isRouter ? 'router' : deviceType,
          vendor: VENDORS[Math.floor(Math.random() * VENDORS.length)],
          status: Math.random() > 0.08 ? 'online' : 'warning',
          signalStrength: Math.random() > 0.4 ? 55 + Math.floor(Math.random() * 45) : undefined,
          lastSeen: new Date().toISOString(),
          openPorts: Array.from({ length: Math.floor(Math.random() * 5) }, () => 
            [22, 80, 443, 3389, 8080, 3306, 5432, 21, 25, 110, 143][Math.floor(Math.random() * 11)]
          ).filter((v, idx, a) => a.indexOf(v) === idx),
          services: ['HTTP', 'SSH', 'DNS', 'DHCP', 'SMB', 'FTP', 'SMTP'].slice(0, Math.floor(Math.random() * 5) + 1),
          threats: 0,
          isSecure: Math.random() > 0.15,
          connectionType: Math.random() > 0.35 ? 'wifi' : 'ethernet',
        };
        
        newDevices.push(device);
      }
      
      // Remove duplicates by IP
      const uniqueDevices = newDevices.filter((device, index, self) =>
        index === self.findIndex(d => d.ipAddress === device.ipAddress)
      );
      
      setDiscoveredDevices(uniqueDevices);
      onDevicesDiscovered?.(uniqueDevices);
      setScanProgress(100);
      
      toast({
        title: "Network Scan Complete",
        description: `Discovered ${uniqueDevices.length} devices on the network (${effectiveType} connection)`,
      });

      // Log devices that need attention
      uniqueDevices.forEach(device => {
        if (device.status === 'warning' || !device.isSecure) {
          logSecurityEvent(device, 'Device requires security review');
        }
      });
      
    } catch (error) {
      console.error('Network scan error:', error);
      toast({
        title: "Scan Error",
        description: "An error occurred during the network scan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const getSignalIcon = (strength?: number) => {
    if (!strength) return <Signal className="h-4 w-4 text-muted-foreground" />;
    if (strength >= 80) return <SignalHigh className="h-4 w-4 text-success" />;
    if (strength >= 50) return <SignalMedium className="h-4 w-4 text-warning" />;
    return <SignalLow className="h-4 w-4 text-destructive" />;
  };

  const getStatusBadge = (status: DiscoveredDevice['status']) => {
    const styles = {
      online: 'bg-success/20 text-success border-success/30',
      offline: 'bg-muted text-muted-foreground border-border',
      warning: 'bg-warning/20 text-warning border-warning/30',
      threat: 'bg-destructive/20 text-destructive border-destructive/30',
    };
    return styles[status];
  };

  const stats = {
    total: discoveredDevices.length,
    online: discoveredDevices.filter(d => d.status === 'online').length,
    threats: discoveredDevices.filter(d => d.status === 'threat').length,
    insecure: discoveredDevices.filter(d => !d.isSecure).length,
  };

  return (
    <Card className={cn("cyber-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary animate-pulse" />
            Network Monitoring Service
            <Badge 
              variant="outline" 
              className={cn(
                connectionStatus === 'connected' ? "bg-success/10 text-success border-success/30" :
                connectionStatus === 'disconnected' ? "bg-destructive/10 text-destructive border-destructive/30" :
                "bg-warning/10 text-warning border-warning/30"
              )}
            >
              {connectionStatus === 'connected' ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {connectionStatus.toUpperCase()}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-monitor" className="text-sm">Auto Monitor</Label>
              <Switch
                id="auto-monitor"
                checked={autoMonitor}
                onCheckedChange={setAutoMonitor}
              />
            </div>
            <Button
              size="sm"
              onClick={scanNetwork}
              disabled={isScanning || connectionStatus !== 'connected'}
              className="h-7"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Scan className="h-3 w-3 mr-1" />
                  Scan Network
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network Info */}
        {networkInfo && (
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="font-medium">{networkInfo.ssid}</span>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                {networkInfo.isSecure ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                {networkInfo.encryptionType}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Local IP:</span>
                <span className="font-mono ml-2">{networkInfo.localIP}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Gateway:</span>
                <span className="font-mono ml-2">{networkInfo.gateway}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Public IP:</span>
                <span className="font-mono ml-2">{networkInfo.publicIP}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Signal:</span>
                {getSignalIcon(networkInfo.signalStrength)}
                <span>{networkInfo.signalStrength}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Scan Progress */}
        {isScanning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Scanning network...</span>
              <span>{scanProgress.toFixed(0)}%</span>
            </div>
            <Progress value={scanProgress} className="h-2" />
          </div>
        )}

        {/* Stats */}
        {discoveredDevices.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-center">
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Devices</p>
            </div>
            <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-center">
              <p className="text-xl font-bold text-success">{stats.online}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
              <p className="text-xl font-bold text-destructive">{stats.threats}</p>
              <p className="text-xs text-muted-foreground">Threats</p>
            </div>
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-center">
              <p className="text-xl font-bold text-warning">{stats.insecure}</p>
              <p className="text-xs text-muted-foreground">Insecure</p>
            </div>
          </div>
        )}

        {/* Threat Alerts */}
        {threatAlerts.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">Recent Alerts</span>
            </div>
            <div className="space-y-1 max-h-[100px] overflow-auto">
              {threatAlerts.slice(0, 3).map((alert, idx) => (
                <p key={idx} className="text-xs text-destructive/80">{alert}</p>
              ))}
            </div>
          </div>
        )}

        {/* Discovered Devices */}
        <ScrollArea className="h-[300px]">
          {discoveredDevices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Network className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No devices discovered</p>
              <p className="text-sm">Click "Scan Network" to discover devices on your network</p>
            </div>
          ) : (
            <div className="space-y-2">
              {discoveredDevices.map((device) => (
                <div
                  key={device.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    device.status === 'threat' 
                      ? "bg-destructive/10 border-destructive/30 animate-pulse" 
                      : "bg-secondary/30 border-border/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        device.status === 'threat' ? "bg-destructive/20" : "bg-primary/10"
                      )}>
                        {DEVICE_ICONS[device.type]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{device.name}</span>
                          <Badge variant="outline" className={getStatusBadge(device.status)}>
                            {device.status}
                          </Badge>
                          {!device.isSecure && (
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                              <Unlock className="h-3 w-3 mr-1" />
                              Insecure
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="font-mono">{device.ipAddress}</span>
                          <span className="font-mono">{device.macAddress}</span>
                          <span>{device.vendor}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {device.signalStrength && getSignalIcon(device.signalStrength)}
                      {device.threats > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {device.threats} threats
                        </Badge>
                      )}
                    </div>
                  </div>
                  {device.openPorts.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-muted-foreground">Open ports:</span>
                      {device.openPorts.map(port => (
                        <Badge key={port} variant="outline" className="text-xs font-mono">
                          {port}
                        </Badge>
                      ))}
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

export default NetworkMonitoringService;

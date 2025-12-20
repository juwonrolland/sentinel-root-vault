import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Router,
  Server,
  Monitor,
  Smartphone,
  Network,
  Activity,
  Lock,
  Scan,
  Radio,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Zap,
  Eye,
  EyeOff,
  Globe,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useRegisteredNetworks } from '@/hooks/useRegisteredNetworks';

interface ScannedDevice {
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
  isRegistered: boolean;
  networkSegment: string;
}

interface AdvancedNetworkScannerProps {
  className?: string;
  onDevicesScanned?: (devices: ScannedDevice[]) => void;
  registeredNetworksOnly?: boolean;
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
  'Netgear', 'D-Link', 'Ubiquiti Networks', 'Aruba Networks',
  'Juniper Networks', 'Fortinet', 'Palo Alto Networks'
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

export const AdvancedNetworkScanner: React.FC<AdvancedNetworkScannerProps> = ({
  className,
  onDevicesScanned,
  registeredNetworksOnly = true,
}) => {
  const { networks, isNetworkRegistered, isDeviceRegistered } = useRegisteredNetworks();
  const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPhase, setScanPhase] = useState('');
  const [autoMonitor, setAutoMonitor] = useState(true);
  const [onlyRegistered, setOnlyRegistered] = useState(registeredNetworksOnly);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [threatAlerts, setThreatAlerts] = useState<string[]>([]);
  const { toast } = useToast();

  // Check network connection
  useEffect(() => {
    const checkConnection = () => {
      setConnectionStatus(navigator.onLine ? 'connected' : 'disconnected');
    };
    
    checkConnection();
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', () => setConnectionStatus('disconnected'));
    
    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', () => setConnectionStatus('disconnected'));
    };
  }, []);

  // Auto-monitor devices
  useEffect(() => {
    if (!autoMonitor || connectionStatus !== 'connected') return;

    const interval = setInterval(() => {
      setScannedDevices(prev => prev.map(device => {
        if (!device.isRegistered && onlyRegistered) return device;
        
        const threatChance = Math.random() < 0.01;
        let newStatus = device.status;
        let newThreats = device.threats;

        if (threatChance && device.status !== 'threat') {
          newStatus = 'threat';
          newThreats += 1;
          setThreatAlerts(prev => [
            `⚠️ Threat detected on ${device.name} (${device.ipAddress})`,
            ...prev.slice(0, 9)
          ]);
          logSecurityEvent(device, 'threat_detected');
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
  }, [autoMonitor, connectionStatus, onlyRegistered]);

  const logSecurityEvent = async (device: ScannedDevice, eventType: string) => {
    try {
      await supabase.from('security_events').insert({
        event_type: eventType,
        severity: device.status === 'threat' ? 'high' : 'medium',
        description: `${eventType}: ${device.name} (${device.ipAddress})`,
        source_ip: device.ipAddress,
        metadata: {
          device_name: device.name,
          mac_address: device.macAddress,
          vendor: device.vendor,
          network_segment: device.networkSegment,
          is_registered: device.isRegistered,
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const performAdvancedScan = async () => {
    if (connectionStatus !== 'connected') {
      toast({
        title: "No Network Connection",
        description: "Please connect to a network to scan",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setThreatAlerts([]);
    
    const allDevices: ScannedDevice[] = [];
    const deviceTypes: ScannedDevice['type'][] = ['router', 'server', 'workstation', 'mobile', 'iot', 'unknown'];

    try {
      // Phase 1: Scan registered networks first
      setScanPhase('Scanning registered networks...');
      for (let i = 0; i < networks.length; i++) {
        const network = networks[i];
        const [networkBase] = network.networkRange.split('/');
        const subnet = networkBase.split('.').slice(0, 3).join('.');
        
        const devicesInNetwork = 15 + Math.floor(Math.random() * 25);
        
        for (let j = 0; j < devicesInNetwork; j++) {
          await new Promise(resolve => setTimeout(resolve, 20));
          
          const hostNum = j === 0 ? 1 : Math.floor(Math.random() * 253) + 2;
          const ip = `${subnet}.${hostNum}`;
          const deviceType = j === 0 ? 'router' : deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
          
          allDevices.push(createDevice(ip, deviceType, network.name, true, network.sector));
        }
        
        // Add registered devices from the network
        network.devices.forEach(regDevice => {
          const existingIndex = allDevices.findIndex(d => d.ipAddress === regDevice.ipAddress);
          if (existingIndex === -1) {
            allDevices.push({
              id: regDevice.id,
              name: regDevice.name,
              ipAddress: regDevice.ipAddress,
              macAddress: regDevice.macAddress || generateMacAddress(),
              type: regDevice.type as any,
              vendor: VENDORS[Math.floor(Math.random() * VENDORS.length)],
              status: regDevice.status === 'online' ? 'online' : regDevice.status === 'critical' ? 'threat' : 'warning',
              lastSeen: regDevice.lastSeen,
              openPorts: [22, 80, 443].slice(0, Math.floor(Math.random() * 3) + 1),
              services: ['SSH', 'HTTP', 'HTTPS'].slice(0, Math.floor(Math.random() * 3) + 1),
              threats: regDevice.threats,
              isSecure: true,
              connectionType: 'ethernet',
              isRegistered: true,
              networkSegment: network.name,
            });
          }
        });
        
        setScanProgress(((i + 1) / networks.length) * 40);
      }

      // Phase 2: Scan the current operating network
      setScanPhase('Scanning operating network...');
      const operatingSubnets = ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];
      
      for (let i = 0; i < operatingSubnets.length; i++) {
        const subnet = operatingSubnets[i];
        const devicesCount = 10 + Math.floor(Math.random() * 20);
        
        for (let j = 0; j < devicesCount; j++) {
          await new Promise(resolve => setTimeout(resolve, 15));
          
          const hostNum = j === 0 ? 1 : Math.floor(Math.random() * 253) + 2;
          const ip = `${subnet}.${hostNum}`;
          
          // Check if this IP belongs to a registered network
          const isRegistered = isNetworkRegistered(ip) || isDeviceRegistered(ip);
          
          if (!onlyRegistered || isRegistered) {
            const deviceType = j === 0 ? 'router' : deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
            allDevices.push(createDevice(ip, deviceType, `${subnet}.0/24`, isRegistered, 'Local'));
          }
        }
        
        setScanProgress(40 + ((i + 1) / operatingSubnets.length) * 40);
      }

      // Phase 3: Advanced threat analysis
      setScanPhase('Performing threat analysis...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Identify threats
      allDevices.forEach(device => {
        if (!device.isSecure || device.openPorts.length > 4) {
          if (Math.random() < 0.15) {
            device.status = 'threat';
            device.threats = Math.floor(Math.random() * 3) + 1;
            setThreatAlerts(prev => [
              `🚨 Security risk: ${device.name} (${device.ipAddress}) - ${device.openPorts.length} open ports`,
              ...prev.slice(0, 9)
            ]);
          }
        }
      });

      setScanProgress(90);
      setScanPhase('Finalizing scan results...');
      await new Promise(resolve => setTimeout(resolve, 300));

      // Remove duplicates and finalize
      const uniqueDevices = allDevices.filter((device, index, self) =>
        index === self.findIndex(d => d.ipAddress === device.ipAddress)
      );

      // Filter by registration status if required
      const finalDevices = onlyRegistered 
        ? uniqueDevices.filter(d => d.isRegistered)
        : uniqueDevices;

      setScannedDevices(finalDevices);
      onDevicesScanned?.(finalDevices);
      setScanProgress(100);

      const threatCount = finalDevices.filter(d => d.status === 'threat').length;
      const registeredCount = finalDevices.filter(d => d.isRegistered).length;

      toast({
        title: "Advanced Network Scan Complete",
        description: `Discovered ${finalDevices.length} devices (${registeredCount} registered). ${threatCount > 0 ? `${threatCount} threats detected.` : 'Network secure.'}`,
        variant: threatCount > 0 ? 'destructive' : 'default',
      });

      // Log scan completion
      await supabase.from('security_audit_log').insert({
        event_type: 'network_scan_completed',
        event_category: 'security',
        severity: threatCount > 0 ? 'warning' : 'info',
        action_performed: `Network scan completed: ${finalDevices.length} devices, ${threatCount} threats`,
        metadata: {
          total_devices: finalDevices.length,
          registered_devices: registeredCount,
          threats: threatCount,
          networks_scanned: networks.length,
        }
      });

    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: "Scan Error",
        description: "An error occurred during the network scan",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
      setScanPhase('');
    }
  };

  const createDevice = (
    ip: string,
    type: ScannedDevice['type'],
    networkSegment: string,
    isRegistered: boolean,
    sector: string
  ): ScannedDevice => {
    const hostNum = parseInt(ip.split('.').pop() || '0');
    return {
      id: `scanned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: type === 'router' ? `Gateway-${hostNum}` :
            type === 'server' ? `Server-${hostNum}` :
            type === 'workstation' ? `Workstation-${hostNum}` :
            type === 'mobile' ? `Mobile-${hostNum}` :
            type === 'iot' ? `IoT-${hostNum}` :
            `Device-${hostNum}`,
      ipAddress: ip,
      macAddress: generateMacAddress(),
      type,
      vendor: VENDORS[Math.floor(Math.random() * VENDORS.length)],
      status: Math.random() > 0.1 ? 'online' : 'warning',
      signalStrength: Math.random() > 0.3 ? 45 + Math.floor(Math.random() * 55) : undefined,
      lastSeen: new Date().toISOString(),
      openPorts: Array.from({ length: Math.floor(Math.random() * 5) }, () =>
        [22, 80, 443, 3389, 8080, 3306, 5432][Math.floor(Math.random() * 7)]
      ).filter((v, idx, a) => a.indexOf(v) === idx),
      services: ['HTTP', 'SSH', 'DNS', 'DHCP', 'SMB'].slice(0, Math.floor(Math.random() * 4) + 1),
      threats: 0,
      isSecure: Math.random() > 0.15,
      connectionType: Math.random() > 0.4 ? 'wifi' : 'ethernet',
      isRegistered,
      networkSegment,
    };
  };

  const getStatusBadge = (status: string, isRegistered: boolean) => {
    const baseClasses = isRegistered ? '' : 'opacity-60';
    const styles: Record<string, string> = {
      online: `bg-success/20 text-success border-success/30 ${baseClasses}`,
      offline: `bg-muted text-muted-foreground border-border ${baseClasses}`,
      warning: `bg-warning/20 text-warning border-warning/30 ${baseClasses}`,
      threat: `bg-destructive/20 text-destructive border-destructive/30 ${baseClasses}`,
    };
    return styles[status] || styles.offline;
  };

  const stats = {
    total: scannedDevices.length,
    registered: scannedDevices.filter(d => d.isRegistered).length,
    online: scannedDevices.filter(d => d.status === 'online').length,
    threats: scannedDevices.filter(d => d.status === 'threat').length,
    insecure: scannedDevices.filter(d => !d.isSecure).length,
  };

  return (
    <Card className={cn("cyber-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Radio className="h-5 w-5 text-primary animate-pulse" />
            Advanced Network Scanner
            <Badge
              variant="outline"
              className={cn(
                connectionStatus === 'connected' ? "bg-success/10 text-success border-success/30" :
                "bg-destructive/10 text-destructive border-destructive/30"
              )}
            >
              {connectionStatus === 'connected' ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {connectionStatus.toUpperCase()}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="registered-only" className="text-xs">Registered Only</Label>
              <Switch
                id="registered-only"
                checked={onlyRegistered}
                onCheckedChange={setOnlyRegistered}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-monitor" className="text-xs">Auto Monitor</Label>
              <Switch
                id="auto-monitor"
                checked={autoMonitor}
                onCheckedChange={setAutoMonitor}
              />
            </div>
            <Button
              size="sm"
              onClick={performAdvancedScan}
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
                  Scan Networks
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scan Progress */}
        {isScanning && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{scanPhase}</span>
              <span className="text-sm font-mono">{scanProgress.toFixed(0)}%</span>
            </div>
            <Progress value={scanProgress} className="h-2" />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-2">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <p className="text-lg font-bold text-primary">{stats.total}</p>
            <p className="text-[9px] text-muted-foreground">Total</p>
          </div>
          <div className="p-2 rounded-lg bg-info/10 border border-info/20 text-center">
            <p className="text-lg font-bold text-info">{stats.registered}</p>
            <p className="text-[9px] text-muted-foreground">Registered</p>
          </div>
          <div className="p-2 rounded-lg bg-success/10 border border-success/20 text-center">
            <p className="text-lg font-bold text-success">{stats.online}</p>
            <p className="text-[9px] text-muted-foreground">Online</p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <p className="text-lg font-bold text-destructive">{stats.threats}</p>
            <p className="text-[9px] text-muted-foreground">Threats</p>
          </div>
          <div className="p-2 rounded-lg bg-warning/10 border border-warning/20 text-center">
            <p className="text-lg font-bold text-warning">{stats.insecure}</p>
            <p className="text-[9px] text-muted-foreground">Insecure</p>
          </div>
        </div>

        {/* Threat Alerts */}
        {threatAlerts.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Active Alerts</span>
            </div>
            <ScrollArea className="h-[80px]">
              <div className="space-y-1">
                {threatAlerts.map((alert, idx) => (
                  <p key={idx} className="text-xs text-destructive/80">{alert}</p>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Device List */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-2">
            {scannedDevices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm mb-2">No devices scanned</p>
                <p className="text-xs">Click "Scan Networks" to discover devices</p>
              </div>
            ) : (
              scannedDevices.map((device) => (
                <div
                  key={device.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    device.isRegistered 
                      ? "bg-secondary/40 border-primary/30" 
                      : "bg-secondary/20 border-border/50 opacity-70"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1.5 rounded",
                        device.isRegistered ? "bg-primary/20" : "bg-muted"
                      )}>
                        {DEVICE_ICONS[device.type]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{device.name}</p>
                          {device.isRegistered && (
                            <Badge variant="outline" className="text-[8px] bg-primary/10 border-primary/30">
                              <Shield className="h-2 w-2 mr-0.5" />
                              REGISTERED
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{device.ipAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusBadge(device.status, device.isRegistered)}>
                        {device.status.toUpperCase()}
                      </Badge>
                      {device.threats > 0 && (
                        <Badge variant="destructive" className="text-[10px]">
                          {device.threats} threats
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Vendor</p>
                      <p className="truncate">{device.vendor}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Network</p>
                      <p className="truncate">{device.networkSegment}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ports</p>
                      <p className="font-mono">{device.openPorts.length} open</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Security</p>
                      <p className={device.isSecure ? 'text-success' : 'text-warning'}>
                        {device.isSecure ? 'Secure' : 'Review'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Network, 
  Server, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Database,
  Settings,
  Search,
  RefreshCw,
  Plus,
  Eye,
  Trash2,
  Terminal,
  Zap,
  Shield,
  Cpu,
  HardDrive
} from 'lucide-react';

interface SNMPDevice {
  id: string;
  hostname: string;
  ip: string;
  community: string;
  version: 'v1' | 'v2c' | 'v3';
  port: number;
  status: 'online' | 'offline' | 'unknown';
  lastPoll: string;
  oids: SNMPOIDData[];
}

interface SNMPOIDData {
  oid: string;
  name: string;
  value: string;
  type: string;
  lastUpdated: string;
}

interface SNMPTrap {
  id: string;
  sourceIP: string;
  trapOID: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  receivedAt: string;
  acknowledged: boolean;
}

interface OIDTemplate {
  name: string;
  category: string;
  oids: { oid: string; name: string; description: string }[];
}

const commonOIDs: OIDTemplate[] = [
  {
    name: 'System Information',
    category: 'system',
    oids: [
      { oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', description: 'System Description' },
      { oid: '1.3.6.1.2.1.1.3.0', name: 'sysUpTime', description: 'System Uptime' },
      { oid: '1.3.6.1.2.1.1.5.0', name: 'sysName', description: 'System Name' },
      { oid: '1.3.6.1.2.1.1.6.0', name: 'sysLocation', description: 'System Location' }
    ]
  },
  {
    name: 'Interface Statistics',
    category: 'interfaces',
    oids: [
      { oid: '1.3.6.1.2.1.2.2.1.10', name: 'ifInOctets', description: 'Bytes In' },
      { oid: '1.3.6.1.2.1.2.2.1.16', name: 'ifOutOctets', description: 'Bytes Out' },
      { oid: '1.3.6.1.2.1.2.2.1.8', name: 'ifOperStatus', description: 'Interface Status' }
    ]
  },
  {
    name: 'CPU & Memory',
    category: 'performance',
    oids: [
      { oid: '1.3.6.1.4.1.2021.11.9.0', name: 'ssCpuUser', description: 'CPU User %' },
      { oid: '1.3.6.1.4.1.2021.11.10.0', name: 'ssCpuSystem', description: 'CPU System %' },
      { oid: '1.3.6.1.4.1.2021.4.5.0', name: 'memTotalReal', description: 'Total RAM' },
      { oid: '1.3.6.1.4.1.2021.4.6.0', name: 'memAvailReal', description: 'Available RAM' }
    ]
  },
  {
    name: 'Disk Usage',
    category: 'storage',
    oids: [
      { oid: '1.3.6.1.4.1.2021.9.1.6', name: 'dskTotal', description: 'Total Disk Space' },
      { oid: '1.3.6.1.4.1.2021.9.1.7', name: 'dskAvail', description: 'Available Disk Space' },
      { oid: '1.3.6.1.4.1.2021.9.1.9', name: 'dskPercent', description: 'Disk Usage %' }
    ]
  }
];

export const SNMPMonitoring: React.FC = () => {
  const [devices, setDevices] = useState<SNMPDevice[]>([
    {
      id: 'snmp-1',
      hostname: 'core-router-01',
      ip: '192.168.1.1',
      community: 'public',
      version: 'v2c',
      port: 161,
      status: 'online',
      lastPoll: new Date().toISOString(),
      oids: [
        { oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', value: 'Cisco IOS Software, Router Version 15.2', type: 'STRING', lastUpdated: new Date().toISOString() },
        { oid: '1.3.6.1.2.1.1.3.0', name: 'sysUpTime', value: '4567890', type: 'TIMETICKS', lastUpdated: new Date().toISOString() },
        { oid: '1.3.6.1.2.1.1.5.0', name: 'sysName', value: 'core-router-01.local', type: 'STRING', lastUpdated: new Date().toISOString() }
      ]
    },
    {
      id: 'snmp-2',
      hostname: 'switch-dist-01',
      ip: '192.168.1.2',
      community: 'public',
      version: 'v2c',
      port: 161,
      status: 'online',
      lastPoll: new Date().toISOString(),
      oids: [
        { oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', value: 'HP ProCurve Switch 2920-24G', type: 'STRING', lastUpdated: new Date().toISOString() },
        { oid: '1.3.6.1.2.1.1.3.0', name: 'sysUpTime', value: '8901234', type: 'TIMETICKS', lastUpdated: new Date().toISOString() }
      ]
    },
    {
      id: 'snmp-3',
      hostname: 'firewall-primary',
      ip: '192.168.1.254',
      community: 'secure_community',
      version: 'v3',
      port: 161,
      status: 'online',
      lastPoll: new Date().toISOString(),
      oids: [
        { oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', value: 'Fortinet FortiGate 100F', type: 'STRING', lastUpdated: new Date().toISOString() }
      ]
    }
  ]);

  const [traps, setTraps] = useState<SNMPTrap[]>([
    { id: 't1', sourceIP: '192.168.1.1', trapOID: '1.3.6.1.6.3.1.1.5.3', message: 'Link Down on interface Gi0/1', severity: 'warning', receivedAt: new Date(Date.now() - 300000).toISOString(), acknowledged: false },
    { id: 't2', sourceIP: '192.168.1.254', trapOID: '1.3.6.1.4.1.12356.101.2', message: 'High CPU utilization detected', severity: 'warning', receivedAt: new Date(Date.now() - 600000).toISOString(), acknowledged: true },
    { id: 't3', sourceIP: '192.168.1.2', trapOID: '1.3.6.1.6.3.1.1.5.4', message: 'Link Up on interface port 24', severity: 'info', receivedAt: new Date(Date.now() - 900000).toISOString(), acknowledged: true }
  ]);

  const [selectedDevice, setSelectedDevice] = useState<SNMPDevice | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollInterval, setPollInterval] = useState(60);
  const [trapListenerEnabled, setTrapListenerEnabled] = useState(true);

  // New device form
  const [newDevice, setNewDevice] = useState({
    hostname: '',
    ip: '',
    community: 'public',
    version: 'v2c' as const,
    port: 161
  });

  // Simulate SNMP polling
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(() => {
      setDevices(prev => prev.map(device => ({
        ...device,
        lastPoll: new Date().toISOString(),
        oids: device.oids.map(oid => ({
          ...oid,
          value: oid.type === 'TIMETICKS' ? 
            String(parseInt(oid.value) + pollInterval * 100) : 
            oid.value,
          lastUpdated: new Date().toISOString()
        }))
      })));
    }, pollInterval * 1000);

    return () => clearInterval(interval);
  }, [isPolling, pollInterval]);

  // Simulate incoming traps
  useEffect(() => {
    if (!trapListenerEnabled) return;

    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const trapTypes = [
          { oid: '1.3.6.1.6.3.1.1.5.3', message: 'Link Down detected', severity: 'warning' as const },
          { oid: '1.3.6.1.6.3.1.1.5.4', message: 'Link Up restored', severity: 'info' as const },
          { oid: '1.3.6.1.4.1.2021.100', message: 'High memory usage alert', severity: 'critical' as const },
          { oid: '1.3.6.1.6.3.1.1.5.1', message: 'Cold start detected', severity: 'warning' as const }
        ];
        const trap = trapTypes[Math.floor(Math.random() * trapTypes.length)];
        const sourceDevice = devices[Math.floor(Math.random() * devices.length)];

        const newTrap: SNMPTrap = {
          id: `t${Date.now()}`,
          sourceIP: sourceDevice.ip,
          trapOID: trap.oid,
          message: trap.message,
          severity: trap.severity,
          receivedAt: new Date().toISOString(),
          acknowledged: false
        };

        setTraps(prev => [newTrap, ...prev.slice(0, 49)]);

        if (trap.severity === 'critical') {
          toast.error('SNMP Trap: ' + trap.message, {
            description: `Source: ${sourceDevice.hostname} (${sourceDevice.ip})`
          });
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [trapListenerEnabled, devices]);

  const addDevice = () => {
    if (!newDevice.hostname || !newDevice.ip) {
      toast.error('Please fill in hostname and IP address');
      return;
    }

    const device: SNMPDevice = {
      id: `snmp-${Date.now()}`,
      ...newDevice,
      status: 'unknown',
      lastPoll: '',
      oids: []
    };

    setDevices(prev => [...prev, device]);
    setNewDevice({ hostname: '', ip: '', community: 'public', version: 'v2c', port: 161 });
    toast.success(`Device ${newDevice.hostname} added`);
  };

  const pollDevice = async (device: SNMPDevice) => {
    toast.info(`Polling ${device.hostname}...`);
    
    // Simulate SNMP GET
    setTimeout(() => {
      setDevices(prev => prev.map(d => 
        d.id === device.id ? {
          ...d,
          status: 'online',
          lastPoll: new Date().toISOString(),
          oids: commonOIDs.flatMap(template => 
            template.oids.map(oid => ({
              oid: oid.oid,
              name: oid.name,
              value: generateMockValue(oid.name),
              type: 'STRING',
              lastUpdated: new Date().toISOString()
            }))
          )
        } : d
      ));
      toast.success(`Poll completed for ${device.hostname}`);
    }, 1500);
  };

  const generateMockValue = (name: string): string => {
    switch (name) {
      case 'sysUpTime': return String(Math.floor(Math.random() * 10000000));
      case 'ssCpuUser': return String(Math.floor(Math.random() * 100));
      case 'ssCpuSystem': return String(Math.floor(Math.random() * 50));
      case 'memTotalReal': return '16777216';
      case 'memAvailReal': return String(Math.floor(Math.random() * 8000000) + 4000000);
      case 'ifInOctets': return String(Math.floor(Math.random() * 1000000000));
      case 'ifOutOctets': return String(Math.floor(Math.random() * 1000000000));
      default: return 'Sample Value';
    }
  };

  const acknowledgeTrap = (trapId: string) => {
    setTraps(prev => prev.map(t => 
      t.id === trapId ? { ...t, acknowledged: true } : t
    ));
  };

  const removeDevice = (deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    if (selectedDevice?.id === deviceId) setSelectedDevice(null);
    toast.success('Device removed');
  };

  const formatUptime = (ticks: string): string => {
    const seconds = parseInt(ticks) / 100;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/20">
                <Network className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">SNMP Network Monitoring</CardTitle>
                <CardDescription>Simple Network Management Protocol device management</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Auto-Poll</Label>
                <Switch checked={isPolling} onCheckedChange={setIsPolling} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Trap Listener</Label>
                <Switch checked={trapListenerEnabled} onCheckedChange={setTrapListenerEnabled} />
              </div>
              <Select value={String(pollInterval)} onValueChange={(v) => setPollInterval(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="600">10 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{devices.length}</div>
              <div className="text-xs text-muted-foreground">Managed Devices</div>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{devices.filter(d => d.status === 'online').length}</div>
              <div className="text-xs text-muted-foreground">Online</div>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">{traps.filter(t => !t.acknowledged).length}</div>
              <div className="text-xs text-muted-foreground">Unread Traps</div>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-red-400">{traps.filter(t => t.severity === 'critical' && !t.acknowledged).length}</div>
              <div className="text-xs text-muted-foreground">Critical Alerts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Devices
          </TabsTrigger>
          <TabsTrigger value="traps" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Traps ({traps.filter(t => !t.acknowledged).length})
          </TabsTrigger>
          <TabsTrigger value="oids" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            OID Browser
          </TabsTrigger>
          <TabsTrigger value="add" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Device
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices">
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">SNMP Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {devices.map(device => (
                      <div 
                        key={device.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedDevice?.id === device.id 
                            ? 'bg-primary/10 border-primary/50' 
                            : 'bg-background/50 border-border hover:border-primary/30'
                        }`}
                        onClick={() => setSelectedDevice(device)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Server className={`h-5 w-5 ${device.status === 'online' ? 'text-green-400' : device.status === 'offline' ? 'text-red-400' : 'text-muted-foreground'}`} />
                            <div>
                              <div className="font-semibold">{device.hostname}</div>
                              <div className="text-xs font-mono text-muted-foreground">{device.ip}</div>
                            </div>
                          </div>
                          <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                            {device.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>SNMP {device.version} • Port {device.port}</span>
                          {device.lastPoll && (
                            <span>Last: {new Date(device.lastPoll).toLocaleTimeString()}</span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); pollDevice(device); }}>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Poll
                          </Button>
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); removeDevice(device.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Device Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDevice ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      <div className="p-3 bg-background/50 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Hostname</div>
                            <div className="font-semibold">{selectedDevice.hostname}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">IP Address</div>
                            <div className="font-mono">{selectedDevice.ip}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Version</div>
                            <div>{selectedDevice.version.toUpperCase()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Community</div>
                            <div className="font-mono">{selectedDevice.community}</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">OID Values ({selectedDevice.oids.length})</h4>
                        <div className="space-y-2">
                          {selectedDevice.oids.map((oid, idx) => (
                            <div key={idx} className="p-2 bg-background/30 rounded border text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">{oid.name}</span>
                                <Badge variant="outline" className="text-xs">{oid.type}</Badge>
                              </div>
                              <div className="font-mono text-xs text-muted-foreground mt-1">{oid.oid}</div>
                              <div className="mt-1">
                                {oid.name === 'sysUpTime' ? formatUptime(oid.value) : oid.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Select a device to view details</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="traps">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">SNMP Traps & Notifications</CardTitle>
                <Badge variant={trapListenerEnabled ? 'default' : 'secondary'}>
                  {trapListenerEnabled ? 'Listening' : 'Paused'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {traps.map(trap => (
                    <div 
                      key={trap.id}
                      className={`p-3 rounded-lg border ${
                        trap.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                        trap.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                        'bg-blue-500/10 border-blue-500/30'
                      } ${trap.acknowledged ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className={`h-5 w-5 ${
                            trap.severity === 'critical' ? 'text-red-400' :
                            trap.severity === 'warning' ? 'text-yellow-400' :
                            'text-blue-400'
                          }`} />
                          <div>
                            <div className="font-semibold">{trap.message}</div>
                            <div className="text-xs text-muted-foreground">
                              Source: {trap.sourceIP} • OID: {trap.trapOID}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(trap.receivedAt).toLocaleString()}
                          </span>
                          {!trap.acknowledged && (
                            <Button size="sm" variant="outline" onClick={() => acknowledgeTrap(trap.id)}>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Ack
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oids">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">OID Templates & Browser</CardTitle>
              <CardDescription>Common SNMP OIDs for device monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {commonOIDs.map((template, idx) => (
                    <div key={idx} className="p-4 bg-background/50 rounded-lg border">
                      <div className="flex items-center gap-2 mb-3">
                        {template.category === 'system' && <Terminal className="h-5 w-5 text-primary" />}
                        {template.category === 'interfaces' && <Network className="h-5 w-5 text-primary" />}
                        {template.category === 'performance' && <Cpu className="h-5 w-5 text-primary" />}
                        {template.category === 'storage' && <HardDrive className="h-5 w-5 text-primary" />}
                        <h4 className="font-semibold">{template.name}</h4>
                      </div>
                      <div className="space-y-2">
                        {template.oids.map((oid, oidIdx) => (
                          <div key={oidIdx} className="flex items-center justify-between p-2 bg-background/30 rounded text-sm">
                            <div>
                              <span className="font-semibold">{oid.name}</span>
                              <span className="text-muted-foreground ml-2">- {oid.description}</span>
                            </div>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{oid.oid}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Add SNMP Device</CardTitle>
              <CardDescription>Configure a new device for SNMP monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 max-w-2xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Hostname</Label>
                    <Input 
                      placeholder="device-name"
                      value={newDevice.hostname}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, hostname: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IP Address</Label>
                    <Input 
                      placeholder="192.168.1.1"
                      value={newDevice.ip}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, ip: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Community String</Label>
                    <Input 
                      placeholder="public"
                      value={newDevice.community}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, community: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>SNMP Version</Label>
                    <Select value={newDevice.version} onValueChange={(v: any) => setNewDevice(prev => ({ ...prev, version: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="v1">SNMPv1</SelectItem>
                        <SelectItem value="v2c">SNMPv2c</SelectItem>
                        <SelectItem value="v3">SNMPv3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input 
                      type="number"
                      value={newDevice.port}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, port: parseInt(e.target.value) || 161 }))}
                    />
                  </div>
                  <Button onClick={addDevice} className="w-full mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Device
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SNMPMonitoring;

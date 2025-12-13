import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Activity,
  ArrowUpDown,
  Download,
  Upload,
  Gauge,
  Shield,
  AlertTriangle,
  Plus,
  Trash2,
  Settings,
  Zap,
  Server,
  Router,
  Network,
  Monitor,
  Wifi,
  Cloud,
  Smartphone,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface QoSRule {
  id: string;
  name: string;
  priority: 1 | 2 | 3 | 4 | 5; // 1 = highest, 5 = lowest
  type: 'device' | 'application' | 'protocol' | 'port';
  target: string;
  bandwidthLimit: number; // Mbps
  burstLimit: number; // Mbps
  enabled: boolean;
  trafficClass: 'realtime' | 'interactive' | 'bulk' | 'background';
  currentUsage: number;
}

interface TrafficPriority {
  id: string;
  name: string;
  description: string;
  priority: number;
  protocols: string[];
  color: string;
}

interface BandwidthAllocation {
  category: string;
  allocated: number;
  used: number;
  peak: number;
  color: string;
}

interface BandwidthQoSManagerProps {
  className?: string;
  devices?: Array<{ id: string; name: string; type: string; ipAddress: string }>;
}

const TRAFFIC_CLASSES: TrafficPriority[] = [
  {
    id: 'realtime',
    name: 'Real-time',
    description: 'VoIP, Video conferencing, Gaming',
    priority: 1,
    protocols: ['RTP', 'SIP', 'H.323'],
    color: 'text-destructive',
  },
  {
    id: 'interactive',
    name: 'Interactive',
    description: 'Web browsing, SSH, Remote desktop',
    priority: 2,
    protocols: ['HTTP', 'HTTPS', 'SSH', 'RDP'],
    color: 'text-warning',
  },
  {
    id: 'bulk',
    name: 'Bulk Transfer',
    description: 'File transfers, Backups, Updates',
    priority: 3,
    protocols: ['FTP', 'SMB', 'NFS'],
    color: 'text-info',
  },
  {
    id: 'background',
    name: 'Background',
    description: 'P2P, Torrents, Low priority',
    priority: 4,
    protocols: ['BitTorrent', 'eDonkey'],
    color: 'text-muted-foreground',
  },
];

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

export const BandwidthQoSManager = ({ className, devices = [] }: BandwidthQoSManagerProps) => {
  const [rules, setRules] = useState<QoSRule[]>(() => {
    const saved = localStorage.getItem('qos-rules');
    return saved ? JSON.parse(saved) : [];
  });
  const [allocations, setAllocations] = useState<BandwidthAllocation[]>([
    { category: 'Real-time', allocated: 30, used: 0, peak: 0, color: 'bg-destructive' },
    { category: 'Interactive', allocated: 40, used: 0, peak: 0, color: 'bg-warning' },
    { category: 'Bulk Transfer', allocated: 20, used: 0, peak: 0, color: 'bg-info' },
    { category: 'Background', allocated: 10, used: 0, peak: 0, color: 'bg-muted' },
  ]);
  const [totalBandwidth, setTotalBandwidth] = useState(1000); // Mbps
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [qosEnabled, setQosEnabled] = useState(true);
  const [newRule, setNewRule] = useState<Partial<QoSRule>>({
    priority: 3,
    type: 'device',
    bandwidthLimit: 100,
    burstLimit: 150,
    enabled: true,
    trafficClass: 'interactive',
  });
  const { toast } = useToast();

  // Save rules to localStorage
  useEffect(() => {
    localStorage.setItem('qos-rules', JSON.stringify(rules));
  }, [rules]);

  // Simulate real-time usage updates
  useEffect(() => {
    if (!qosEnabled) return;

    const interval = setInterval(() => {
      // Update rule usage
      setRules(prev => prev.map(rule => ({
        ...rule,
        currentUsage: Math.min(rule.bandwidthLimit, Math.random() * rule.bandwidthLimit * 0.8),
      })));

      // Update allocation usage
      setAllocations(prev => prev.map(alloc => {
        const newUsed = Math.random() * alloc.allocated * 0.9;
        return {
          ...alloc,
          used: newUsed,
          peak: Math.max(alloc.peak, newUsed),
        };
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [qosEnabled]);

  const addRule = () => {
    if (!newRule.name || !newRule.target) {
      toast({
        title: "Validation Error",
        description: "Name and target are required",
        variant: "destructive",
      });
      return;
    }

    const rule: QoSRule = {
      id: `rule-${Date.now()}`,
      name: newRule.name!,
      priority: newRule.priority as any,
      type: newRule.type as any,
      target: newRule.target!,
      bandwidthLimit: newRule.bandwidthLimit!,
      burstLimit: newRule.burstLimit!,
      enabled: newRule.enabled!,
      trafficClass: newRule.trafficClass as any,
      currentUsage: 0,
    };

    setRules(prev => [...prev, rule]);
    setIsAddingRule(false);
    setNewRule({
      priority: 3,
      type: 'device',
      bandwidthLimit: 100,
      burstLimit: 150,
      enabled: true,
      trafficClass: 'interactive',
    });

    toast({
      title: "QoS Rule Created",
      description: `Rule "${rule.name}" has been added`,
    });
  };

  const removeRule = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
    toast({
      title: "Rule Removed",
      description: "QoS rule has been deleted",
    });
  };

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const updateAllocation = (category: string, value: number) => {
    setAllocations(prev => prev.map(a =>
      a.category === category ? { ...a, allocated: value } : a
    ));
  };

  const getPriorityBadge = (priority: number) => {
    const colors = {
      1: 'bg-destructive/20 text-destructive border-destructive/30',
      2: 'bg-warning/20 text-warning border-warning/30',
      3: 'bg-info/20 text-info border-info/30',
      4: 'bg-accent/20 text-accent border-accent/30',
      5: 'bg-muted text-muted-foreground border-border',
    };
    return colors[priority as keyof typeof colors] || colors[5];
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated, 0);

  return (
    <Card className={cn("cyber-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary animate-pulse" />
            Bandwidth & QoS Management
            <Badge variant="outline" className={cn(
              "ml-2",
              qosEnabled 
                ? "bg-success/10 text-success border-success/30" 
                : "bg-muted text-muted-foreground border-border"
            )}>
              {qosEnabled ? 'ACTIVE' : 'DISABLED'}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="qos-toggle" className="text-sm">QoS Engine</Label>
              <Switch
                id="qos-toggle"
                checked={qosEnabled}
                onCheckedChange={setQosEnabled}
              />
            </div>
            <Dialog open={isAddingRule} onOpenChange={setIsAddingRule}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Create QoS Rule
                  </DialogTitle>
                  <DialogDescription>
                    Define bandwidth limits and traffic prioritization rules
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rule Name *</Label>
                      <Input
                        placeholder="e.g., VoIP Priority"
                        value={newRule.name || ''}
                        onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rule Type</Label>
                      <Select
                        value={newRule.type}
                        onValueChange={(v: any) => setNewRule({ ...newRule, type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="device">Device</SelectItem>
                          <SelectItem value="application">Application</SelectItem>
                          <SelectItem value="protocol">Protocol</SelectItem>
                          <SelectItem value="port">Port</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target *</Label>
                      {newRule.type === 'device' && devices.length > 0 ? (
                        <Select
                          value={newRule.target}
                          onValueChange={(v) => setNewRule({ ...newRule, target: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select device" />
                          </SelectTrigger>
                          <SelectContent>
                            {devices.map(device => (
                              <SelectItem key={device.id} value={device.ipAddress}>
                                <span className="flex items-center gap-2">
                                  {DEVICE_ICONS[device.type] || <Network className="h-3.5 w-3.5" />}
                                  {device.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder={
                            newRule.type === 'device' ? "IP Address" :
                            newRule.type === 'application' ? "App name" :
                            newRule.type === 'protocol' ? "HTTP, FTP, etc." :
                            "Port number"
                          }
                          value={newRule.target || ''}
                          onChange={(e) => setNewRule({ ...newRule, target: e.target.value })}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Traffic Class</Label>
                      <Select
                        value={newRule.trafficClass}
                        onValueChange={(v: any) => setNewRule({ ...newRule, trafficClass: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRAFFIC_CLASSES.map(tc => (
                            <SelectItem key={tc.id} value={tc.id}>
                              <span className={tc.color}>{tc.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bandwidth Limit (Mbps)</Label>
                      <Input
                        type="number"
                        value={newRule.bandwidthLimit || ''}
                        onChange={(e) => setNewRule({ ...newRule, bandwidthLimit: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Burst Limit (Mbps)</Label>
                      <Input
                        type="number"
                        value={newRule.burstLimit || ''}
                        onChange={(e) => setNewRule({ ...newRule, burstLimit: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority (1 = Highest, 5 = Lowest)</Label>
                    <Slider
                      value={[newRule.priority || 3]}
                      onValueChange={([v]) => setNewRule({ ...newRule, priority: v as any })}
                      min={1}
                      max={5}
                      step={1}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Critical</span>
                      <span>High</span>
                      <span>Normal</span>
                      <span>Low</span>
                      <span>Best Effort</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t border-border">
                    <Button variant="outline" onClick={() => setIsAddingRule(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addRule}>
                      <Plus className="h-4 w-4 mr-1" />
                      Create Rule
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="allocation" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="allocation">Bandwidth Allocation</TabsTrigger>
            <TabsTrigger value="rules">QoS Rules ({rules.length})</TabsTrigger>
            <TabsTrigger value="priorities">Traffic Priorities</TabsTrigger>
          </TabsList>

          <TabsContent value="allocation" className="space-y-4">
            {/* Total Bandwidth */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Total Network Bandwidth</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={totalBandwidth}
                    onChange={(e) => setTotalBandwidth(parseInt(e.target.value) || 0)}
                    className="w-24 h-8 text-right"
                  />
                  <span className="text-sm text-muted-foreground">Mbps</span>
                </div>
              </div>
              <Progress 
                value={(totalAllocated / 100) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {totalAllocated}% allocated ({(totalBandwidth * totalAllocated / 100).toFixed(0)} Mbps)
              </p>
            </div>

            {/* Allocation Sliders */}
            <div className="space-y-4">
              {allocations.map((alloc) => (
                <div key={alloc.category} className="p-4 rounded-lg bg-secondary/20 border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{alloc.category}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {(totalBandwidth * alloc.allocated / 100).toFixed(0)} Mbps
                      </span>
                      <Badge variant="outline" className="font-mono">
                        {alloc.allocated}%
                      </Badge>
                    </div>
                  </div>
                  <Slider
                    value={[alloc.allocated]}
                    onValueChange={([v]) => updateAllocation(alloc.category, v)}
                    max={100}
                    step={5}
                    className="mb-2"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", alloc.color)} />
                      <span className="text-muted-foreground">
                        Current: {(totalBandwidth * alloc.used / 100).toFixed(0)} Mbps
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      Peak: {(totalBandwidth * alloc.peak / 100).toFixed(0)} Mbps
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            {rules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No QoS rules configured</p>
                <p className="text-sm">Click "Add Rule" to create traffic prioritization rules</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        rule.enabled 
                          ? "bg-secondary/30 border-border/50" 
                          : "bg-muted/30 border-border/30 opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{rule.name}</span>
                            <Badge variant="outline" className={getPriorityBadge(rule.priority)}>
                              P{rule.priority}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {rule.type}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={TRAFFIC_CLASSES.find(t => t.id === rule.trafficClass)?.color}
                            >
                              {rule.trafficClass}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            Target: <span className="font-mono">{rule.target}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              <span>Limit: {rule.bandwidthLimit} Mbps</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              <span>Burst: {rule.burstLimit} Mbps</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              <span>Usage: {rule.currentUsage.toFixed(1)} Mbps</span>
                            </div>
                          </div>
                          <Progress 
                            value={(rule.currentUsage / rule.bandwidthLimit) * 100} 
                            className="h-1.5 mt-2"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={() => toggleRule(rule.id)}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeRule(rule.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="priorities" className="space-y-4">
            <div className="space-y-3">
              {TRAFFIC_CLASSES.map((tc, index) => (
                <div
                  key={tc.id}
                  className="p-4 rounded-lg bg-secondary/30 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold",
                        index === 0 ? "bg-destructive/20 text-destructive" :
                        index === 1 ? "bg-warning/20 text-warning" :
                        index === 2 ? "bg-info/20 text-info" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {tc.priority}
                      </div>
                      <div>
                        <span className={cn("font-medium", tc.color)}>{tc.name}</span>
                        <p className="text-xs text-muted-foreground">{tc.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {index === 0 && <TrendingUp className="h-4 w-4 text-success" />}
                      {index === TRAFFIC_CLASSES.length - 1 && <TrendingDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tc.protocols.map(proto => (
                      <Badge key={proto} variant="outline" className="text-xs">
                        {proto}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BandwidthQoSManager;

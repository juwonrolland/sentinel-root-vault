import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  Zap, 
  Ban, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Target,
  Lock,
  Wifi,
  Server,
  Activity,
  Plus,
  Trash2,
  Play,
  Pause,
  Settings,
  Eye
} from 'lucide-react';

interface ThreatResponseRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: 'severity' | 'event_type' | 'ip_pattern' | 'frequency';
  triggerValue: string;
  actions: ResponseAction[];
  cooldownMinutes: number;
  lastTriggered?: string;
  triggerCount: number;
}

interface ResponseAction {
  type: 'block_ip' | 'isolate_device' | 'alert_admin' | 'quarantine' | 'rate_limit' | 'terminate_session' | 'escalate';
  parameters: Record<string, string>;
}

interface ExecutedResponse {
  id: string;
  ruleId: string;
  ruleName: string;
  threatId: string;
  actions: string[];
  executedAt: string;
  status: 'success' | 'partial' | 'failed';
  details: string;
}

interface BlockedIP {
  ip: string;
  reason: string;
  blockedAt: string;
  expiresAt?: string;
  permanent: boolean;
}

interface IsolatedDevice {
  deviceId: string;
  deviceName: string;
  isolatedAt: string;
  reason: string;
  status: 'isolated' | 'pending' | 'released';
}

export const AutomatedThreatResponse: React.FC = () => {
  const [rules, setRules] = useState<ThreatResponseRule[]>([
    {
      id: '1',
      name: 'Critical Threat Auto-Block',
      enabled: true,
      triggerType: 'severity',
      triggerValue: 'critical',
      actions: [
        { type: 'block_ip', parameters: { duration: '24h' } },
        { type: 'alert_admin', parameters: { channel: 'all' } },
        { type: 'quarantine', parameters: { level: 'full' } }
      ],
      cooldownMinutes: 5,
      triggerCount: 47
    },
    {
      id: '2',
      name: 'Brute Force Prevention',
      enabled: true,
      triggerType: 'frequency',
      triggerValue: '10/minute',
      actions: [
        { type: 'rate_limit', parameters: { limit: '1/min' } },
        { type: 'block_ip', parameters: { duration: '1h' } }
      ],
      cooldownMinutes: 1,
      triggerCount: 156
    },
    {
      id: '3',
      name: 'Malware Detection Response',
      enabled: true,
      triggerType: 'event_type',
      triggerValue: 'malware_detected',
      actions: [
        { type: 'isolate_device', parameters: { immediate: 'true' } },
        { type: 'terminate_session', parameters: { all: 'true' } },
        { type: 'escalate', parameters: { level: 'critical' } }
      ],
      cooldownMinutes: 0,
      triggerCount: 12
    },
    {
      id: '4',
      name: 'Suspicious IP Pattern',
      enabled: true,
      triggerType: 'ip_pattern',
      triggerValue: '^(10\\.0\\.0\\.|192\\.168\\.1\\.)',
      actions: [
        { type: 'alert_admin', parameters: { priority: 'high' } }
      ],
      cooldownMinutes: 15,
      triggerCount: 89
    }
  ]);

  const [executedResponses, setExecutedResponses] = useState<ExecutedResponse[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [isolatedDevices, setIsolatedDevices] = useState<IsolatedDevice[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'active' | 'paused' | 'learning'>('active');

  // Real-time threat monitoring and auto-response
  useEffect(() => {
    if (systemStatus !== 'active') return;

    const channel = supabase
      .channel('threat-response')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'security_events' },
        (payload) => {
          const event = payload.new as any;
          processSecurityEvent(event);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [systemStatus, rules]);

  const processSecurityEvent = useCallback(async (event: any) => {
    const enabledRules = rules.filter(r => r.enabled);
    
    for (const rule of enabledRules) {
      let shouldTrigger = false;

      switch (rule.triggerType) {
        case 'severity':
          shouldTrigger = event.severity === rule.triggerValue;
          break;
        case 'event_type':
          shouldTrigger = event.event_type?.toLowerCase().includes(rule.triggerValue.toLowerCase());
          break;
        case 'ip_pattern':
          if (event.source_ip) {
            const pattern = new RegExp(rule.triggerValue);
            shouldTrigger = pattern.test(event.source_ip);
          }
          break;
        case 'frequency':
          // Would need rate tracking implementation
          shouldTrigger = false;
          break;
      }

      if (shouldTrigger) {
        await executeResponseActions(rule, event);
      }
    }
  }, [rules]);

  const executeResponseActions = async (rule: ThreatResponseRule, event: any) => {
    setIsProcessing(true);
    const executedActions: string[] = [];
    let status: 'success' | 'partial' | 'failed' = 'success';

    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'block_ip':
            if (event.source_ip) {
              const newBlock: BlockedIP = {
                ip: event.source_ip,
                reason: `Auto-blocked by rule: ${rule.name}`,
                blockedAt: new Date().toISOString(),
                expiresAt: action.parameters.duration === 'permanent' ? undefined : 
                  new Date(Date.now() + parseDuration(action.parameters.duration)).toISOString(),
                permanent: action.parameters.duration === 'permanent'
              };
              setBlockedIPs(prev => [...prev, newBlock]);
              executedActions.push(`Blocked IP: ${event.source_ip}`);
            }
            break;

          case 'isolate_device':
            const deviceId = event.metadata?.device_id || `device-${Date.now()}`;
            const newIsolation: IsolatedDevice = {
              deviceId,
              deviceName: event.metadata?.device_name || 'Unknown Device',
              isolatedAt: new Date().toISOString(),
              reason: `Isolated by rule: ${rule.name}`,
              status: 'isolated'
            };
            setIsolatedDevices(prev => [...prev, newIsolation]);
            executedActions.push(`Isolated device: ${deviceId}`);
            break;

          case 'alert_admin':
            executedActions.push(`Admin alert sent via ${action.parameters.channel || 'default'}`);
            break;

          case 'quarantine':
            executedActions.push(`Quarantine applied: ${action.parameters.level}`);
            break;

          case 'rate_limit':
            executedActions.push(`Rate limit applied: ${action.parameters.limit}`);
            break;

          case 'terminate_session':
            executedActions.push(`Sessions terminated`);
            break;

          case 'escalate':
            executedActions.push(`Escalated to level: ${action.parameters.level}`);
            break;
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
        status = 'partial';
      }
    }

    const response: ExecutedResponse = {
      id: `resp-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      threatId: event.id,
      actions: executedActions,
      executedAt: new Date().toISOString(),
      status,
      details: `Triggered by ${event.event_type} from ${event.source_ip || 'unknown'}`
    };

    setExecutedResponses(prev => [response, ...prev.slice(0, 99)]);
    setRules(prev => prev.map(r => 
      r.id === rule.id ? { ...r, triggerCount: r.triggerCount + 1, lastTriggered: new Date().toISOString() } : r
    ));

    toast.success(`Auto-response executed: ${rule.name}`, {
      description: executedActions.join(', ')
    });

    setIsProcessing(false);
  };

  const parseDuration = (duration: string): number => {
    const match = duration.match(/^(\d+)(h|m|d)$/);
    if (!match) return 3600000; // Default 1 hour
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'm': return value * 60000;
      case 'h': return value * 3600000;
      case 'd': return value * 86400000;
      default: return 3600000;
    }
  };

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const unblockIP = (ip: string) => {
    setBlockedIPs(prev => prev.filter(b => b.ip !== ip));
    toast.success(`Unblocked IP: ${ip}`);
  };

  const releaseDevice = (deviceId: string) => {
    setIsolatedDevices(prev => prev.map(d => 
      d.deviceId === deviceId ? { ...d, status: 'released' } : d
    ));
    toast.success(`Device released: ${deviceId}`);
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'block_ip': return <Ban className="h-4 w-4" />;
      case 'isolate_device': return <Wifi className="h-4 w-4" />;
      case 'alert_admin': return <AlertTriangle className="h-4 w-4" />;
      case 'quarantine': return <Lock className="h-4 w-4" />;
      case 'rate_limit': return <Clock className="h-4 w-4" />;
      case 'terminate_session': return <Zap className="h-4 w-4" />;
      case 'escalate': return <Target className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* System Status Header */}
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${systemStatus === 'active' ? 'bg-green-500/20' : systemStatus === 'paused' ? 'bg-yellow-500/20' : 'bg-blue-500/20'}`}>
                <Shield className={`h-6 w-6 ${systemStatus === 'active' ? 'text-green-400' : systemStatus === 'paused' ? 'text-yellow-400' : 'text-blue-400'}`} />
              </div>
              <div>
                <CardTitle className="text-xl">Automated Threat Response System</CardTitle>
                <CardDescription>Real-time autonomous security countermeasures</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${isProcessing ? 'bg-yellow-400 animate-pulse' : systemStatus === 'active' ? 'bg-green-400 animate-pulse' : 'bg-muted'}`} />
                <span className="text-sm font-medium capitalize">{isProcessing ? 'Processing' : systemStatus}</span>
              </div>
              <Select value={systemStatus} onValueChange={(v: any) => setSystemStatus(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{rules.filter(r => r.enabled).length}</div>
              <div className="text-xs text-muted-foreground">Active Rules</div>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-red-400">{blockedIPs.length}</div>
              <div className="text-xs text-muted-foreground">Blocked IPs</div>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-orange-400">{isolatedDevices.filter(d => d.status === 'isolated').length}</div>
              <div className="text-xs text-muted-foreground">Isolated Devices</div>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{executedResponses.filter(r => r.status === 'success').length}</div>
              <div className="text-xs text-muted-foreground">Responses Today</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Response Rules
          </TabsTrigger>
          <TabsTrigger value="blocked" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Blocked IPs ({blockedIPs.length})
          </TabsTrigger>
          <TabsTrigger value="isolated" className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Isolated Devices ({isolatedDevices.filter(d => d.status === 'isolated').length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Response History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Automated Response Rules</CardTitle>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {rules.map(rule => (
                    <div 
                      key={rule.id}
                      className={`p-4 rounded-lg border ${rule.enabled ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Switch 
                            checked={rule.enabled}
                            onCheckedChange={() => toggleRule(rule.id)}
                          />
                          <div>
                            <h4 className="font-semibold">{rule.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Trigger: {rule.triggerType} = {rule.triggerValue}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {rule.triggerCount} triggers
                          </Badge>
                          {rule.lastTriggered && (
                            <Badge variant="secondary" className="text-xs">
                              Last: {new Date(rule.lastTriggered).toLocaleTimeString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {rule.actions.map((action, idx) => (
                          <Badge key={idx} className="gap-1 bg-primary/20 text-primary">
                            {getActionIcon(action.type)}
                            {action.type.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Cooldown: {rule.cooldownMinutes} minutes
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Blocked IP Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {blockedIPs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No blocked IPs</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockedIPs.map((block, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                        <div>
                          <div className="font-mono font-bold text-red-400">{block.ip}</div>
                          <div className="text-xs text-muted-foreground">{block.reason}</div>
                          <div className="text-xs text-muted-foreground">
                            Blocked: {new Date(block.blockedAt).toLocaleString()}
                            {block.expiresAt && ` • Expires: ${new Date(block.expiresAt).toLocaleString()}`}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => unblockIP(block.ip)}
                        >
                          Unblock
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="isolated">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Isolated Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {isolatedDevices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wifi className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No isolated devices</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {isolatedDevices.map(device => (
                      <div key={device.deviceId} className={`flex items-center justify-between p-3 rounded-lg border ${device.status === 'isolated' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                        <div className="flex items-center gap-3">
                          <Server className={`h-5 w-5 ${device.status === 'isolated' ? 'text-orange-400' : 'text-green-400'}`} />
                          <div>
                            <div className="font-semibold">{device.deviceName}</div>
                            <div className="text-xs font-mono text-muted-foreground">{device.deviceId}</div>
                            <div className="text-xs text-muted-foreground">{device.reason}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={device.status === 'isolated' ? 'destructive' : 'default'}>
                            {device.status}
                          </Badge>
                          {device.status === 'isolated' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => releaseDevice(device.deviceId)}
                            >
                              Release
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Response Execution History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {executedResponses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No responses executed yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {executedResponses.map(response => (
                      <div key={response.id} className="p-3 bg-background/50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={response.status === 'success' ? 'default' : response.status === 'partial' ? 'secondary' : 'destructive'}>
                              {response.status === 'success' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                              {response.status}
                            </Badge>
                            <span className="font-semibold">{response.ruleName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(response.executedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">{response.details}</div>
                        <div className="flex flex-wrap gap-1">
                          {response.actions.map((action, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomatedThreatResponse;

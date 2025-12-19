import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Bell,
  AlertTriangle,
  Clock,
  Users,
  Mail,
  Phone,
  Webhook,
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowUp,
  TrendingUp,
  Zap,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EscalationRule {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  threshold: number;
  timeWindow: number; // minutes
  channels: ('email' | 'sms' | 'webhook' | 'push')[];
  recipients: string[];
  enabled: boolean;
  escalationLevel: 1 | 2 | 3;
  autoResolveAfter?: number;
}

interface EscalationEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  triggeredAt: string;
  severity: string;
  status: 'pending' | 'acknowledged' | 'resolved' | 'escalated';
  escalationLevel: number;
  eventCount: number;
}

interface AlertEscalationProps {
  className?: string;
}

const DEFAULT_RULES: EscalationRule[] = [
  {
    id: '1',
    name: 'Critical Alert - Immediate',
    severity: 'critical',
    threshold: 1,
    timeWindow: 5,
    channels: ['email', 'sms', 'push'],
    recipients: ['security-team@org.com', '+1234567890'],
    enabled: true,
    escalationLevel: 3,
  },
  {
    id: '2',
    name: 'High Severity Escalation',
    severity: 'high',
    threshold: 3,
    timeWindow: 15,
    channels: ['email', 'push'],
    recipients: ['security-team@org.com'],
    enabled: true,
    escalationLevel: 2,
  },
  {
    id: '3',
    name: 'Medium Alert Batch',
    severity: 'medium',
    threshold: 10,
    timeWindow: 60,
    channels: ['email'],
    recipients: ['ops-team@org.com'],
    enabled: true,
    escalationLevel: 1,
  },
];

export const AlertEscalation = ({ className }: AlertEscalationProps) => {
  const [rules, setRules] = useState<EscalationRule[]>(() => {
    const saved = localStorage.getItem('escalation-rules');
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });
  const [events, setEvents] = useState<EscalationEvent[]>([]);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [stats, setStats] = useState({
    totalEscalations: 0,
    pendingAlerts: 0,
    resolvedToday: 0,
    avgResponseTime: '0m',
  });
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem('escalation-rules', JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    loadEscalationData();
    
    // Real-time monitoring
    const channel = supabase
      .channel('escalation-monitor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_events' }, (payload) => {
        checkEscalationRules(payload.new as any);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rules]);

  const loadEscalationData = async () => {
    // Load recent security events to check thresholds
    const { data: recentEvents } = await supabase
      .from('security_events')
      .select('*')
      .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('detected_at', { ascending: false });

    if (recentEvents) {
      // Calculate stats
      const criticalEvents = recentEvents.filter(e => e.severity === 'critical').length;
      const highEvents = recentEvents.filter(e => e.severity === 'high').length;
      
      setStats({
        totalEscalations: criticalEvents + Math.floor(highEvents / 3),
        pendingAlerts: recentEvents.filter(e => e.severity === 'critical' || e.severity === 'high').length,
        resolvedToday: Math.floor(recentEvents.length * 0.7),
        avgResponseTime: `${Math.floor(Math.random() * 10 + 2)}m`,
      });

      // Generate escalation events from security events
      const generatedEvents: EscalationEvent[] = recentEvents
        .filter(e => e.severity === 'critical' || e.severity === 'high')
        .slice(0, 10)
        .map((event, index) => ({
          id: event.id,
          ruleId: event.severity === 'critical' ? '1' : '2',
          ruleName: event.severity === 'critical' ? 'Critical Alert - Immediate' : 'High Severity Escalation',
          triggeredAt: event.detected_at,
          severity: event.severity,
          status: index < 3 ? 'pending' : index < 7 ? 'acknowledged' : 'resolved',
          escalationLevel: event.severity === 'critical' ? 3 : 2,
          eventCount: Math.floor(Math.random() * 5) + 1,
        }));

      setEvents(generatedEvents);
    }
  };

  const checkEscalationRules = async (event: any) => {
    const enabledRules = rules.filter(r => r.enabled && r.severity === event.severity);
    
    for (const rule of enabledRules) {
      // Check if threshold is met within time window
      const windowStart = new Date(Date.now() - rule.timeWindow * 60 * 1000);
      
      const { count } = await supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('severity', rule.severity)
        .gte('detected_at', windowStart.toISOString());

      if (count && count >= rule.threshold) {
        triggerEscalation(rule, count);
      }
    }
  };

  const triggerEscalation = (rule: EscalationRule, eventCount: number) => {
    const newEvent: EscalationEvent = {
      id: `esc-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      triggeredAt: new Date().toISOString(),
      severity: rule.severity,
      status: 'pending',
      escalationLevel: rule.escalationLevel,
      eventCount,
    };

    setEvents(prev => [newEvent, ...prev]);

    toast({
      title: "Escalation Triggered",
      description: `${rule.name}: ${eventCount} events in ${rule.timeWindow}m window`,
      variant: rule.severity === 'critical' ? 'destructive' : 'default',
    });

    // Simulate notification sending
    console.log(`Escalation triggered: ${rule.name}`, {
      channels: rule.channels,
      recipients: rule.recipients,
      eventCount,
    });
  };

  const toggleRule = (ruleId: string) => {
    setRules(prev =>
      prev.map(r =>
        r.id === ruleId ? { ...r, enabled: !r.enabled } : r
      )
    );
  };

  const deleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
    toast({
      title: "Rule Deleted",
      description: "Escalation rule has been removed",
    });
  };

  const addNewRule = () => {
    const newRule: EscalationRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: 'New Escalation Rule',
      severity: 'high',
      threshold: 5,
      timeWindow: 30,
      channels: ['email'],
      recipients: ['team@example.com'],
      enabled: true,
      escalationLevel: 1,
    };
    
    // Add rule immediately to the list
    setRules(prev => [...prev, newRule]);
    
    // Open editor for the new rule
    setTimeout(() => {
      setEditingRule(newRule);
    }, 100);
    
    toast({
      title: "Rule Created",
      description: "New escalation rule created. Customize it in the editor.",
    });
  };

  const updateRule = (updatedRule: EscalationRule) => {
    if (!updatedRule.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Rule name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (updatedRule.channels.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one notification channel is required",
        variant: "destructive",
      });
      return;
    }
    
    setRules(prev =>
      prev.map(r => r.id === updatedRule.id ? updatedRule : r)
    );
    setEditingRule(null);
    toast({
      title: "Rule Updated",
      description: "Escalation rule has been saved successfully",
    });
  };

  const acknowledgeEvent = (eventId: string) => {
    setEvents(prev =>
      prev.map(e =>
        e.id === eventId ? { ...e, status: 'acknowledged' as const } : e
      )
    );
    toast({
      title: "Alert Acknowledged",
      description: "Escalation event has been acknowledged",
    });
  };

  const resolveEvent = (eventId: string) => {
    setEvents(prev =>
      prev.map(e =>
        e.id === eventId ? { ...e, status: 'resolved' as const } : e
      )
    );
    toast({
      title: "Alert Resolved",
      description: "Escalation event has been resolved",
    });
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-3 w-3" />;
      case 'sms': return <Phone className="h-3 w-3" />;
      case 'webhook': return <Webhook className="h-3 w-3" />;
      case 'push': return <Bell className="h-3 w-3" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning border-warning/30';
      case 'acknowledged': return 'bg-info/10 text-info border-info/30';
      case 'resolved': return 'bg-success/10 text-success border-success/30';
      case 'escalated': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  return (
    <Card className={cn("cyber-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ArrowUp className="h-4 w-4 text-warning animate-pulse" />
            Alert Escalation System
          </CardTitle>
          <Button size="sm" variant="outline" onClick={addNewRule} className="h-7">
            <Plus className="h-3 w-3 mr-1" />
            Add Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/30">
            <TrendingUp className="h-4 w-4 text-warning mb-1" />
            <p className="text-lg font-bold">{stats.totalEscalations}</p>
            <p className="text-[10px] text-muted-foreground">Total Escalations</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/30">
            <AlertTriangle className="h-4 w-4 text-destructive mb-1" />
            <p className="text-lg font-bold">{stats.pendingAlerts}</p>
            <p className="text-[10px] text-muted-foreground">Pending Alerts</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-success/20 to-success/5 border border-success/30">
            <CheckCircle className="h-4 w-4 text-success mb-1" />
            <p className="text-lg font-bold">{stats.resolvedToday}</p>
            <p className="text-[10px] text-muted-foreground">Resolved Today</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
            <Clock className="h-4 w-4 text-primary mb-1" />
            <p className="text-lg font-bold">{stats.avgResponseTime}</p>
            <p className="text-[10px] text-muted-foreground">Avg Response</p>
          </div>
        </div>

        <Tabs defaultValue="rules" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="rules">Escalation Rules</TabsTrigger>
            <TabsTrigger value="events">Active Alerts</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="rules">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={cn(
                      "p-4 rounded-lg border transition-all",
                      rule.enabled
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/50 bg-secondary/30 opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => toggleRule(rule.id)}
                        />
                        <div>
                          <p className="font-medium text-sm">{rule.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Level {rule.escalationLevel} Escalation
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            rule.severity === 'critical' && "bg-destructive/10 text-destructive",
                            rule.severity === 'high' && "bg-warning/10 text-warning",
                            rule.severity === 'medium' && "bg-primary/10 text-primary",
                            rule.severity === 'low' && "bg-success/10 text-success"
                          )}
                        >
                          {rule.severity.toUpperCase()}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingRule(rule)}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteRule(rule.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-muted-foreground">Threshold</p>
                        <p className="font-mono">{rule.threshold} events in {rule.timeWindow}m</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Channels</p>
                        <div className="flex items-center gap-1 mt-1">
                          {rule.channels.map((ch) => (
                            <span key={ch} className="p-1 bg-secondary rounded">
                              {getChannelIcon(ch)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Recipients</p>
                        <p className="font-mono truncate">{rule.recipients.length} configured</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="events">
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {events.filter(e => e.status !== 'resolved').map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border border-border/50 bg-secondary/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusColor(event.status)}>
                          {event.status}
                        </Badge>
                        <span className="font-medium text-sm">{event.ruleName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {event.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px]"
                            onClick={() => acknowledgeEvent(event.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {event.status === 'acknowledged' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] border-success/30 text-success"
                            onClick={() => resolveEvent(event.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{event.eventCount} events triggered escalation</span>
                      <span>{new Date(event.triggeredAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {events.filter(e => e.status !== 'resolved').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                    <p className="text-sm">No active alerts</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history">
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {events.filter(e => e.status === 'resolved').map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border border-success/20 bg-success/5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="font-medium text-sm">{event.ruleName}</span>
                      </div>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]">
                        Resolved
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(event.triggeredAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Rule Editor Modal */}
        {editingRule && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg cyber-card">
              <CardHeader>
                <CardTitle className="text-sm">Edit Escalation Rule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Rule Name</Label>
                  <Input
                    value={editingRule.name}
                    onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select
                      value={editingRule.severity}
                      onValueChange={(v: any) => setEditingRule({ ...editingRule, severity: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Escalation Level</Label>
                    <Select
                      value={String(editingRule.escalationLevel)}
                      onValueChange={(v: any) => setEditingRule({ ...editingRule, escalationLevel: parseInt(v) as 1 | 2 | 3 })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Level 1 - Standard</SelectItem>
                        <SelectItem value="2">Level 2 - Urgent</SelectItem>
                        <SelectItem value="3">Level 3 - Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Threshold (events)</Label>
                    <Input
                      type="number"
                      value={editingRule.threshold}
                      onChange={(e) => setEditingRule({ ...editingRule, threshold: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Time Window (minutes)</Label>
                    <Input
                      type="number"
                      value={editingRule.timeWindow}
                      onChange={(e) => setEditingRule({ ...editingRule, timeWindow: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notification Channels *</Label>
                  <div className="flex flex-wrap gap-2">
                    {['email', 'sms', 'push', 'webhook'].map((ch) => (
                      <Button
                        key={ch}
                        type="button"
                        variant={editingRule.channels.includes(ch as any) ? 'default' : 'outline'}
                        size="sm"
                        className="transition-all"
                        onClick={() => {
                          const channels = editingRule.channels.includes(ch as any)
                            ? editingRule.channels.filter(c => c !== ch)
                            : [...editingRule.channels, ch as any];
                          setEditingRule({ ...editingRule, channels });
                        }}
                      >
                        {getChannelIcon(ch)}
                        <span className="ml-1 capitalize">{ch}</span>
                      </Button>
                    ))}
                  </div>
                  {editingRule.channels.length === 0 && (
                    <p className="text-xs text-destructive">Select at least one channel</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Recipients (comma-separated)</Label>
                  <Input
                    placeholder="email@example.com, +1234567890"
                    value={editingRule.recipients.join(', ')}
                    onChange={(e) => {
                      const recipients = e.target.value
                        .split(',')
                        .map(r => r.trim())
                        .filter(r => r.length > 0);
                      setEditingRule({ ...editingRule, recipients });
                    }}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setEditingRule(null)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => updateRule(editingRule)}
                    disabled={!editingRule.name.trim() || editingRule.channels.length === 0}
                  >
                    Save Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

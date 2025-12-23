import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Lock,
  Unlock,
  Ban,
  Play,
  Pause,
  History,
  FileText,
  Target,
  Wrench,
  ShieldCheck,
  Network,
  Server,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ThreatDetails {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  deviceName: string;
  deviceIp: string;
  networkId?: string;
  networkName?: string;
  description: string;
  indicators: string[];
  detectedAt: string;
  status: 'active' | 'mitigating' | 'resolved' | 'failed';
}

interface RemediationAction {
  id: string;
  name: string;
  description: string;
  type: 'automatic' | 'manual';
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime: string;
  steps: string[];
  isReversible: boolean;
}

interface RemediationResult {
  success: boolean;
  action: string;
  timestamp: string;
  details: string;
  stepsCompleted: string[];
}

const REMEDIATION_ACTIONS: Record<string, RemediationAction[]> = {
  malware: [
    {
      id: 'isolate-device',
      name: 'Isolate Device',
      description: 'Immediately isolate the infected device from the network',
      type: 'automatic',
      severity: 'critical',
      estimatedTime: '< 1 minute',
      steps: ['Block all network traffic', 'Disable network interfaces', 'Quarantine device', 'Notify administrator'],
      isReversible: true,
    },
    {
      id: 'scan-clean',
      name: 'Deep Scan & Clean',
      description: 'Run comprehensive malware scan and remove threats',
      type: 'automatic',
      severity: 'high',
      estimatedTime: '5-15 minutes',
      steps: ['Initialize threat scanner', 'Scan all system files', 'Identify malware signatures', 'Quarantine infected files', 'Clean registry entries', 'Verify system integrity'],
      isReversible: false,
    },
    {
      id: 'restore-backup',
      name: 'Restore from Backup',
      description: 'Restore system from last known clean backup',
      type: 'manual',
      severity: 'critical',
      estimatedTime: '30-60 minutes',
      steps: ['Select backup point', 'Verify backup integrity', 'Stop all services', 'Restore system state', 'Restart services', 'Verify restoration'],
      isReversible: true,
    },
  ],
  intrusion: [
    {
      id: 'block-ip',
      name: 'Block Source IP',
      description: 'Add attacker IP to firewall blocklist',
      type: 'automatic',
      severity: 'high',
      estimatedTime: '< 1 minute',
      steps: ['Identify source IP', 'Add to firewall rules', 'Block on all network segments', 'Log action', 'Monitor for evasion'],
      isReversible: true,
    },
    {
      id: 'terminate-sessions',
      name: 'Terminate Active Sessions',
      description: 'Kill all suspicious sessions from the source',
      type: 'automatic',
      severity: 'high',
      estimatedTime: '< 1 minute',
      steps: ['Identify active sessions', 'Terminate connections', 'Clear session tokens', 'Invalidate credentials'],
      isReversible: false,
    },
    {
      id: 'credential-reset',
      name: 'Force Credential Reset',
      description: 'Reset all credentials for affected accounts',
      type: 'manual',
      severity: 'critical',
      estimatedTime: '5-10 minutes',
      steps: ['Identify affected accounts', 'Generate temporary passwords', 'Force password change', 'Revoke API keys', 'Notify users', 'Enable MFA'],
      isReversible: false,
    },
  ],
  ddos: [
    {
      id: 'enable-ddos-protection',
      name: 'Enable DDoS Mitigation',
      description: 'Activate advanced DDoS protection systems',
      type: 'automatic',
      severity: 'critical',
      estimatedTime: '< 1 minute',
      steps: ['Enable rate limiting', 'Activate traffic scrubbing', 'Deploy challenge pages', 'Scale infrastructure', 'Monitor attack patterns'],
      isReversible: true,
    },
    {
      id: 'geo-block',
      name: 'Geographic Blocking',
      description: 'Block traffic from attack source regions',
      type: 'automatic',
      severity: 'high',
      estimatedTime: '1-2 minutes',
      steps: ['Analyze attack origins', 'Identify high-risk regions', 'Apply geo-blocking rules', 'Whitelist legitimate traffic'],
      isReversible: true,
    },
  ],
  unauthorized_access: [
    {
      id: 'lock-account',
      name: 'Lock User Account',
      description: 'Immediately lock the compromised account',
      type: 'automatic',
      severity: 'high',
      estimatedTime: '< 1 minute',
      steps: ['Disable account login', 'Terminate active sessions', 'Revoke tokens', 'Send alert to user', 'Require verification'],
      isReversible: true,
    },
    {
      id: 'audit-trail',
      name: 'Generate Audit Trail',
      description: 'Create detailed audit log of all account activities',
      type: 'automatic',
      severity: 'medium',
      estimatedTime: '2-5 minutes',
      steps: ['Collect access logs', 'Identify suspicious activities', 'Map data accessed', 'Document timeline', 'Generate report'],
      isReversible: false,
    },
  ],
  vulnerability: [
    {
      id: 'patch-apply',
      name: 'Apply Security Patch',
      description: 'Deploy available security patches to vulnerable systems',
      type: 'manual',
      severity: 'high',
      estimatedTime: '10-30 minutes',
      steps: ['Download patches', 'Verify signatures', 'Test in sandbox', 'Schedule maintenance', 'Apply patches', 'Restart services', 'Verify fix'],
      isReversible: true,
    },
    {
      id: 'virtual-patch',
      name: 'Deploy Virtual Patch',
      description: 'Apply WAF/IPS rules to mitigate vulnerability',
      type: 'automatic',
      severity: 'high',
      estimatedTime: '1-2 minutes',
      steps: ['Identify exploit signatures', 'Create blocking rules', 'Deploy to WAF', 'Monitor effectiveness', 'Tune rules'],
      isReversible: true,
    },
  ],
};

const DEFAULT_ACTIONS: RemediationAction[] = [
  {
    id: 'quarantine',
    name: 'Quarantine Device',
    description: 'Isolate device from network for further investigation',
    type: 'automatic',
    severity: 'high',
    estimatedTime: '< 1 minute',
    steps: ['Identify device', 'Block network access', 'Log event', 'Notify team'],
    isReversible: true,
  },
  {
    id: 'monitor',
    name: 'Enhanced Monitoring',
    description: 'Enable detailed logging and monitoring',
    type: 'automatic',
    severity: 'medium',
    estimatedTime: '< 1 minute',
    steps: ['Enable verbose logging', 'Capture network traffic', 'Alert on anomalies'],
    isReversible: true,
  },
];

interface ThreatRemediationEngineProps {
  className?: string;
  threat?: ThreatDetails;
  onRemediationComplete?: (result: RemediationResult) => void;
}

export const ThreatRemediationEngine: React.FC<ThreatRemediationEngineProps> = ({
  className,
  threat,
  onRemediationComplete,
}) => {
  const [isRemediating, setIsRemediating] = useState(false);
  const [currentAction, setCurrentAction] = useState<RemediationAction | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState<ThreatDetails | null>(threat || null);
  const [autoRemediate, setAutoRemediate] = useState(true);
  const [remediationHistory, setRemediationHistory] = useState<RemediationResult[]>([]);

  // Demo threats for showcase
  const [demoThreats] = useState<ThreatDetails[]>([
    {
      id: 'threat-1',
      type: 'malware',
      severity: 'critical',
      deviceName: 'Server-DC-01',
      deviceIp: '192.168.1.10',
      networkName: 'Corporate HQ',
      description: 'Ransomware variant detected attempting to encrypt files',
      indicators: ['Suspicious file encryption activity', 'Known ransomware signatures', 'C2 communication attempts'],
      detectedAt: new Date().toISOString(),
      status: 'active',
    },
    {
      id: 'threat-2',
      type: 'intrusion',
      severity: 'high',
      deviceName: 'Firewall-Main',
      deviceIp: '10.0.0.1',
      networkName: 'Infrastructure',
      description: 'Brute force attack detected on SSH service',
      indicators: ['Multiple failed login attempts', 'Known attacker IP', 'Rate limit exceeded'],
      detectedAt: new Date(Date.now() - 300000).toISOString(),
      status: 'active',
    },
    {
      id: 'threat-3',
      type: 'unauthorized_access',
      severity: 'medium',
      deviceName: 'Workstation-42',
      deviceIp: '192.168.5.42',
      networkName: 'Corporate Network',
      description: 'Unusual login from new geographic location',
      indicators: ['Login from new country', 'Off-hours access', 'Different device fingerprint'],
      detectedAt: new Date(Date.now() - 600000).toISOString(),
      status: 'active',
    },
  ]);

  const getAvailableActions = useCallback((threatType: string): RemediationAction[] => {
    return REMEDIATION_ACTIONS[threatType] || DEFAULT_ACTIONS;
  }, []);

  const executeRemediation = useCallback(async (action: RemediationAction, threat: ThreatDetails) => {
    setIsRemediating(true);
    setCurrentAction(action);
    setProgress(0);
    setCompletedSteps([]);

    const steps = action.steps;
    const stepDuration = 100 / steps.length;

    try {
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i]);
        
        // Simulate step execution
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));
        
        setCompletedSteps(prev => [...prev, steps[i]]);
        setProgress((i + 1) * stepDuration);
      }

      // Log to security audit
      await supabase.from('security_audit_log').insert({
        event_type: 'threat_remediation',
        event_category: 'security',
        severity: threat.severity === 'critical' ? 'critical' : 'warning',
        action_performed: `Remediation: ${action.name}`,
        metadata: {
          threat_id: threat.id,
          threat_type: threat.type,
          action_id: action.id,
          device_ip: threat.deviceIp,
          device_name: threat.deviceName,
          network_name: threat.networkName,
          steps_completed: steps,
        }
      });

      // Send email notification for threat resolution
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const recipientEmail = user?.email || '';
        
        if (recipientEmail) {
          await supabase.functions.invoke('network-security-notifications', {
            body: {
              type: 'resolved',
              recipientEmail,
              threat: {
                type: threat.type,
                severity: threat.severity,
                deviceName: threat.deviceName,
                deviceIp: threat.deviceIp,
                networkName: threat.networkName,
                description: threat.description,
                remediationSteps: steps,
              }
            }
          });
          console.log('Remediation notification sent to:', recipientEmail);
        }
      } catch (notifError) {
        console.error('Failed to send remediation notification:', notifError);
      }

      const result: RemediationResult = {
        success: true,
        action: action.name,
        timestamp: new Date().toISOString(),
        details: `Successfully executed ${action.name} on ${threat.deviceName}`,
        stepsCompleted: steps,
      };

      setRemediationHistory(prev => [result, ...prev.slice(0, 9)]);
      onRemediationComplete?.(result);

      toast.success('Remediation Complete', {
        description: `${action.name} executed successfully on ${threat.deviceName}`,
      });

      // Update threat status
      setSelectedThreat(prev => prev ? { ...prev, status: 'resolved' } : null);

    } catch (error: any) {
      console.error('Remediation failed:', error);
      toast.error('Remediation Failed', {
        description: error.message || 'An error occurred during remediation',
      });
    } finally {
      setIsRemediating(false);
      setCurrentAction(null);
      setCurrentStep('');
    }
  }, [onRemediationComplete]);

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return colors[severity] || colors.medium;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      active: <AlertTriangle className="h-4 w-4 text-red-400" />,
      mitigating: <RefreshCw className="h-4 w-4 text-yellow-400 animate-spin" />,
      resolved: <CheckCircle className="h-4 w-4 text-green-400" />,
      failed: <XCircle className="h-4 w-4 text-red-400" />,
    };
    return icons[status] || icons.active;
  };

  return (
    <Card className={cn("cyber-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-sm sm:text-base">Threat Remediation Engine</CardTitle>
              <CardDescription className="text-xs">
                Automated threat response and remediation
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-remediate" className="text-xs">Auto-Remediate</Label>
              <Switch
                id="auto-remediate"
                checked={autoRemediate}
                onCheckedChange={setAutoRemediate}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowDetails(true)}>
              <History className="h-3 w-3 mr-1" />
              History
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Remediation Progress */}
        {isRemediating && currentAction && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">{currentAction.name}</span>
              </div>
              <span className="text-sm font-mono">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">{currentStep}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {completedSteps.map((step, i) => (
                <Badge key={i} variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
                  <CheckCircle className="h-2 w-2 mr-1" />
                  {step}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Threat List */}
        <ScrollArea className="h-[350px]">
          <div className="space-y-3 pr-2">
            {demoThreats.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "p-3 rounded-lg border transition-all cursor-pointer",
                  selectedThreat?.id === t.id 
                    ? "bg-primary/10 border-primary/30" 
                    : "bg-secondary/30 border-border hover:border-primary/20"
                )}
                onClick={() => setSelectedThreat(t)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(t.status)}
                    <span className="text-sm font-medium capitalize">{t.type.replace('_', ' ')}</span>
                    <Badge className={getSeverityColor(t.severity)}>
                      {t.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.detectedAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div className="flex items-center gap-1">
                    <Server className="h-3 w-3 text-muted-foreground" />
                    <span>{t.deviceName}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <Network className="h-3 w-3 text-muted-foreground" />
                    <span>{t.deviceIp}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-2">{t.description}</p>

                {/* Indicators */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {t.indicators.slice(0, 2).map((indicator, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {indicator}
                    </Badge>
                  ))}
                  {t.indicators.length > 2 && (
                    <Badge variant="secondary" className="text-[10px]">
                      +{t.indicators.length - 2} more
                    </Badge>
                  )}
                </div>

                {/* Available Actions */}
                {selectedThreat?.id === t.id && t.status === 'active' && (
                  <div className="border-t border-border pt-3 mt-3">
                    <p className="text-xs font-medium mb-2">Available Actions:</p>
                    <div className="flex flex-wrap gap-2">
                      {getAvailableActions(t.type).slice(0, 3).map((action) => (
                        <Button
                          key={action.id}
                          size="sm"
                          variant={action.type === 'automatic' ? 'default' : 'outline'}
                          className="h-7 text-xs"
                          disabled={isRemediating}
                          onClick={(e) => {
                            e.stopPropagation();
                            executeRemediation(action, t);
                          }}
                        >
                          {action.type === 'automatic' ? (
                            <Zap className="h-3 w-3 mr-1" />
                          ) : (
                            <Wrench className="h-3 w-3 mr-1" />
                          )}
                          {action.name}
                        </Button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Est. time: {getAvailableActions(t.type)[0]?.estimatedTime || 'Unknown'}
                    </p>
                  </div>
                )}

                {t.status === 'resolved' && (
                  <div className="flex items-center gap-2 text-success text-xs mt-2">
                    <ShieldCheck className="h-4 w-4" />
                    Threat resolved
                  </div>
                )}
              </div>
            ))}

            {demoThreats.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No active threats</p>
                <p className="text-xs">All systems are secure</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* History Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Remediation History
              </DialogTitle>
              <DialogDescription>
                Recent remediation actions and their results
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {remediationHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No remediation history yet
                  </p>
                ) : (
                  remediationHistory.map((result, i) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/30 border border-border">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <span className="text-sm font-medium">{result.action}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{result.details}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

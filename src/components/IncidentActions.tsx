import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Ban, 
  AlertOctagon, 
  Lock, 
  RefreshCw,
  Network,
  Database,
  Server,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IncidentActionsProps {
  incidentId: string;
  severity: string;
  onActionExecuted: (action: string) => void;
}

const responseActions = [
  {
    id: 'isolate_network',
    name: 'Isolate Network Segment',
    description: 'Quarantine affected network segment to prevent lateral movement',
    icon: Network,
    severity: ['high', 'critical'],
    category: 'containment'
  },
  {
    id: 'block_ip',
    name: 'Block Source IP',
    description: 'Add source IP to firewall blocklist',
    icon: Ban,
    severity: ['medium', 'high', 'critical'],
    category: 'containment'
  },
  {
    id: 'revoke_sessions',
    name: 'Revoke Active Sessions',
    description: 'Terminate all active sessions for affected accounts',
    icon: Lock,
    severity: ['medium', 'high', 'critical'],
    category: 'containment'
  },
  {
    id: 'snapshot_systems',
    name: 'Capture System Snapshot',
    description: 'Create forensic snapshot of affected systems',
    icon: Database,
    severity: ['high', 'critical'],
    category: 'investigation'
  },
  {
    id: 'enable_enhanced_logging',
    name: 'Enable Enhanced Logging',
    description: 'Activate detailed logging for affected systems',
    icon: Server,
    severity: ['low', 'medium', 'high', 'critical'],
    category: 'investigation'
  },
  {
    id: 'deploy_countermeasures',
    name: 'Deploy Countermeasures',
    description: 'Activate automated threat response protocols',
    icon: Shield,
    severity: ['high', 'critical'],
    category: 'response'
  },
  {
    id: 'emergency_lockdown',
    name: 'Emergency Lockdown',
    description: 'Initiate full system lockdown protocol',
    icon: AlertOctagon,
    severity: ['critical'],
    category: 'response'
  },
  {
    id: 'system_restore',
    name: 'Initiate System Restore',
    description: 'Begin restoration from clean backup',
    icon: RefreshCw,
    severity: ['high', 'critical'],
    category: 'recovery'
  },
];

const IncidentActions = ({ incidentId, severity, onActionExecuted }: IncidentActionsProps) => {
  const { toast } = useToast();
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [executedActions, setExecutedActions] = useState<Set<string>>(new Set());

  const availableActions = responseActions.filter(action => 
    action.severity.includes(severity)
  );

  const handleExecuteAction = async (action: typeof responseActions[0]) => {
    setExecutingAction(action.id);
    
    // Simulate action execution
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setExecutedActions(prev => new Set(prev).add(action.id));
    setExecutingAction(null);
    
    onActionExecuted(action.name);
    
    toast({
      title: "Action Executed",
      description: `${action.name} has been successfully executed`,
    });
  };

  const groupedActions = {
    containment: availableActions.filter(a => a.category === 'containment'),
    investigation: availableActions.filter(a => a.category === 'investigation'),
    response: availableActions.filter(a => a.category === 'response'),
    recovery: availableActions.filter(a => a.category === 'recovery'),
  };

  const categoryLabels = {
    containment: 'Containment Actions',
    investigation: 'Investigation Actions',
    response: 'Response Actions',
    recovery: 'Recovery Actions',
  };

  const categoryColors = {
    containment: 'border-l-warning',
    investigation: 'border-l-accent',
    response: 'border-l-destructive',
    recovery: 'border-l-success',
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedActions).map(([category, actions]) => {
        if (actions.length === 0) return null;
        
        return (
          <Card key={category} className={`border-l-4 ${categoryColors[category as keyof typeof categoryColors]}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {actions.map((action) => {
                const Icon = action.icon;
                const isExecuting = executingAction === action.id;
                const isExecuted = executedActions.has(action.id);
                
                return (
                  <div
                    key={action.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isExecuted 
                        ? 'bg-success/10 border-success/30' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isExecuted ? 'bg-success/20' : 'bg-primary/10'
                      }`}>
                        {isExecuted ? (
                          <Check className="h-5 w-5 text-success" />
                        ) : (
                          <Icon className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{action.name}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant={isExecuted ? "outline" : "default"}
                      disabled={isExecuting || isExecuted}
                      onClick={() => handleExecuteAction(action)}
                      className="min-w-[100px]"
                    >
                      {isExecuting ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : isExecuted ? (
                        'Executed'
                      ) : (
                        'Execute'
                      )}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {availableActions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No response actions available for this severity level</p>
        </div>
      )}
    </div>
  );
};

export default IncidentActions;

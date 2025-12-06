import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bot, Shield, Zap, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface AutomatedIncidentCreatorProps {
  enabled?: boolean;
  onIncidentCreated?: (incident: unknown) => void;
}

export const AutomatedIncidentCreator = ({ 
  enabled = true,
  onIncidentCreated 
}: AutomatedIncidentCreatorProps) => {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    eventsProcessed: 0,
    incidentsCreated: 0,
    lastProcessed: null as Date | null
  });
  const { toast } = useToast();

  useEffect(() => {
    if (!isEnabled) return;

    // Subscribe to new security events
    const channel = supabase
      .channel('auto-incident-creator')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_events'
        },
        async (payload) => {
          const event = payload.new as {
            id: string;
            event_type: string;
            severity: string;
            description: string;
            source_ip?: string;
            metadata?: Record<string, unknown>;
            detected_at: string;
          };

          // Only auto-process critical and high severity events
          if (event.severity === 'critical' || event.severity === 'high') {
            await processSecurityEvent(event);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isEnabled]);

  const processSecurityEvent = async (event: {
    id: string;
    event_type: string;
    severity: string;
    description: string;
    source_ip?: string;
    metadata?: Record<string, unknown>;
    detected_at: string;
  }) => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('auto-classify-threat', {
        body: { event }
      });

      if (error) throw error;

      setStats(prev => ({
        eventsProcessed: prev.eventsProcessed + 1,
        incidentsCreated: data.incident_created ? prev.incidentsCreated + 1 : prev.incidentsCreated,
        lastProcessed: new Date()
      }));

      if (data.incident_created) {
        toast({
          title: "Incident Auto-Created",
          description: `AI classified ${event.event_type} and created incident`,
        });
        onIncidentCreated?.(data);
      }

    } catch (error) {
      console.error('Auto-classification failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="cyber-card border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            AI Incident Automation
          </CardTitle>
          <div className="flex items-center gap-2">
            {isProcessing && (
              <Badge variant="outline" className="bg-primary/10 animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Processing
              </Badge>
            )}
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 text-center">
            <Zap className="h-4 w-4 mx-auto mb-1 text-info" />
            <p className="text-lg font-bold text-foreground">{stats.eventsProcessed}</p>
            <p className="text-[10px] text-muted-foreground">Events Processed</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-warning" />
            <p className="text-lg font-bold text-foreground">{stats.incidentsCreated}</p>
            <p className="text-[10px] text-muted-foreground">Incidents Created</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 text-center">
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-success" />
            <p className="text-lg font-bold text-foreground">
              {isEnabled ? 'ON' : 'OFF'}
            </p>
            <p className="text-[10px] text-muted-foreground">Auto-Response</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Auto-creates incidents for critical/high severity events</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bot className="h-3 w-3" />
            <span>AI-powered threat classification using MITRE ATT&CK</span>
          </div>
        </div>

        {stats.lastProcessed && (
          <p className="text-[10px] text-muted-foreground text-right">
            Last processed: {stats.lastProcessed.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

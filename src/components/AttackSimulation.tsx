import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Zap, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface Attack {
  id: string;
  type: string;
  source: string;
  target: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'incoming' | 'blocked' | 'mitigated' | 'analyzing';
  progress: number;
  timestamp: Date;
}

interface DefenseMetrics {
  attacksBlocked: number;
  attacksMitigated: number;
  threatLevel: number;
  uptime: number;
  nodesActive: number;
}

const attackTypes = [
  'DDoS Layer 4 TCP SYN Flood',
  'DDoS Layer 4 UDP Flood',
  'Layer 7 HTTP Flood',
  'DNS Amplification',
  'ICMP Flood',
  'Slowloris Attack',
  'NTP Amplification',
  'SSDP Reflection',
  'Memcached Amplification',
  'SYN-ACK Reflection'
];

const generateRandomIP = () => {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
};

const generateAttack = (): Attack => ({
  id: crypto.randomUUID(),
  type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
  source: generateRandomIP(),
  target: `Node-${Math.floor(Math.random() * 100)}`,
  severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as Attack['severity'],
  status: 'incoming',
  progress: 0,
  timestamp: new Date()
});

export const AttackSimulation: React.FC = () => {
  const [isRunning, setIsRunning] = useState(true);
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [metrics, setMetrics] = useState<DefenseMetrics>({
    attacksBlocked: 0,
    attacksMitigated: 0,
    threatLevel: 15,
    uptime: 99.99,
    nodesActive: 47
  });

  const processAttack = useCallback((attack: Attack): Attack => {
    if (attack.progress >= 100) {
      const outcome = Math.random();
      if (outcome > 0.3) {
        return { ...attack, status: 'blocked', progress: 100 };
      } else if (outcome > 0.1) {
        return { ...attack, status: 'mitigated', progress: 100 };
      }
      return { ...attack, status: 'analyzing', progress: 100 };
    }
    return { ...attack, progress: attack.progress + Math.random() * 15 + 5 };
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const attackInterval = setInterval(() => {
      if (Math.random() > 0.4) {
        setAttacks(prev => [...prev.slice(-9), generateAttack()]);
      }
    }, 2000);

    const processInterval = setInterval(() => {
      setAttacks(prev => {
        const updated = prev.map(processAttack);
        
        const newBlocked = updated.filter(a => a.status === 'blocked' && prev.find(p => p.id === a.id)?.status !== 'blocked').length;
        const newMitigated = updated.filter(a => a.status === 'mitigated' && prev.find(p => p.id === a.id)?.status !== 'mitigated').length;
        
        if (newBlocked > 0 || newMitigated > 0) {
          setMetrics(m => ({
            ...m,
            attacksBlocked: m.attacksBlocked + newBlocked,
            attacksMitigated: m.attacksMitigated + newMitigated,
            threatLevel: Math.max(5, Math.min(95, m.threatLevel + (Math.random() * 10 - 5)))
          }));
        }
        
        return updated.filter(a => a.progress < 100 || Date.now() - a.timestamp.getTime() < 5000);
      });
    }, 300);

    return () => {
      clearInterval(attackInterval);
      clearInterval(processInterval);
    };
  }, [isRunning, processAttack]);

  const getSeverityColor = (severity: Attack['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'high': return 'bg-warning/20 text-warning border-warning/30';
      case 'medium': return 'bg-info/20 text-info border-info/30';
      default: return 'bg-success/20 text-success border-success/30';
    }
  };

  const getStatusIcon = (status: Attack['status']) => {
    switch (status) {
      case 'blocked': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'mitigated': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'analyzing': return <Activity className="h-4 w-4 text-info animate-pulse" />;
      default: return <AlertTriangle className="h-4 w-4 text-warning animate-pulse" />;
    }
  };

  const reset = () => {
    setAttacks([]);
    setMetrics({
      attacksBlocked: 0,
      attacksMitigated: 0,
      threatLevel: 15,
      uptime: 99.99,
      nodesActive: 47
    });
  };

  return (
    <Card className="cyber-card border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Real-Time Attack Simulation
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRunning(!isRunning)}
              className="border-primary/30 hover:bg-primary/10"
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="border-primary/30 hover:bg-primary/10"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Defense Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="text-2xl font-bold text-success">{metrics.attacksBlocked}</div>
            <div className="text-xs text-muted-foreground">Attacks Blocked</div>
          </div>
          <div className="p-3 rounded-lg bg-info/10 border border-info/20">
            <div className="text-2xl font-bold text-info">{metrics.attacksMitigated}</div>
            <div className="text-xs text-muted-foreground">Mitigated</div>
          </div>
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <div className="text-2xl font-bold text-warning">{metrics.threatLevel.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Threat Level</div>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="text-2xl font-bold text-primary">{metrics.nodesActive}</div>
            <div className="text-xs text-muted-foreground">Active Nodes</div>
          </div>
        </div>

        {/* Attack Feed */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {attacks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No active attacks - System secure</p>
            </div>
          ) : (
            attacks.map((attack) => (
              <div
                key={attack.id}
                className="p-3 rounded-lg bg-card/50 border border-border/50 animate-fade-in"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(attack.status)}
                    <span className="text-sm font-medium truncate max-w-[200px]">{attack.type}</span>
                  </div>
                  <Badge variant="outline" className={getSeverityColor(attack.severity)}>
                    {attack.severity}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>From: {attack.source}</span>
                  <span>Target: {attack.target}</span>
                </div>
                <Progress 
                  value={Math.min(attack.progress, 100)} 
                  className="h-1.5"
                />
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className={attack.status === 'blocked' ? 'text-success' : attack.status === 'mitigated' ? 'text-info' : 'text-warning'}>
                    {attack.status === 'blocked' ? 'BLOCKED' : attack.status === 'mitigated' ? 'MITIGATED' : attack.status === 'analyzing' ? 'ANALYZING' : 'DEFENDING'}
                  </span>
                  <span className="text-muted-foreground">{Math.min(attack.progress, 100).toFixed(0)}%</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Live Indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className={`h-2 w-2 rounded-full ${isRunning ? 'bg-success animate-pulse' : 'bg-muted'}`} />
          <span>{isRunning ? 'Live simulation active' : 'Simulation paused'}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttackSimulation;

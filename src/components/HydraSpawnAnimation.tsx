import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Shield, Server, GitBranch, Activity, Target } from 'lucide-react';

interface HydraHead {
  id: string;
  x: number;
  y: number;
  generation: number;
  status: 'alive' | 'destroyed' | 'spawning';
  children: string[];
  createdAt: Date;
}

interface AttackEvent {
  id: string;
  targetId: string;
  x: number;
  y: number;
  timestamp: Date;
}

export const HydraSpawnAnimation: React.FC = () => {
  const [heads, setHeads] = useState<HydraHead[]>([
    { id: 'root', x: 50, y: 50, generation: 0, status: 'alive', children: [], createdAt: new Date() }
  ]);
  const [attacks, setAttacks] = useState<AttackEvent[]>([]);
  const [stats, setStats] = useState({
    totalHeads: 1,
    destroyedHeads: 0,
    spawnedHeads: 0,
    attacksBlocked: 0
  });
  const [isAutoAttack, setIsAutoAttack] = useState(true);

  const spawnHeads = useCallback((parentId: string, parentX: number, parentY: number, generation: number) => {
    const newHeads: HydraHead[] = [];
    const spreadAngle = 30 + Math.random() * 30;
    
    for (let i = 0; i < 2; i++) {
      const angle = (i === 0 ? -spreadAngle : spreadAngle) * (Math.PI / 180);
      const distance = 12 + Math.random() * 8;
      
      const newX = Math.max(10, Math.min(90, parentX + Math.cos(angle) * distance + (Math.random() - 0.5) * 10));
      const newY = Math.max(10, Math.min(90, parentY - distance * 0.8 + (Math.random() - 0.5) * 5));
      
      newHeads.push({
        id: crypto.randomUUID().slice(0, 8),
        x: newX,
        y: newY,
        generation: generation + 1,
        status: 'spawning',
        children: [],
        createdAt: new Date()
      });
    }

    setHeads(prev => {
      const updated = prev.map(h => 
        h.id === parentId 
          ? { ...h, children: [...h.children, ...newHeads.map(nh => nh.id)] }
          : h
      );
      return [...updated, ...newHeads];
    });

    // Transition spawning to alive
    setTimeout(() => {
      setHeads(prev => prev.map(h => 
        newHeads.some(nh => nh.id === h.id) ? { ...h, status: 'alive' } : h
      ));
    }, 800);

    setStats(prev => ({
      ...prev,
      totalHeads: prev.totalHeads + 2,
      spawnedHeads: prev.spawnedHeads + 2
    }));
  }, []);

  const attackHead = useCallback((headId: string) => {
    const targetHead = heads.find(h => h.id === headId && h.status === 'alive');
    if (!targetHead) return;

    // Create attack animation
    const attackEvent: AttackEvent = {
      id: crypto.randomUUID(),
      targetId: headId,
      x: targetHead.x,
      y: targetHead.y,
      timestamp: new Date()
    };
    setAttacks(prev => [...prev, attackEvent]);

    // Mark as destroyed
    setHeads(prev => prev.map(h => 
      h.id === headId ? { ...h, status: 'destroyed' } : h
    ));

    setStats(prev => ({
      ...prev,
      destroyedHeads: prev.destroyedHeads + 1,
      attacksBlocked: prev.attacksBlocked + 1
    }));

    // Spawn two new heads after delay (Hydra effect!)
    setTimeout(() => {
      if (targetHead.generation < 4) {
        spawnHeads(headId, targetHead.x, targetHead.y, targetHead.generation);
      }
    }, 500);

    // Clear attack animation
    setTimeout(() => {
      setAttacks(prev => prev.filter(a => a.id !== attackEvent.id));
    }, 1000);
  }, [heads, spawnHeads]);

  // Auto-attack simulation
  useEffect(() => {
    if (!isAutoAttack) return;

    const interval = setInterval(() => {
      const aliveHeads = heads.filter(h => h.status === 'alive');
      if (aliveHeads.length > 0 && aliveHeads.length < 50) {
        const randomHead = aliveHeads[Math.floor(Math.random() * aliveHeads.length)];
        attackHead(randomHead.id);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isAutoAttack, heads, attackHead]);

  // Cleanup old destroyed heads
  useEffect(() => {
    const cleanup = setInterval(() => {
      setHeads(prev => prev.filter(h => 
        h.status !== 'destroyed' || 
        Date.now() - h.createdAt.getTime() < 10000
      ));
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  const getHeadColor = (head: HydraHead) => {
    if (head.status === 'destroyed') return 'fill-destructive/30 stroke-destructive';
    if (head.status === 'spawning') return 'fill-accent stroke-accent';
    return 'fill-success stroke-success';
  };

  const getHeadSize = (generation: number) => {
    return Math.max(1, 3 - generation * 0.4);
  };

  const handleManualAttack = () => {
    const aliveHeads = heads.filter(h => h.status === 'alive');
    if (aliveHeads.length > 0) {
      const randomHead = aliveHeads[Math.floor(Math.random() * aliveHeads.length)];
      attackHead(randomHead.id);
    }
  };

  const resetHydra = () => {
    setHeads([{ id: 'root', x: 50, y: 50, generation: 0, status: 'alive', children: [], createdAt: new Date() }]);
    setAttacks([]);
    setStats({ totalHeads: 1, destroyedHeads: 0, spawnedHeads: 0, attacksBlocked: 0 });
  };

  return (
    <Card className="cyber-card border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5 text-accent" />
            Hydra Auto-Spawn Defense
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAutoAttack(!isAutoAttack)}
              className={`border-primary/30 ${isAutoAttack ? 'bg-primary/20' : ''}`}
            >
              <Activity className="h-4 w-4 mr-1" />
              {isAutoAttack ? 'Auto' : 'Manual'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualAttack}
              className="border-destructive/30 hover:bg-destructive/10 text-destructive"
            >
              <Target className="h-4 w-4 mr-1" />
              Attack
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetHydra}
              className="border-primary/30 hover:bg-primary/10"
            >
              Reset
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          "Cut off one head, two more shall take its place"
        </p>
      </CardHeader>
      <CardContent>
        {/* Hydra Visualization */}
        <div className="relative w-full h-[350px] bg-card/50 rounded-lg overflow-hidden border border-border/50">
          <div className="absolute inset-0 cyber-grid opacity-20" />
          
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            {/* Connection lines from parent to children */}
            {heads.map(head => 
              head.children.map(childId => {
                const child = heads.find(h => h.id === childId);
                if (!child) return null;
                return (
                  <line
                    key={`${head.id}-${childId}`}
                    x1={head.x}
                    y1={head.y}
                    x2={child.x}
                    y2={child.y}
                    className="stroke-primary/40"
                    strokeWidth="0.3"
                    strokeDasharray={child.status === 'spawning' ? '1,1' : ''}
                  />
                );
              })
            )}
            
            {/* Attack animations */}
            {attacks.map(attack => (
              <g key={attack.id}>
                <circle
                  cx={attack.x}
                  cy={attack.y}
                  r="5"
                  className="fill-none stroke-destructive"
                  strokeWidth="0.5"
                >
                  <animate
                    attributeName="r"
                    from="0"
                    to="8"
                    dur="0.5s"
                    fill="freeze"
                  />
                  <animate
                    attributeName="opacity"
                    from="1"
                    to="0"
                    dur="0.5s"
                    fill="freeze"
                  />
                </circle>
                <line
                  x1={attack.x - 3}
                  y1={attack.y - 3}
                  x2={attack.x + 3}
                  y2={attack.y + 3}
                  className="stroke-destructive"
                  strokeWidth="0.5"
                >
                  <animate
                    attributeName="opacity"
                    from="1"
                    to="0"
                    dur="0.3s"
                    fill="freeze"
                  />
                </line>
                <line
                  x1={attack.x + 3}
                  y1={attack.y - 3}
                  x2={attack.x - 3}
                  y2={attack.y + 3}
                  className="stroke-destructive"
                  strokeWidth="0.5"
                >
                  <animate
                    attributeName="opacity"
                    from="1"
                    to="0"
                    dur="0.3s"
                    fill="freeze"
                  />
                </line>
              </g>
            ))}
            
            {/* Hydra heads */}
            {heads.map(head => (
              <g key={head.id}>
                {/* Pulse effect for alive heads */}
                {head.status === 'alive' && (
                  <circle
                    cx={head.x}
                    cy={head.y}
                    r={getHeadSize(head.generation) + 1}
                    className="fill-none stroke-success/30"
                    strokeWidth="0.2"
                  >
                    <animate
                      attributeName="r"
                      from={getHeadSize(head.generation)}
                      to={getHeadSize(head.generation) + 2}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.5"
                      to="0"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                
                {/* Spawn animation */}
                {head.status === 'spawning' && (
                  <circle
                    cx={head.x}
                    cy={head.y}
                    r={getHeadSize(head.generation) + 3}
                    className="fill-none stroke-accent"
                    strokeWidth="0.5"
                    strokeDasharray="1,0.5"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from={`0 ${head.x} ${head.y}`}
                      to={`360 ${head.x} ${head.y}`}
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                
                {/* Head circle */}
                <circle
                  cx={head.x}
                  cy={head.y}
                  r={getHeadSize(head.generation)}
                  className={`${getHeadColor(head)} transition-all duration-300 cursor-pointer`}
                  strokeWidth="0.3"
                  onClick={() => head.status === 'alive' && attackHead(head.id)}
                >
                  {head.status === 'spawning' && (
                    <animate
                      attributeName="r"
                      from="0"
                      to={getHeadSize(head.generation)}
                      dur="0.5s"
                      fill="freeze"
                    />
                  )}
                </circle>
                
                {/* Generation indicator for root */}
                {head.id === 'root' && head.status === 'alive' && (
                  <text
                    x={head.x}
                    y={head.y + 0.5}
                    textAnchor="middle"
                    className="fill-foreground text-[2px] font-bold"
                  >
                    H
                  </text>
                )}
              </g>
            ))}
          </svg>

          {/* Info overlay */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Badge variant="outline" className="bg-success/10 border-success/30 text-success">
              <Server className="h-3 w-3 mr-1" />
              {heads.filter(h => h.status === 'alive').length} Active
            </Badge>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Active Node</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>Spawning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive/50" />
              <span>Destroyed</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <div className="text-xl font-bold text-primary">{stats.totalHeads}</div>
            <div className="text-xs text-muted-foreground">Total Created</div>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <div className="text-xl font-bold text-destructive">{stats.destroyedHeads}</div>
            <div className="text-xs text-muted-foreground">Heads Cut</div>
          </div>
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-center">
            <div className="text-xl font-bold text-accent">{stats.spawnedHeads}</div>
            <div className="text-xs text-muted-foreground">Respawned</div>
          </div>
          <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
            <div className="text-xl font-bold text-success">{stats.attacksBlocked}</div>
            <div className="text-xs text-muted-foreground">Attacks Absorbed</div>
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-4 p-3 rounded-lg bg-accent/5 border border-accent/20">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-accent" />
            <span className="font-medium text-accent">Hydra Protocol Active</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Each destroyed node automatically spawns two replacement nodes. Click any active node to simulate an attack, or enable auto-attack mode to watch the network grow.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HydraSpawnAnimation;

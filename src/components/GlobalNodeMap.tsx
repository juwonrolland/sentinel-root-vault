import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Server, Activity, Zap, Shield } from 'lucide-react';

interface Node {
  id: string;
  name: string;
  location: string;
  x: number;
  y: number;
  status: 'active' | 'spawning' | 'defending' | 'offline';
  load: number;
  connections: number;
  isNew?: boolean;
}

interface Connection {
  from: string;
  to: string;
  type: 'data' | 'attack' | 'defense';
}

const initialNodes: Node[] = [
  { id: '1', name: 'US-East', location: 'New York', x: 25, y: 35, status: 'active', load: 45, connections: 12 },
  { id: '2', name: 'US-West', location: 'San Francisco', x: 12, y: 38, status: 'active', load: 62, connections: 18 },
  { id: '3', name: 'EU-West', location: 'London', x: 47, y: 28, status: 'active', load: 38, connections: 15 },
  { id: '4', name: 'EU-Central', location: 'Frankfurt', x: 52, y: 30, status: 'active', load: 55, connections: 22 },
  { id: '5', name: 'Asia-East', location: 'Tokyo', x: 85, y: 38, status: 'active', load: 71, connections: 25 },
  { id: '6', name: 'Asia-South', location: 'Singapore', x: 78, y: 55, status: 'active', load: 48, connections: 14 },
  { id: '7', name: 'Oceania', location: 'Sydney', x: 88, y: 72, status: 'active', load: 32, connections: 8 },
  { id: '8', name: 'South-America', location: 'São Paulo', x: 32, y: 68, status: 'active', load: 41, connections: 11 },
];

const regionNames = ['Nordic', 'Middle-East', 'Africa', 'India', 'Canada', 'Mexico', 'Korea', 'Taiwan'];

export const GlobalNodeMap: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [attackingNodes, setAttackingNodes] = useState<string[]>([]);
  const [totalTraffic, setTotalTraffic] = useState(0);

  // Simulate node spawning (Hydra effect)
  const spawnNode = useCallback(() => {
    const newId = crypto.randomUUID().slice(0, 8);
    const regionName = regionNames[Math.floor(Math.random() * regionNames.length)];
    const newNode: Node = {
      id: newId,
      name: `${regionName}-${Math.floor(Math.random() * 100)}`,
      location: regionName,
      x: 15 + Math.random() * 70,
      y: 20 + Math.random() * 55,
      status: 'spawning',
      load: Math.random() * 30,
      connections: 0,
      isNew: true
    };
    
    setNodes(prev => [...prev, newNode]);
    
    // Transition to active after spawn animation
    setTimeout(() => {
      setNodes(prev => prev.map(n => 
        n.id === newId ? { ...n, status: 'active', isNew: false } : n
      ));
    }, 2000);
  }, []);

  // Simulate attacks and defenses
  useEffect(() => {
    const interval = setInterval(() => {
      // Random attack simulation
      if (Math.random() > 0.7) {
        const targetNode = nodes[Math.floor(Math.random() * nodes.length)];
        setAttackingNodes(prev => [...prev, targetNode.id]);
        
        setNodes(prev => prev.map(n => 
          n.id === targetNode.id ? { ...n, status: 'defending' } : n
        ));

        // Defend and potentially spawn new node
        setTimeout(() => {
          setAttackingNodes(prev => prev.filter(id => id !== targetNode.id));
          setNodes(prev => prev.map(n => 
            n.id === targetNode.id ? { ...n, status: 'active' } : n
          ));
          
          // Hydra effect: spawn new node when attacked
          if (Math.random() > 0.5 && nodes.length < 20) {
            spawnNode();
          }
        }, 1500);
      }

      // Update connections
      const newConnections: Connection[] = [];
      const activeNodes = nodes.filter(n => n.status === 'active');
      for (let i = 0; i < Math.min(8, activeNodes.length); i++) {
        const from = activeNodes[Math.floor(Math.random() * activeNodes.length)];
        const to = activeNodes[Math.floor(Math.random() * activeNodes.length)];
        if (from.id !== to.id) {
          newConnections.push({
            from: from.id,
            to: to.id,
            type: Math.random() > 0.9 ? 'attack' : Math.random() > 0.7 ? 'defense' : 'data'
          });
        }
      }
      setConnections(newConnections);

      // Update traffic
      setTotalTraffic(prev => Math.max(0, prev + (Math.random() * 200 - 100)));
      
      // Update node loads
      setNodes(prev => prev.map(n => ({
        ...n,
        load: Math.max(10, Math.min(95, n.load + (Math.random() * 20 - 10))),
        connections: Math.max(0, n.connections + Math.floor(Math.random() * 5 - 2))
      })));
    }, 1500);

    return () => clearInterval(interval);
  }, [nodes, spawnNode]);

  const getNodeColor = (node: Node) => {
    if (node.isNew) return 'fill-accent stroke-accent';
    switch (node.status) {
      case 'defending': return 'fill-destructive stroke-destructive';
      case 'spawning': return 'fill-accent stroke-accent';
      case 'offline': return 'fill-muted stroke-muted';
      default: return 'fill-success stroke-success';
    }
  };

  const getConnectionColor = (type: Connection['type']) => {
    switch (type) {
      case 'attack': return 'stroke-destructive';
      case 'defense': return 'stroke-primary';
      default: return 'stroke-primary/30';
    }
  };

  const getNodeById = (id: string) => nodes.find(n => n.id === id);

  return (
    <Card className="cyber-card border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Global Node Network
          </CardTitle>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-success/10 border-success/30 text-success">
              <Server className="h-3 w-3 mr-1" />
              {nodes.length} Nodes
            </Badge>
            <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
              <Activity className="h-3 w-3 mr-1" />
              {(totalTraffic / 1000).toFixed(1)} Gbps
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Map Container */}
        <div className="relative w-full h-[400px] bg-card/50 rounded-lg overflow-hidden border border-border/50">
          {/* Grid Background */}
          <div className="absolute inset-0 cyber-grid opacity-30" />
          
          {/* World Map SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 80">
            {/* Simplified world map outline */}
            <path
              d="M10,30 Q15,25 25,28 T40,25 Q50,22 60,28 T80,25 Q90,28 95,35 M5,45 Q15,40 25,42 T45,38 Q55,35 65,40 T85,38 Q95,42 98,48 M8,55 Q18,52 28,55 T48,50 Q58,48 68,52 T88,50"
              fill="none"
              stroke="hsl(var(--primary) / 0.15)"
              strokeWidth="0.5"
            />
            
            {/* Connection lines */}
            {connections.map((conn, idx) => {
              const fromNode = getNodeById(conn.from);
              const toNode = getNodeById(conn.to);
              if (!fromNode || !toNode) return null;
              
              return (
                <line
                  key={idx}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  className={`${getConnectionColor(conn.type)} opacity-60`}
                  strokeWidth="0.3"
                  strokeDasharray={conn.type === 'attack' ? '1,1' : ''}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="10"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </line>
              );
            })}
            
            {/* Nodes */}
            {nodes.map((node) => (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => setSelectedNode(node)}
              >
                {/* Pulse ring for active/defending nodes */}
                {(node.status === 'active' || node.status === 'defending') && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="3"
                    className={`${node.status === 'defending' ? 'stroke-destructive' : 'stroke-primary'} fill-none opacity-30`}
                    strokeWidth="0.3"
                  >
                    <animate
                      attributeName="r"
                      from="1.5"
                      to="4"
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
                
                {/* Node dot */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.isNew ? '2' : '1.5'}
                  className={`${getNodeColor(node)} transition-all duration-300`}
                  strokeWidth="0.3"
                >
                  {node.isNew && (
                    <animate
                      attributeName="r"
                      from="0"
                      to="1.5"
                      dur="0.5s"
                      fill="freeze"
                    />
                  )}
                </circle>
                
                {/* Defending shield animation */}
                {node.status === 'defending' && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="2.5"
                    className="stroke-primary fill-none"
                    strokeWidth="0.2"
                    strokeDasharray="1,0.5"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from={`0 ${node.x} ${node.y}`}
                      to={`360 ${node.x} ${node.y}`}
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            ))}
          </svg>

          {/* Node Info Panel */}
          {selectedNode && (
            <div className="absolute bottom-4 left-4 p-4 bg-card/95 backdrop-blur-sm rounded-lg border border-primary/30 shadow-glow-sm animate-fade-in max-w-[250px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  <span className="font-bold">{selectedNode.name}</span>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span>{selectedNode.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge 
                    variant="outline" 
                    className={
                      selectedNode.status === 'active' ? 'bg-success/20 text-success border-success/30' :
                      selectedNode.status === 'defending' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                      'bg-accent/20 text-accent border-accent/30'
                    }
                  >
                    {selectedNode.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Load:</span>
                  <span>{selectedNode.load.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connections:</span>
                  <span>{selectedNode.connections}</span>
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute top-4 right-4 p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span>Defending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>Spawning</span>
            </div>
          </div>
        </div>

        {/* Node Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
            <div className="text-xl font-bold text-success">{nodes.filter(n => n.status === 'active').length}</div>
            <div className="text-xs text-muted-foreground">Active Nodes</div>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <div className="text-xl font-bold text-destructive">{nodes.filter(n => n.status === 'defending').length}</div>
            <div className="text-xs text-muted-foreground">Under Attack</div>
          </div>
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-center">
            <div className="text-xl font-bold text-accent">{nodes.filter(n => n.isNew).length}</div>
            <div className="text-xs text-muted-foreground">Spawning</div>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <div className="text-xl font-bold text-primary">{connections.length}</div>
            <div className="text-xs text-muted-foreground">Active Links</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GlobalNodeMap;

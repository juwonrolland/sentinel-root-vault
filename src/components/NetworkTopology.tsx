import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield, 
  Globe, 
  Server, 
  Database, 
  Cloud, 
  Lock,
  Cpu,
  Activity,
  Wifi
} from "lucide-react";

interface NetworkNode {
  id: string;
  name: string;
  type: "shield" | "server" | "database" | "cloud" | "endpoint" | "firewall" | "router";
  status: "online" | "warning" | "offline" | "scanning" | "under_attack";
  x: number;
  y: number;
  traffic?: number;
  latency?: number;
}

interface NetworkTopologyProps {
  className?: string;
}

const initialNodes: NetworkNode[] = [
  { id: "1", name: "Edge Firewall", type: "firewall", status: "online", x: 50, y: 8, traffic: 0, latency: 0 },
  { id: "2", name: "Load Balancer", type: "router", status: "online", x: 50, y: 25, traffic: 0, latency: 0 },
  { id: "3", name: "Web Server 1", type: "server", status: "online", x: 20, y: 42, traffic: 0, latency: 0 },
  { id: "4", name: "Web Server 2", type: "server", status: "online", x: 50, y: 42, traffic: 0, latency: 0 },
  { id: "5", name: "Web Server 3", type: "server", status: "online", x: 80, y: 42, traffic: 0, latency: 0 },
  { id: "6", name: "App Server", type: "server", status: "scanning", x: 35, y: 60, traffic: 0, latency: 0 },
  { id: "7", name: "Database Cluster", type: "database", status: "online", x: 65, y: 60, traffic: 0, latency: 0 },
  { id: "8", name: "Cloud Gateway", type: "cloud", status: "online", x: 50, y: 78, traffic: 0, latency: 0 },
  { id: "9", name: "Backup Storage", type: "database", status: "online", x: 15, y: 92, traffic: 0, latency: 0 },
  { id: "10", name: "CDN Node", type: "cloud", status: "online", x: 50, y: 92, traffic: 0, latency: 0 },
  { id: "11", name: "Analytics", type: "endpoint", status: "online", x: 85, y: 92, traffic: 0, latency: 0 },
];

const connections = [
  ["1", "2"],
  ["2", "3"], ["2", "4"], ["2", "5"],
  ["3", "6"], ["4", "6"], ["5", "6"],
  ["3", "7"], ["4", "7"], ["5", "7"],
  ["6", "7"],
  ["6", "8"], ["7", "8"],
  ["8", "9"], ["8", "10"], ["8", "11"],
];

export const NetworkTopology = ({ className }: NetworkTopologyProps) => {
  const [nodes, setNodes] = useState<NetworkNode[]>(initialNodes);
  const [activeConnections, setActiveConnections] = useState<Set<string>>(new Set());
  const [attackedNodes, setAttackedNodes] = useState<Set<string>>(new Set());

  // Simulate network activity and respond to security events
  useEffect(() => {
    // Subscribe to security events to show attacks
    const channel = supabase
      .channel('network-topology-events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_events'
      }, (payload) => {
        const event = payload.new as any;
        
        // Simulate attack on random node based on severity
        if (event.severity === 'critical' || event.severity === 'high') {
          const targetNodeId = String(Math.floor(Math.random() * 11) + 1);
          setAttackedNodes(prev => new Set([...prev, targetNodeId]));
          
          // Clear attack status after 5 seconds
          setTimeout(() => {
            setAttackedNodes(prev => {
              const newSet = new Set(prev);
              newSet.delete(targetNodeId);
              return newSet;
            });
          }, 5000);
        }
      })
      .subscribe();

    // Simulate network traffic
    const trafficInterval = setInterval(() => {
      setNodes(prev => prev.map(node => ({
        ...node,
        traffic: Math.floor(Math.random() * 100),
        latency: Math.floor(Math.random() * 50) + 5
      })));

      // Randomly activate connections to show data flow
      const newActive = new Set<string>();
      connections.forEach(([from, to]) => {
        if (Math.random() > 0.5) {
          newActive.add(`${from}-${to}`);
        }
      });
      setActiveConnections(newActive);
    }, 2000);

    // Random status changes
    const statusInterval = setInterval(() => {
      setNodes(prev => prev.map(node => {
        if (attackedNodes.has(node.id)) {
          return { ...node, status: 'under_attack' as const };
        }
        const rand = Math.random();
        if (rand < 0.02) {
          return { ...node, status: 'warning' as const };
        } else if (rand < 0.05) {
          return { ...node, status: 'scanning' as const };
        } else if (node.status !== 'online' && rand > 0.1) {
          return { ...node, status: 'online' as const };
        }
        return node;
      }));
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(trafficInterval);
      clearInterval(statusInterval);
    };
  }, [attackedNodes]);

  const getIcon = (type: NetworkNode["type"]) => {
    const iconClass = "w-4 h-4 sm:w-5 sm:h-5";
    switch (type) {
      case "shield": return <Shield className={iconClass} />;
      case "firewall": return <Lock className={iconClass} />;
      case "server": return <Server className={iconClass} />;
      case "database": return <Database className={iconClass} />;
      case "cloud": return <Cloud className={iconClass} />;
      case "endpoint": return <Cpu className={iconClass} />;
      case "router": return <Wifi className={iconClass} />;
      default: return <Globe className={iconClass} />;
    }
  };

  const getStatusColor = (status: NetworkNode["status"]) => {
    switch (status) {
      case "online": return "bg-success/20 border-success/50 text-success";
      case "warning": return "bg-warning/20 border-warning/50 text-warning";
      case "offline": return "bg-destructive/20 border-destructive/50 text-destructive";
      case "scanning": return "bg-info/20 border-info/50 text-info animate-pulse";
      case "under_attack": return "bg-destructive/30 border-destructive text-destructive animate-pulse";
      default: return "bg-muted border-muted text-muted-foreground";
    }
  };

  const getConnectionColor = (from: string, to: string) => {
    const isActive = activeConnections.has(`${from}-${to}`);
    const fromNode = nodes.find(n => n.id === from);
    const toNode = nodes.find(n => n.id === to);
    
    if (fromNode?.status === 'under_attack' || toNode?.status === 'under_attack') {
      return "hsl(0 100% 50% / 0.6)";
    }
    if (isActive) {
      return "hsl(185 100% 50% / 0.5)";
    }
    return "hsl(185 100% 50% / 0.15)";
  };

  return (
    <div className={cn("relative w-full h-64 sm:h-72 cyber-grid-dense rounded-lg overflow-hidden", className)}>
      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(185 100% 50% / 0)">
              <animate attributeName="offset" values="-0.5;1" dur="1.5s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="hsl(185 100% 50% / 0.8)">
              <animate attributeName="offset" values="0;1.5" dur="1.5s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="hsl(185 100% 50% / 0)">
              <animate attributeName="offset" values="0.5;2" dur="1.5s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        </defs>
        
        {connections.map(([from, to], i) => {
          const fromNode = nodes.find(n => n.id === from);
          const toNode = nodes.find(n => n.id === to);
          if (!fromNode || !toNode) return null;
          
          const isActive = activeConnections.has(`${from}-${to}`);
          
          return (
            <g key={i}>
              <line
                x1={`${fromNode.x}%`}
                y1={`${fromNode.y}%`}
                x2={`${toNode.x}%`}
                y2={`${toNode.y}%`}
                stroke={getConnectionColor(from, to)}
                strokeWidth={isActive ? "2" : "1"}
                strokeDasharray={isActive ? "none" : "4 4"}
              >
                {!isActive && (
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="8"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                )}
              </line>
              
              {/* Data flow indicator */}
              {isActive && (
                <circle r="3" fill="hsl(185 100% 50%)">
                  <animateMotion
                    dur="1s"
                    repeatCount="indefinite"
                    path={`M${fromNode.x * 3.5},${fromNode.y * 2.5} L${toNode.x * 3.5},${toNode.y * 2.5}`}
                  />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node) => (
        <div
          key={node.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
        >
          <div
            className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border-2 transition-all duration-300",
              "bg-card/80 backdrop-blur-sm hover:scale-110 cursor-pointer",
              getStatusColor(node.status)
            )}
          >
            {getIcon(node.type)}
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
            <div className="bg-card border border-border rounded px-2 py-1.5 text-xs whitespace-nowrap shadow-lg">
              <p className="font-medium text-foreground">{node.name}</p>
              <p className="text-muted-foreground capitalize">{node.status.replace('_', ' ')}</p>
              {node.traffic !== undefined && (
                <div className="flex items-center gap-2 mt-1 text-[10px]">
                  <span className="text-info">Traffic: {node.traffic}%</span>
                  <span className="text-warning">Latency: {node.latency}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Status pulse for scanning/attack */}
          {(node.status === "scanning" || node.status === "under_attack") && (
            <div className={cn(
              "absolute inset-0 rounded-lg border-2 animate-ping opacity-30",
              node.status === "under_attack" ? "border-destructive" : "border-info"
            )} />
          )}
        </div>
      ))}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex items-center gap-3 text-[9px] sm:text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span>Online</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-info animate-pulse" />
          <span>Scanning</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span>Attack</span>
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[10px] text-success">
        <Activity className="w-3 h-3 animate-pulse" />
        <span>LIVE</span>
      </div>
    </div>
  );
};

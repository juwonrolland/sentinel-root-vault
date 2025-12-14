import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Server,
  Router,
  Network,
  Shield,
  Monitor,
  Smartphone,
  Wifi,
  Cloud,
  Globe,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Activity,
  Lock,
  Eye,
  Play,
  Pause,
  Settings,
  Database,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface NetworkNode {
  id: string;
  name: string;
  type: 'server' | 'router' | 'switch' | 'firewall' | 'workstation' | 'mobile' | 'iot' | 'cloud' | 'gateway' | 'core' | 'internet' | 'database' | 'endpoint';
  status: 'online' | 'offline' | 'warning' | 'critical' | 'scanning' | 'under_attack';
  x: number;
  y: number;
  connections: string[];
  zone?: string;
  traffic: number;
  latency: number;
  threats: number;
  ipAddress?: string;
}

interface Connection {
  from: string;
  to: string;
  status: 'active' | 'idle' | 'congested' | 'threat';
  bandwidth: number;
  latency: number;
  encrypted: boolean;
  packets: number;
}

interface NetworkTopologyProps {
  className?: string;
  devices?: Array<{
    id: string;
    name: string;
    type: string;
    ipAddress: string;
    status: string;
    organization?: string;
  }>;
  compact?: boolean;
}

const NODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  server: Server,
  router: Router,
  switch: Network,
  firewall: Shield,
  workstation: Monitor,
  mobile: Smartphone,
  iot: Wifi,
  cloud: Cloud,
  gateway: Router,
  core: Database,
  internet: Globe,
  database: Database,
  endpoint: Cpu,
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  online: { bg: 'bg-success/20', border: 'border-success/50', text: 'text-success', glow: 'shadow-success/30' },
  offline: { bg: 'bg-muted/50', border: 'border-border', text: 'text-muted-foreground', glow: '' },
  warning: { bg: 'bg-warning/20', border: 'border-warning/50', text: 'text-warning', glow: 'shadow-warning/30' },
  critical: { bg: 'bg-destructive/20', border: 'border-destructive/50', text: 'text-destructive', glow: 'shadow-destructive/30' },
  scanning: { bg: 'bg-info/20', border: 'border-info/50', text: 'text-info', glow: 'shadow-info/30' },
  under_attack: { bg: 'bg-destructive/30', border: 'border-destructive', text: 'text-destructive', glow: 'shadow-destructive/50' },
};

// Generate advanced network topology
const generateTopology = (externalDevices: NetworkTopologyProps['devices'] = []): { nodes: NetworkNode[]; connections: Connection[] } => {
  const baseNodes: NetworkNode[] = [
    { id: 'internet', name: 'Internet Gateway', type: 'internet', status: 'online', x: 50, y: 5, connections: ['firewall-edge'], zone: 'external', traffic: 95, latency: 50, threats: 0 },
    { id: 'firewall-edge', name: 'Edge Firewall', type: 'firewall', status: 'online', x: 50, y: 15, connections: ['core-router-1', 'core-router-2'], zone: 'dmz', traffic: 88, latency: 2, threats: 0 },
    { id: 'core-router-1', name: 'Core Router A', type: 'router', status: 'online', x: 30, y: 28, connections: ['switch-dc1', 'switch-dc2'], zone: 'core', traffic: 82, latency: 1, threats: 0 },
    { id: 'core-router-2', name: 'Core Router B', type: 'router', status: 'online', x: 70, y: 28, connections: ['switch-corp', 'switch-dmz'], zone: 'core', traffic: 78, latency: 1, threats: 0 },
    { id: 'switch-dc1', name: 'DC1 Distribution', type: 'switch', status: 'online', x: 15, y: 42, connections: ['server-web-1', 'server-web-2', 'server-db-primary'], zone: 'datacenter', traffic: 75, latency: 0.5, threats: 0 },
    { id: 'switch-dc2', name: 'DC2 Distribution', type: 'switch', status: 'online', x: 40, y: 42, connections: ['server-app', 'server-db-replica', 'cloud-aws'], zone: 'datacenter', traffic: 68, latency: 0.5, threats: 0 },
    { id: 'switch-corp', name: 'Corporate Switch', type: 'switch', status: 'online', x: 65, y: 42, connections: ['ws-exec', 'ws-dev', 'ws-finance'], zone: 'corporate', traffic: 45, latency: 1, threats: 0 },
    { id: 'switch-dmz', name: 'DMZ Switch', type: 'switch', status: 'online', x: 85, y: 42, connections: ['server-mail', 'server-vpn'], zone: 'dmz', traffic: 55, latency: 1, threats: 0 },
    { id: 'server-web-1', name: 'Web Server 1', type: 'server', status: 'online', x: 8, y: 58, connections: [], zone: 'datacenter', traffic: 78, latency: 3, threats: 0, ipAddress: '10.0.1.10' },
    { id: 'server-web-2', name: 'Web Server 2', type: 'server', status: 'online', x: 18, y: 58, connections: [], zone: 'datacenter', traffic: 72, latency: 3, threats: 0, ipAddress: '10.0.1.11' },
    { id: 'server-db-primary', name: 'DB Primary', type: 'database', status: 'online', x: 28, y: 58, connections: [], zone: 'datacenter', traffic: 45, latency: 1, threats: 0, ipAddress: '10.0.1.20' },
    { id: 'server-app', name: 'App Server', type: 'server', status: 'online', x: 35, y: 58, connections: [], zone: 'datacenter', traffic: 62, latency: 2, threats: 0, ipAddress: '10.0.2.10' },
    { id: 'server-db-replica', name: 'DB Replica', type: 'database', status: 'online', x: 45, y: 58, connections: [], zone: 'datacenter', traffic: 35, latency: 1, threats: 0, ipAddress: '10.0.2.20' },
    { id: 'cloud-aws', name: 'AWS Cloud', type: 'cloud', status: 'online', x: 55, y: 58, connections: [], zone: 'cloud', traffic: 55, latency: 25, threats: 0 },
    { id: 'ws-exec', name: 'Executive Floor', type: 'workstation', status: 'online', x: 62, y: 58, connections: [], zone: 'corporate', traffic: 15, latency: 2, threats: 0, ipAddress: '192.168.1.101' },
    { id: 'ws-dev', name: 'Dev Team', type: 'workstation', status: 'online', x: 72, y: 58, connections: [], zone: 'corporate', traffic: 35, latency: 2, threats: 0, ipAddress: '192.168.2.0/24' },
    { id: 'ws-finance', name: 'Finance Dept', type: 'workstation', status: 'online', x: 82, y: 58, connections: [], zone: 'corporate', traffic: 18, latency: 2, threats: 0, ipAddress: '192.168.3.0/24' },
    { id: 'server-mail', name: 'Mail Server', type: 'server', status: 'online', x: 88, y: 58, connections: [], zone: 'dmz', traffic: 42, latency: 5, threats: 0, ipAddress: '10.100.1.10' },
    { id: 'server-vpn', name: 'VPN Gateway', type: 'gateway', status: 'online', x: 95, y: 58, connections: [], zone: 'dmz', traffic: 28, latency: 8, threats: 0, ipAddress: '10.100.1.20' },
    // IoT and mobile layer
    { id: 'iot-sensors', name: 'IoT Sensors', type: 'iot', status: 'online', x: 20, y: 75, connections: [], zone: 'iot', traffic: 12, latency: 15, threats: 0 },
    { id: 'mobile-fleet', name: 'Mobile Devices', type: 'mobile', status: 'online', x: 50, y: 75, connections: [], zone: 'mobile', traffic: 22, latency: 35, threats: 0 },
    { id: 'backup-storage', name: 'Backup Storage', type: 'database', status: 'online', x: 80, y: 75, connections: [], zone: 'storage', traffic: 8, latency: 3, threats: 0 },
  ];

  // Add connections to IoT and mobile from appropriate switches
  baseNodes.find(n => n.id === 'switch-dc1')?.connections.push('iot-sensors');
  baseNodes.find(n => n.id === 'switch-corp')?.connections.push('mobile-fleet');
  baseNodes.find(n => n.id === 'switch-dc2')?.connections.push('backup-storage');

  // Add external devices to topology
  const externalNodes: NetworkNode[] = externalDevices.map((device, index) => ({
    id: device.id,
    name: device.name,
    type: (device.type as NetworkNode['type']) || 'server',
    status: (device.status as NetworkNode['status']) || 'online',
    x: 10 + (index % 8) * 11,
    y: 88,
    connections: [],
    zone: device.organization?.toLowerCase() || 'monitored',
    traffic: Math.random() * 80 + 10,
    latency: Math.random() * 20 + 1,
    threats: 0,
    ipAddress: device.ipAddress,
  }));

  // Connect external nodes to appropriate switches
  externalNodes.forEach(node => {
    if (node.type === 'server' || node.type === 'cloud' || node.type === 'database') {
      baseNodes.find(n => n.id === 'switch-dc1')?.connections.push(node.id);
    } else if (node.type === 'workstation' || node.type === 'mobile') {
      baseNodes.find(n => n.id === 'switch-corp')?.connections.push(node.id);
    } else {
      baseNodes.find(n => n.id === 'core-router-1')?.connections.push(node.id);
    }
  });

  const allNodes = [...baseNodes, ...externalNodes];

  // Generate connections
  const connections: Connection[] = [];
  allNodes.forEach(node => {
    node.connections.forEach(targetId => {
      connections.push({
        from: node.id,
        to: targetId,
        status: Math.random() > 0.92 ? 'congested' : Math.random() > 0.98 ? 'threat' : 'active',
        bandwidth: Math.random() * 100,
        latency: Math.random() * 10 + 1,
        encrypted: Math.random() > 0.15,
        packets: Math.floor(Math.random() * 10000),
      });
    });
  });

  return { nodes: allNodes, connections };
};

export const NetworkTopology = ({ className, devices = [], compact = false }: NetworkTopologyProps) => {
  const [topology, setTopology] = useState(() => generateTopology(devices));
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTrafficFlow, setShowTrafficFlow] = useState(true);
  const [viewMode, setViewMode] = useState<'physical' | 'logical' | 'security'>('physical');
  const [animating, setAnimating] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeConnections, setActiveConnections] = useState<Set<string>>(new Set());
  const [attackedNodes, setAttackedNodes] = useState<Set<string>>(new Set());

  // Update topology when devices change
  useEffect(() => {
    setTopology(generateTopology(devices));
  }, [devices]);

  // Subscribe to security events
  useEffect(() => {
    const channel = supabase
      .channel('network-topology-events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_events'
      }, (payload) => {
        const event = payload.new as any;
        if (event.severity === 'critical' || event.severity === 'high') {
          const targetNodeId = topology.nodes[Math.floor(Math.random() * topology.nodes.length)]?.id;
          if (targetNodeId) {
            setAttackedNodes(prev => new Set([...prev, targetNodeId]));
            setTimeout(() => {
              setAttackedNodes(prev => {
                const newSet = new Set(prev);
                newSet.delete(targetNodeId);
                return newSet;
              });
            }, 5000);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topology.nodes]);

  // Simulate real-time updates
  useEffect(() => {
    if (!animating) return;

    const trafficInterval = setInterval(() => {
      // Update active connections
      const newActive = new Set<string>();
      topology.connections.forEach(conn => {
        if (Math.random() > 0.3) {
          newActive.add(`${conn.from}-${conn.to}`);
        }
      });
      setActiveConnections(newActive);

      // Update node stats
      setTopology(prev => ({
        ...prev,
        nodes: prev.nodes.map(node => {
          const isAttacked = attackedNodes.has(node.id);
          return {
            ...node,
            traffic: Math.max(0, Math.min(100, node.traffic + (Math.random() - 0.5) * 15)),
            latency: Math.max(0.1, node.latency + (Math.random() - 0.5) * 3),
            status: isAttacked ? 'under_attack' : 
                    Math.random() > 0.98 ? 'warning' : 
                    Math.random() > 0.995 ? 'critical' : 
                    node.status === 'warning' && Math.random() > 0.8 ? 'online' : 
                    node.status,
          };
        }),
        connections: prev.connections.map(conn => ({
          ...conn,
          bandwidth: Math.max(0, Math.min(100, conn.bandwidth + (Math.random() - 0.5) * 12)),
          packets: conn.packets + Math.floor(Math.random() * 100),
          status: Math.random() > 0.95 ? 'congested' : Math.random() > 0.99 ? 'threat' : 'active',
        })),
      }));
    }, 2000);

    return () => clearInterval(trafficInterval);
  }, [animating, attackedNodes, topology.connections]);

  const handleNodeClick = useCallback((nodeId: string) => {
    const node = topology.nodes.find(n => n.id === nodeId);
    setSelectedNode(prev => prev?.id === nodeId ? null : node || null);
  }, [topology.nodes]);

  const getConnectionColor = (from: string, to: string) => {
    const isActive = activeConnections.has(`${from}-${to}`);
    const fromNode = topology.nodes.find(n => n.id === from);
    const toNode = topology.nodes.find(n => n.id === to);
    
    if (fromNode?.status === 'under_attack' || toNode?.status === 'under_attack') {
      return "hsl(0 100% 50% / 0.7)";
    }
    if (fromNode?.status === 'critical' || toNode?.status === 'critical') {
      return "hsl(0 100% 50% / 0.5)";
    }
    if (isActive) {
      return "hsl(142 76% 36% / 0.6)";
    }
    return "hsl(185 100% 50% / 0.15)";
  };

  const nodeStats = {
    total: topology.nodes.length,
    online: topology.nodes.filter(n => n.status === 'online').length,
    warning: topology.nodes.filter(n => n.status === 'warning').length,
    critical: topology.nodes.filter(n => n.status === 'critical' || n.status === 'under_attack').length,
    offline: topology.nodes.filter(n => n.status === 'offline').length,
  };

  const connectionStats = {
    total: topology.connections.length,
    active: topology.connections.filter(c => c.status === 'active').length,
    congested: topology.connections.filter(c => c.status === 'congested').length,
    threats: topology.connections.filter(c => c.status === 'threat').length,
    encrypted: topology.connections.filter(c => c.encrypted).length,
  };

  if (compact) {
    return (
      <div className={cn("relative w-full h-64 sm:h-72 cyber-grid-dense rounded-lg overflow-hidden", className)}>
        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {topology.connections.map((conn, i) => {
            const fromNode = topology.nodes.find(n => n.id === conn.from);
            const toNode = topology.nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;
            
            const isActive = activeConnections.has(`${conn.from}-${conn.to}`);
            
            return (
              <g key={i}>
                <line
                  x1={`${fromNode.x}%`}
                  y1={`${fromNode.y}%`}
                  x2={`${toNode.x}%`}
                  y2={`${toNode.y}%`}
                  stroke={getConnectionColor(conn.from, conn.to)}
                  strokeWidth={isActive ? "2" : "1"}
                  strokeDasharray={isActive ? "none" : "4 4"}
                />
                {isActive && showTrafficFlow && (
                  <circle r="2" fill="hsl(142 76% 36%)">
                    <animateMotion
                      dur="1.5s"
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
        {topology.nodes.map((node) => {
          const Icon = NODE_ICONS[node.type] || Server;
          const colors = STATUS_COLORS[node.status] || STATUS_COLORS.online;
          return (
            <div
              key={node.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onClick={() => handleNodeClick(node.id)}
            >
              <div className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border-2 transition-all duration-300",
                "bg-card/80 backdrop-blur-sm hover:scale-110 cursor-pointer",
                colors.bg, colors.border, colors.text,
                selectedNode?.id === node.id && "ring-2 ring-primary scale-110",
                (node.status === 'scanning' || node.status === 'under_attack') && "animate-pulse"
              )}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                <div className="bg-card border border-border rounded px-2 py-1.5 text-xs whitespace-nowrap shadow-lg">
                  <p className="font-medium text-foreground">{node.name}</p>
                  <p className="text-muted-foreground capitalize">{node.status.replace('_', ' ')}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px]">
                    <span className="text-info">Traffic: {node.traffic.toFixed(0)}%</span>
                    <span className="text-warning">Latency: {node.latency.toFixed(1)}ms</span>
                  </div>
                </div>
              </div>

              {(node.status === "scanning" || node.status === "under_attack") && (
                <div className={cn(
                  "absolute inset-0 rounded-lg border-2 animate-ping opacity-30",
                  node.status === "under_attack" ? "border-destructive" : "border-info"
                )} />
              )}
            </div>
          );
        })}

        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex items-center gap-3 text-[9px] sm:text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span>Online ({nodeStats.online})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span>Warning ({nodeStats.warning})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span>Critical ({nodeStats.critical})</span>
          </div>
        </div>

        {/* Status indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[10px] text-success">
          <Activity className="w-3 h-3 animate-pulse" />
          <span>LIVE</span>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("cyber-card overflow-hidden", className, isFullscreen && "fixed inset-4 z-50")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary animate-pulse" />
            Advanced Network Topology
            <Badge variant="outline" className="ml-2 bg-success/10 text-success border-success/30">
              <Activity className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
              <SelectTrigger className="w-28 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="logical">Logical</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowTrafficFlow(!showTrafficFlow)}>
              <Activity className={cn("h-4 w-4", showTrafficFlow && "text-primary")} />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setAnimating(!animating)}>
              {animating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mt-3">
          <div className="text-center p-1.5 rounded bg-secondary/50 border border-border/50">
            <p className="text-xs text-muted-foreground">Nodes</p>
            <p className="text-sm font-bold">{nodeStats.total}</p>
          </div>
          <div className="text-center p-1.5 rounded bg-success/10 border border-success/30">
            <p className="text-xs text-muted-foreground">Online</p>
            <p className="text-sm font-bold text-success">{nodeStats.online}</p>
          </div>
          <div className="text-center p-1.5 rounded bg-warning/10 border border-warning/30">
            <p className="text-xs text-muted-foreground">Warning</p>
            <p className="text-sm font-bold text-warning">{nodeStats.warning}</p>
          </div>
          <div className="text-center p-1.5 rounded bg-destructive/10 border border-destructive/30">
            <p className="text-xs text-muted-foreground">Critical</p>
            <p className="text-sm font-bold text-destructive">{nodeStats.critical}</p>
          </div>
          <div className="text-center p-1.5 rounded bg-secondary/50 border border-border/50">
            <p className="text-xs text-muted-foreground">Links</p>
            <p className="text-sm font-bold">{connectionStats.total}</p>
          </div>
          <div className="text-center p-1.5 rounded bg-success/10 border border-success/30">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-sm font-bold text-success">{connectionStats.active}</p>
          </div>
          <div className="text-center p-1.5 rounded bg-warning/10 border border-warning/30">
            <p className="text-xs text-muted-foreground">Congested</p>
            <p className="text-sm font-bold text-warning">{connectionStats.congested}</p>
          </div>
          <div className="text-center p-1.5 rounded bg-primary/10 border border-primary/30">
            <p className="text-xs text-muted-foreground">Encrypted</p>
            <p className="text-sm font-bold text-primary">{connectionStats.encrypted}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative" style={{ height: isFullscreen ? 'calc(100vh - 220px)' : '450px' }}>
          {/* SVG Layer for topology */}
          <svg className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id="glow-green-topo">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="glow-red-topo">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Connection lines */}
            {topology.connections.map((conn, i) => {
              const fromNode = topology.nodes.find(n => n.id === conn.from);
              const toNode = topology.nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              const isActive = activeConnections.has(`${conn.from}-${conn.to}`);
              const isThreat = conn.status === 'threat' || fromNode.status === 'under_attack' || toNode.status === 'under_attack';

              return (
                <g key={i}>
                  <line
                    x1={`${fromNode.x}%`}
                    y1={`${fromNode.y}%`}
                    x2={`${toNode.x}%`}
                    y2={`${toNode.y}%`}
                    stroke={getConnectionColor(conn.from, conn.to)}
                    strokeWidth={isThreat ? 3 : isActive ? 2 : 1}
                    strokeDasharray={isActive ? "none" : "4 4"}
                    filter={isThreat ? "url(#glow-red-topo)" : undefined}
                  />
                  {isActive && showTrafficFlow && (
                    <circle r="2.5" fill={conn.encrypted ? "hsl(142 76% 36%)" : "hsl(217 91% 60%)"}>
                      <animateMotion
                        dur={`${1 + Math.random()}s`}
                        repeatCount="indefinite"
                        path={`M${fromNode.x * 6},${fromNode.y * 4.5} L${toNode.x * 6},${toNode.y * 4.5}`}
                      />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {topology.nodes.map(node => {
              const Icon = NODE_ICONS[node.type] || Server;
              const colors = STATUS_COLORS[node.status] || STATUS_COLORS.online;
              const isSelected = selectedNode?.id === node.id;
              const isHovered = hoveredNode === node.id;
              const size = node.type === 'internet' || node.type === 'firewall' ? 24 : 20;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x * 6}, ${node.y * 4.5})`}
                  onClick={() => handleNodeClick(node.id)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                  style={{ filter: node.status === 'critical' || node.status === 'under_attack' ? 'url(#glow-red-topo)' : isSelected ? 'url(#glow-green-topo)' : undefined }}
                >
                  {/* Selection ring */}
                  {(isSelected || isHovered) && (
                    <circle r={size + 6} className="fill-none stroke-primary/60" strokeWidth={2} strokeDasharray="3 2">
                      <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="6s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Traffic ring */}
                  <circle r={size + 3} className="fill-none" stroke="currentColor" strokeWidth={2} strokeDasharray={`${node.traffic * 0.6} 100`} opacity={0.3} transform="rotate(-90)" />

                  {/* Main circle */}
                  <circle r={size} className={cn(colors.bg)} stroke="currentColor" strokeWidth={isSelected ? 2.5 : 1.5} />

                  {/* Icon */}
                  <foreignObject x={-size/2} y={-size/2} width={size} height={size} className="pointer-events-none">
                    <div className={cn("w-full h-full flex items-center justify-center", colors.text)}>
                      <Icon className="w-1/2 h-1/2" />
                    </div>
                  </foreignObject>

                  {/* Threat badge */}
                  {node.threats > 0 && (
                    <g transform={`translate(${size - 4}, ${-size + 4})`}>
                      <circle r={6} className="fill-destructive" />
                      <text textAnchor="middle" dy="2.5" className="fill-white text-[8px] font-bold">{node.threats}</text>
                    </g>
                  )}

                  {/* Label */}
                  <text y={size + 12} textAnchor="middle" className="fill-foreground text-[8px] font-medium">
                    {node.name.length > 12 ? node.name.slice(0, 10) + '..' : node.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Zoom Controls */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2 bg-card/90 backdrop-blur-sm p-2 rounded-lg border border-border/50">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <span className="text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Legend */}
          <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg border border-border/50 text-xs space-y-1">
            <p className="font-medium mb-2">Legend</p>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-success" /><span>Online</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-warning" /><span>Warning</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-destructive" /><span>Critical</span></div>
            <div className="flex items-center gap-2 mt-2"><div className="w-6 h-0.5 bg-success" /><span>Encrypted</span></div>
            <div className="flex items-center gap-2"><div className="w-6 h-0.5 bg-info" /><span>Unencrypted</span></div>
          </div>

          {/* Selected Node Details */}
          {selectedNode && (
            <div className="absolute top-4 right-4 w-56 bg-card/95 backdrop-blur-sm p-4 rounded-lg border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = NODE_ICONS[selectedNode.type] || Server;
                    const colors = STATUS_COLORS[selectedNode.status] || STATUS_COLORS.online;
                    return <Icon className={cn("h-5 w-5", colors.text)} />;
                  })()}
                  <span className="font-medium text-sm">{selectedNode.name}</span>
                </div>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSelectedNode(null)}>×</Button>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className={cn("text-[9px]", STATUS_COLORS[selectedNode.status]?.bg, STATUS_COLORS[selectedNode.status]?.text)}>
                    {selectedNode.status.toUpperCase().replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{selectedNode.type}</span></div>
                {selectedNode.ipAddress && <div className="flex justify-between"><span className="text-muted-foreground">IP</span><span className="font-mono text-[10px]">{selectedNode.ipAddress}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Zone</span><span className="capitalize">{selectedNode.zone}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Traffic</span><span>{selectedNode.traffic.toFixed(0)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Latency</span><span>{selectedNode.latency.toFixed(1)}ms</span></div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"><Eye className="h-3 w-3 mr-1" />Details</Button>
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"><Settings className="h-3 w-3 mr-1" />Config</Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkTopology;
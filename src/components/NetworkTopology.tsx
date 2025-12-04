import { cn } from "@/lib/utils";
import { 
  Shield, 
  Globe, 
  Server, 
  Database, 
  Cloud, 
  Lock,
  Wifi,
  Cpu
} from "lucide-react";

interface NetworkNode {
  id: string;
  name: string;
  type: "shield" | "server" | "database" | "cloud" | "endpoint" | "firewall";
  status: "online" | "warning" | "offline" | "scanning";
  x: number;
  y: number;
}

interface NetworkTopologyProps {
  className?: string;
}

const nodes: NetworkNode[] = [
  { id: "1", name: "Firewall", type: "firewall", status: "online", x: 50, y: 20 },
  { id: "2", name: "Web Server", type: "server", status: "online", x: 25, y: 45 },
  { id: "3", name: "App Server", type: "server", status: "scanning", x: 50, y: 45 },
  { id: "4", name: "DB Server", type: "database", status: "online", x: 75, y: 45 },
  { id: "5", name: "Cloud Gateway", type: "cloud", status: "online", x: 50, y: 70 },
  { id: "6", name: "Endpoint 1", type: "endpoint", status: "online", x: 15, y: 85 },
  { id: "7", name: "Endpoint 2", type: "endpoint", status: "warning", x: 50, y: 85 },
  { id: "8", name: "Endpoint 3", type: "endpoint", status: "online", x: 85, y: 85 },
];

const connections = [
  ["1", "2"], ["1", "3"], ["1", "4"],
  ["2", "5"], ["3", "5"], ["4", "5"],
  ["5", "6"], ["5", "7"], ["5", "8"],
];

export const NetworkTopology = ({ className }: NetworkTopologyProps) => {
  const getIcon = (type: NetworkNode["type"]) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case "shield": return <Shield className={iconClass} />;
      case "firewall": return <Lock className={iconClass} />;
      case "server": return <Server className={iconClass} />;
      case "database": return <Database className={iconClass} />;
      case "cloud": return <Cloud className={iconClass} />;
      case "endpoint": return <Cpu className={iconClass} />;
      default: return <Globe className={iconClass} />;
    }
  };

  const getStatusColor = (status: NetworkNode["status"]) => {
    switch (status) {
      case "online": return "bg-success border-success/50 text-success";
      case "warning": return "bg-warning border-warning/50 text-warning";
      case "offline": return "bg-destructive border-destructive/50 text-destructive";
      case "scanning": return "bg-info border-info/50 text-info animate-pulse";
      default: return "bg-muted border-muted text-muted-foreground";
    }
  };

  return (
    <div className={cn("relative w-full h-64 cyber-grid-dense rounded-lg overflow-hidden", className)}>
      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {connections.map(([from, to], i) => {
          const fromNode = nodes.find(n => n.id === from);
          const toNode = nodes.find(n => n.id === to);
          if (!fromNode || !toNode) return null;
          
          return (
            <line
              key={i}
              x1={`${fromNode.x}%`}
              y1={`${fromNode.y}%`}
              x2={`${toNode.x}%`}
              y2={`${toNode.y}%`}
              stroke="hsl(185 100% 50% / 0.2)"
              strokeWidth="1"
              strokeDasharray="4 4"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="8"
                dur="1s"
                repeatCount="indefinite"
              />
            </line>
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
              "w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-all duration-300",
              "bg-card/80 backdrop-blur-sm hover:scale-110 cursor-pointer",
              getStatusColor(node.status)
            )}
          >
            {getIcon(node.type)}
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-card border border-border rounded px-2 py-1 text-xs whitespace-nowrap">
              <p className="font-medium text-foreground">{node.name}</p>
              <p className="text-muted-foreground capitalize">{node.status}</p>
            </div>
          </div>

          {/* Status pulse for scanning */}
          {node.status === "scanning" && (
            <div className="absolute inset-0 rounded-lg border-2 border-info animate-ping opacity-30" />
          )}
        </div>
      ))}
    </div>
  );
};

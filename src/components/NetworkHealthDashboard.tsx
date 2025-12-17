import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Network, 
  Thermometer,
  Wifi,
  Server,
  Database,
  Globe,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3
} from 'lucide-react';

interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  threshold: { warning: number; critical: number };
}

interface NetworkNode {
  id: string;
  name: string;
  type: 'server' | 'router' | 'switch' | 'firewall' | 'endpoint';
  status: 'online' | 'offline' | 'degraded';
  health: number;
  latency: number;
  uptime: string;
  lastCheck: string;
}

interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  source: string;
  timestamp: string;
}

export const NetworkHealthDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthMetric[]>([
    { name: 'CPU Usage', value: 45, unit: '%', status: 'healthy', trend: 'stable', icon: <Cpu className="h-5 w-5" />, threshold: { warning: 70, critical: 90 } },
    { name: 'Memory Usage', value: 62, unit: '%', status: 'healthy', trend: 'up', icon: <HardDrive className="h-5 w-5" />, threshold: { warning: 75, critical: 90 } },
    { name: 'Network Throughput', value: 847, unit: 'Mbps', status: 'healthy', trend: 'up', icon: <Network className="h-5 w-5" />, threshold: { warning: 900, critical: 950 } },
    { name: 'Disk I/O', value: 234, unit: 'MB/s', status: 'healthy', trend: 'stable', icon: <Database className="h-5 w-5" />, threshold: { warning: 400, critical: 500 } },
    { name: 'System Temperature', value: 58, unit: '°C', status: 'healthy', trend: 'stable', icon: <Thermometer className="h-5 w-5" />, threshold: { warning: 70, critical: 85 } },
    { name: 'Active Connections', value: 1247, unit: '', status: 'healthy', trend: 'up', icon: <Globe className="h-5 w-5" />, threshold: { warning: 2000, critical: 3000 } },
    { name: 'Packet Loss', value: 0.02, unit: '%', status: 'healthy', trend: 'down', icon: <Wifi className="h-5 w-5" />, threshold: { warning: 1, critical: 5 } },
    { name: 'Security Score', value: 94, unit: '/100', status: 'healthy', trend: 'up', icon: <Shield className="h-5 w-5" />, threshold: { warning: 80, critical: 60 } }
  ]);

  const [nodes, setNodes] = useState<NetworkNode[]>([
    { id: 'fw-01', name: 'Primary Firewall', type: 'firewall', status: 'online', health: 98, latency: 2, uptime: '99.99%', lastCheck: '2s ago' },
    { id: 'rt-01', name: 'Core Router', type: 'router', status: 'online', health: 96, latency: 1, uptime: '99.97%', lastCheck: '1s ago' },
    { id: 'sw-01', name: 'Distribution Switch A', type: 'switch', status: 'online', health: 100, latency: 0, uptime: '99.99%', lastCheck: '3s ago' },
    { id: 'sw-02', name: 'Distribution Switch B', type: 'switch', status: 'online', health: 99, latency: 1, uptime: '99.98%', lastCheck: '2s ago' },
    { id: 'srv-01', name: 'Application Server 1', type: 'server', status: 'online', health: 87, latency: 5, uptime: '99.95%', lastCheck: '4s ago' },
    { id: 'srv-02', name: 'Database Server', type: 'server', status: 'degraded', health: 72, latency: 12, uptime: '99.80%', lastCheck: '6s ago' },
    { id: 'srv-03', name: 'Security Server', type: 'server', status: 'online', health: 95, latency: 3, uptime: '99.99%', lastCheck: '1s ago' }
  ]);

  const [alerts, setAlerts] = useState<SystemAlert[]>([
    { id: '1', severity: 'warning', message: 'Database server experiencing high latency', source: 'srv-02', timestamp: '2 min ago' },
    { id: '2', severity: 'info', message: 'Scheduled maintenance window approaching', source: 'System', timestamp: '15 min ago' },
    { id: '3', severity: 'info', message: 'Backup completed successfully', source: 'srv-01', timestamp: '1 hour ago' }
  ]);

  const [overallHealth, setOverallHealth] = useState(94);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(m => ({
        ...m,
        value: m.name === 'Security Score' ? m.value : 
          Math.max(0, m.value + (Math.random() - 0.5) * (m.value * 0.05)),
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
        status: getStatus(m.value, m.threshold)
      })));

      setNodes(prev => prev.map(n => ({
        ...n,
        health: Math.min(100, Math.max(50, n.health + (Math.random() - 0.5) * 5)),
        latency: Math.max(0, n.latency + (Math.random() - 0.5) * 2),
        lastCheck: `${Math.floor(Math.random() * 5) + 1}s ago`
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatus = (value: number, threshold: { warning: number; critical: number }): 'healthy' | 'warning' | 'critical' => {
    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'warning';
    return 'healthy';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-400';
      case 'warning':
      case 'degraded':
        return 'text-yellow-400';
      case 'critical':
      case 'offline':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'bg-green-500/20 border-green-500/30';
      case 'warning':
      case 'degraded':
        return 'bg-yellow-500/20 border-yellow-500/30';
      case 'critical':
      case 'offline':
        return 'bg-red-500/20 border-red-500/30';
      default:
        return 'bg-muted/20 border-border';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'server':
        return <Server className="h-5 w-5" />;
      case 'router':
        return <Network className="h-5 w-5" />;
      case 'switch':
        return <Zap className="h-5 w-5" />;
      case 'firewall':
        return <Shield className="h-5 w-5" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Overall Health Score */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold">Network Health Overview</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Real-time infrastructure monitoring</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-3xl sm:text-5xl font-bold text-primary">{overallHealth}%</div>
              <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                System Healthy
              </div>
            </div>
          </div>
          <Progress value={overallHealth} className="h-2 sm:h-3 mt-3 sm:mt-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-3 sm:mt-4">
            <div className="text-center p-2 rounded-lg bg-green-500/10">
              <div className="text-lg sm:text-2xl font-bold text-green-400">{nodes.filter(n => n.status === 'online').length}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Online</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-yellow-500/10">
              <div className="text-lg sm:text-2xl font-bold text-yellow-400">{nodes.filter(n => n.status === 'degraded').length}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Degraded</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-500/10">
              <div className="text-lg sm:text-2xl font-bold text-red-400">{nodes.filter(n => n.status === 'offline').length}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Offline</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-primary/10">
              <div className="text-lg sm:text-2xl font-bold text-primary">{alerts.filter(a => a.severity === 'critical').length}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Critical</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {metrics.map((metric, idx) => (
          <Card key={idx} className={`border ${getStatusBg(metric.status)}`}>
            <CardContent className="pt-3 sm:pt-4 px-2 sm:px-4">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <div className={`${getStatusColor(metric.status)} [&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5`}>
                  {metric.icon}
                </div>
                <div className="[&>svg]:h-3 [&>svg]:w-3 sm:[&>svg]:h-4 sm:[&>svg]:w-4">
                  {getTrendIcon(metric.trend)}
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold">
                {typeof metric.value === 'number' ? metric.value.toFixed(metric.unit === '%' ? 1 : 0) : metric.value}
                <span className="text-[10px] sm:text-sm font-normal text-muted-foreground ml-0.5 sm:ml-1">{metric.unit}</span>
              </div>
              <div className="text-[10px] sm:text-sm text-muted-foreground truncate">{metric.name}</div>
              <div className="mt-1 sm:mt-2">
                <Progress 
                  value={metric.name === 'Security Score' ? metric.value : (metric.value / metric.threshold.critical) * 100} 
                  className="h-0.5 sm:h-1"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Network Nodes */}
        <Card className="bg-card/50 backdrop-blur border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              Infrastructure Nodes
            </CardTitle>
            <CardDescription>Real-time node health monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {nodes.map(node => (
                  <div 
                    key={node.id}
                    className={`p-3 rounded-lg border ${getStatusBg(node.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={getStatusColor(node.status)}>
                          {getNodeIcon(node.type)}
                        </div>
                        <div>
                          <div className="font-semibold">{node.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {node.type.toUpperCase()} • {node.id}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={node.status === 'online' ? 'default' : node.status === 'degraded' ? 'secondary' : 'destructive'}>
                          {node.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-3 text-center text-xs">
                      <div>
                        <div className="font-bold">{node.health}%</div>
                        <div className="text-muted-foreground">Health</div>
                      </div>
                      <div>
                        <div className="font-bold">{node.latency}ms</div>
                        <div className="text-muted-foreground">Latency</div>
                      </div>
                      <div>
                        <div className="font-bold">{node.uptime}</div>
                        <div className="text-muted-foreground">Uptime</div>
                      </div>
                      <div>
                        <div className="font-bold">{node.lastCheck}</div>
                        <div className="text-muted-foreground">Last Check</div>
                      </div>
                    </div>
                    <Progress value={node.health} className="h-1 mt-2" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card className="bg-card/50 backdrop-blur border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              System Alerts
            </CardTitle>
            <CardDescription>Recent system notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                      alert.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                      'bg-blue-500/10 border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={
                        alert.severity === 'critical' ? 'text-red-400' :
                        alert.severity === 'warning' ? 'text-yellow-400' :
                        'text-blue-400'
                      }>
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{alert.message}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <span>{alert.source}</span>
                          <span>•</span>
                          <span>{alert.timestamp}</span>
                        </div>
                      </div>
                      <Badge variant={
                        alert.severity === 'critical' ? 'destructive' :
                        alert.severity === 'warning' ? 'secondary' :
                        'outline'
                      }>
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics Chart Area */}
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Performance Trends
          </CardTitle>
          <CardDescription>24-hour performance metrics visualization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center bg-background/30 rounded-lg border border-dashed border-primary/30">
            <div className="text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50 animate-pulse" />
              <p>Real-time metrics streaming...</p>
              <p className="text-xs mt-1">Collecting performance data across all nodes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NetworkHealthDashboard;

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  Zap,
  Clock,
  Target,
  BarChart3,
  Settings,
  Bell,
  Shield,
  Gauge,
  Wifi,
  ArrowUpDown,
  RefreshCw,
  Play,
  Pause,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from "recharts";

interface BaselineMetric {
  name: string;
  current: number;
  baseline: number;
  min: number;
  max: number;
  unit: string;
  status: 'normal' | 'warning' | 'anomaly';
  deviation: number;
  trend: 'up' | 'down' | 'stable';
}

interface AnomalyEvent {
  id: string;
  timestamp: string;
  metric: string;
  expected: number;
  actual: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
}

interface BandwidthControl {
  deviceId: string;
  deviceName: string;
  maxBandwidth: number;
  currentUsage: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  throttled: boolean;
}

interface NetworkPerformanceBaselineProps {
  className?: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-warning/10 text-warning border-warning/30',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
};

export const NetworkPerformanceBaseline = ({ className }: NetworkPerformanceBaselineProps) => {
  const [isLearning, setIsLearning] = useState(false);
  const [learningProgress, setLearningProgress] = useState(0);
  const [baselineEstablished, setBaselineEstablished] = useState(false);
  const [anomalyThreshold, setAnomalyThreshold] = useState([20]);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [autoThrottle, setAutoThrottle] = useState(false);
  const { toast } = useToast();

  const [metrics, setMetrics] = useState<BaselineMetric[]>([
    { name: 'Bandwidth Usage', current: 45, baseline: 42, min: 20, max: 80, unit: 'Mbps', status: 'normal', deviation: 7, trend: 'up' },
    { name: 'Latency', current: 12, baseline: 15, min: 5, max: 50, unit: 'ms', status: 'normal', deviation: -20, trend: 'down' },
    { name: 'Packet Loss', current: 0.5, baseline: 0.3, min: 0, max: 5, unit: '%', status: 'warning', deviation: 66, trend: 'up' },
    { name: 'Connection Count', current: 1250, baseline: 1100, min: 500, max: 2000, unit: '', status: 'normal', deviation: 13, trend: 'up' },
    { name: 'Error Rate', current: 2.1, baseline: 1.5, min: 0, max: 10, unit: '%', status: 'warning', deviation: 40, trend: 'up' },
    { name: 'Throughput', current: 890, baseline: 850, min: 400, max: 1000, unit: 'Mbps', status: 'normal', deviation: 4, trend: 'stable' },
  ]);

  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([
    { id: '1', timestamp: new Date(Date.now() - 300000).toISOString(), metric: 'Packet Loss', expected: 0.3, actual: 2.5, deviation: 733, severity: 'high', status: 'active' },
    { id: '2', timestamp: new Date(Date.now() - 900000).toISOString(), metric: 'Latency Spike', expected: 15, actual: 85, deviation: 466, severity: 'critical', status: 'acknowledged' },
    { id: '3', timestamp: new Date(Date.now() - 1800000).toISOString(), metric: 'Bandwidth Surge', expected: 42, actual: 95, deviation: 126, severity: 'medium', status: 'resolved' },
  ]);

  const [bandwidthControls, setBandwidthControls] = useState<BandwidthControl[]>([
    { deviceId: '1', deviceName: 'Main Server', maxBandwidth: 100, currentUsage: 45, priority: 'critical', throttled: false },
    { deviceId: '2', deviceName: 'Database Server', maxBandwidth: 80, currentUsage: 62, priority: 'high', throttled: false },
    { deviceId: '3', deviceName: 'Web Server 1', maxBandwidth: 50, currentUsage: 38, priority: 'normal', throttled: false },
    { deviceId: '4', deviceName: 'IoT Gateway', maxBandwidth: 20, currentUsage: 18, priority: 'low', throttled: true },
    { deviceId: '5', deviceName: 'Backup Server', maxBandwidth: 30, currentUsage: 5, priority: 'low', throttled: false },
  ]);

  const [trafficHistory, setTrafficHistory] = useState(() => 
    Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      actual: 40 + Math.random() * 30 + (i >= 9 && i <= 17 ? 20 : 0),
      baseline: 45 + (i >= 9 && i <= 17 ? 15 : 0),
      upperBound: 60 + (i >= 9 && i <= 17 ? 20 : 0),
      lowerBound: 30 + (i >= 9 && i <= 17 ? 10 : 0),
    }))
  );

  // Simulate real-time metric updates
  useEffect(() => {
    if (!baselineEstablished) return;

    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => {
        const change = (Math.random() - 0.5) * 5;
        const newCurrent = Math.max(metric.min, Math.min(metric.max, metric.current + change));
        const newDeviation = Math.round(((newCurrent - metric.baseline) / metric.baseline) * 100);
        
        let status: 'normal' | 'warning' | 'anomaly' = 'normal';
        if (Math.abs(newDeviation) > anomalyThreshold[0] * 2) status = 'anomaly';
        else if (Math.abs(newDeviation) > anomalyThreshold[0]) status = 'warning';

        // Generate anomaly alert
        if (status === 'anomaly' && alertsEnabled && metric.status !== 'anomaly') {
          const newAnomaly: AnomalyEvent = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            metric: metric.name,
            expected: metric.baseline,
            actual: newCurrent,
            deviation: newDeviation,
            severity: Math.abs(newDeviation) > anomalyThreshold[0] * 3 ? 'critical' : 'high',
            status: 'active',
          };
          setAnomalies(prev => [newAnomaly, ...prev.slice(0, 19)]);
          
          toast({
            title: "Anomaly Detected",
            description: `${metric.name} deviated ${Math.abs(newDeviation)}% from baseline`,
            variant: "destructive",
          });
        }

        return {
          ...metric,
          current: Math.round(newCurrent * 100) / 100,
          deviation: newDeviation,
          status,
          trend: change > 1 ? 'up' : change < -1 ? 'down' : 'stable',
        };
      }));

      // Update traffic history
      setTrafficHistory(prev => {
        const newData = [...prev.slice(1)];
        const lastHour = parseInt(prev[prev.length - 1].hour);
        const nextHour = (lastHour + 1) % 24;
        newData.push({
          hour: `${nextHour}:00`,
          actual: 40 + Math.random() * 30 + (nextHour >= 9 && nextHour <= 17 ? 20 : 0),
          baseline: 45 + (nextHour >= 9 && nextHour <= 17 ? 15 : 0),
          upperBound: 60 + (nextHour >= 9 && nextHour <= 17 ? 20 : 0),
          lowerBound: 30 + (nextHour >= 9 && nextHour <= 17 ? 10 : 0),
        });
        return newData;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [baselineEstablished, anomalyThreshold, alertsEnabled, toast]);

  const startLearning = useCallback(() => {
    setIsLearning(true);
    setLearningProgress(0);

    const interval = setInterval(() => {
      setLearningProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsLearning(false);
          setBaselineEstablished(true);
          toast({
            title: "Baseline Established",
            description: "Network performance baseline has been learned. Anomaly detection is now active.",
          });
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  }, [toast]);

  const acknowledgeAnomaly = (id: string) => {
    setAnomalies(prev => prev.map(a => 
      a.id === id ? { ...a, status: 'acknowledged' as const } : a
    ));
  };

  const resolveAnomaly = (id: string) => {
    setAnomalies(prev => prev.map(a => 
      a.id === id ? { ...a, status: 'resolved' as const } : a
    ));
  };

  const updateBandwidthLimit = (deviceId: string, newLimit: number) => {
    setBandwidthControls(prev => prev.map(d =>
      d.deviceId === deviceId ? { ...d, maxBandwidth: newLimit } : d
    ));
  };

  const toggleThrottle = (deviceId: string) => {
    setBandwidthControls(prev => prev.map(d =>
      d.deviceId === deviceId ? { ...d, throttled: !d.throttled } : d
    ));
  };

  const updatePriority = (deviceId: string, priority: 'low' | 'normal' | 'high' | 'critical') => {
    setBandwidthControls(prev => prev.map(d =>
      d.deviceId === deviceId ? { ...d, priority } : d
    ));
  };

  const activeAnomalies = anomalies.filter(a => a.status === 'active').length;

  return (
    <Card className={cn("cyber-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-primary animate-pulse" />
            Network Performance Baseline
            {activeAnomalies > 0 && (
              <Badge variant="destructive" className="ml-2 animate-pulse">
                {activeAnomalies} Active Anomalies
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!baselineEstablished ? (
              <Button
                size="sm"
                onClick={startLearning}
                disabled={isLearning}
                className="h-7"
              >
                {isLearning ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Learning... {learningProgress}%
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Learn Baseline
                  </>
                )}
              </Button>
            ) : (
              <Badge className="bg-success/10 text-success border-success/30">
                <Check className="h-3 w-3 mr-1" />
                Baseline Active
              </Badge>
            )}
          </div>
        </div>
        {isLearning && (
          <div className="mt-3">
            <Progress value={learningProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Analyzing traffic patterns to establish normal baseline...
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="metrics" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="metrics" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="text-xs relative">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Anomalies
              {activeAnomalies > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center">
                  {activeAnomalies}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="bandwidth" className="text-xs">
              <Gauge className="h-3 w-3 mr-1" />
              Bandwidth
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="space-y-4">
            {/* Traffic Chart */}
            <div className="h-48 bg-secondary/20 rounded-lg p-3 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Traffic vs Baseline (24h)</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Actual
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    Baseline
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={trafficHistory}>
                  <defs>
                    <linearGradient id="baselineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222 47% 11%)',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="upperBound" stroke="none" fill="hsl(var(--warning))" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="lowerBound" stroke="none" fill="hsl(var(--background))" />
                  <Line type="monotone" dataKey="baseline" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                  <Area type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#actualGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {metrics.map((metric) => (
                <div
                  key={metric.name}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    metric.status === 'anomaly' && "border-destructive/50 bg-destructive/5 animate-pulse",
                    metric.status === 'warning' && "border-warning/50 bg-warning/5",
                    metric.status === 'normal' && "border-border/50 bg-secondary/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{metric.name}</span>
                    {metric.status === 'anomaly' && <AlertTriangle className="h-3 w-3 text-destructive" />}
                    {metric.status === 'warning' && <AlertTriangle className="h-3 w-3 text-warning" />}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold">{metric.current}</span>
                    <span className="text-xs text-muted-foreground">{metric.unit}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      Baseline: {metric.baseline}{metric.unit}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5",
                        metric.deviation > 0 ? "text-warning" : "text-success"
                      )}
                    >
                      {metric.trend === 'up' && <TrendingUp className="h-2.5 w-2.5 mr-0.5" />}
                      {metric.trend === 'down' && <TrendingDown className="h-2.5 w-2.5 mr-0.5" />}
                      {metric.deviation > 0 ? '+' : ''}{metric.deviation}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-3">
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-4">
                {anomalies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No anomalies detected</p>
                  </div>
                ) : (
                  anomalies.map((anomaly) => (
                    <div
                      key={anomaly.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        anomaly.status === 'active' && "animate-pulse",
                        SEVERITY_STYLES[anomaly.severity]
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={SEVERITY_STYLES[anomaly.severity]}>
                              {anomaly.severity.toUpperCase()}
                            </Badge>
                            <span className="text-sm font-medium">{anomaly.metric}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Expected: {anomaly.expected} → Actual: {anomaly.actual} ({anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation}% deviation)
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(anomaly.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              anomaly.status === 'active' && "text-destructive",
                              anomaly.status === 'acknowledged' && "text-warning",
                              anomaly.status === 'resolved' && "text-success"
                            )}
                          >
                            {anomaly.status}
                          </Badge>
                          {anomaly.status === 'active' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={() => acknowledgeAnomaly(anomaly.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                          {anomaly.status === 'acknowledged' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={() => resolveAnomaly(anomaly.id)}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="bandwidth" className="space-y-3">
            <ScrollArea className="h-64">
              <div className="space-y-3 pr-4">
                {bandwidthControls.map((device) => (
                  <div
                    key={device.deviceId}
                    className={cn(
                      "p-3 rounded-lg border border-border/50 bg-secondary/20",
                      device.throttled && "border-warning/50 bg-warning/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Wifi className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{device.deviceName}</span>
                        {device.throttled && (
                          <Badge variant="outline" className="text-warning border-warning/30 text-[10px]">
                            THROTTLED
                          </Badge>
                        )}
                      </div>
                      <Select
                        value={device.priority}
                        onValueChange={(v: any) => updatePriority(device.deviceId, v)}
                      >
                        <SelectTrigger className="w-24 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Usage: {device.currentUsage} / {device.maxBandwidth} Mbps
                        </span>
                        <span className={cn(
                          device.currentUsage / device.maxBandwidth > 0.9 ? "text-destructive" :
                          device.currentUsage / device.maxBandwidth > 0.7 ? "text-warning" : "text-success"
                        )}>
                          {Math.round((device.currentUsage / device.maxBandwidth) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={(device.currentUsage / device.maxBandwidth) * 100} 
                        className="h-1.5"
                      />
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Max Bandwidth</Label>
                        <Slider
                          value={[device.maxBandwidth]}
                          onValueChange={([v]) => updateBandwidthLimit(device.deviceId, v)}
                          max={200}
                          min={10}
                          step={10}
                          className="w-24"
                        />
                        <span className="text-xs text-muted-foreground w-12">{device.maxBandwidth} Mbps</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Throttle</Label>
                        <Switch
                          checked={device.throttled}
                          onCheckedChange={() => toggleThrottle(device.deviceId)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Anomaly Alerts</Label>
                  <p className="text-xs text-muted-foreground">Receive alerts when anomalies are detected</p>
                </div>
                <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Auto-Throttle</Label>
                  <p className="text-xs text-muted-foreground">Automatically throttle devices during anomalies</p>
                </div>
                <Switch checked={autoThrottle} onCheckedChange={setAutoThrottle} />
              </div>

              <div className="p-3 rounded-lg border border-border/50 bg-secondary/20 space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Anomaly Threshold</Label>
                  <p className="text-xs text-muted-foreground">
                    Deviation percentage to trigger anomaly detection: {anomalyThreshold[0]}%
                  </p>
                </div>
                <Slider
                  value={anomalyThreshold}
                  onValueChange={setAnomalyThreshold}
                  max={50}
                  min={5}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Sensitive (5%)</span>
                  <span>Balanced (25%)</span>
                  <span>Relaxed (50%)</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setBaselineEstablished(false);
                  setLearningProgress(0);
                  toast({
                    title: "Baseline Reset",
                    description: "You can now learn a new baseline",
                  });
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Baseline
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

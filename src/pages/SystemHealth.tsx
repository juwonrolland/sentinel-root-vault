import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface HealthMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  status: "healthy" | "warning" | "critical";
  metadata: any;
  recorded_at: string;
}

export default function SystemHealth() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadMetrics();
    setupRealtime();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from("system_health")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      console.error("Error loading metrics:", error);
      toast.error("Failed to load system health metrics");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel('system-health-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_health'
        },
        (payload) => {
          setMetrics(prev => [payload.new as HealthMetric, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: "default",
      warning: "secondary",
      critical: "destructive"
    };
    return <Badge variant={variants[status as keyof typeof variants] as any}>{status}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    if (status === "healthy") return <Activity className="h-4 w-4 text-green-500" />;
    if (status === "warning") return <TrendingDown className="h-4 w-4 text-yellow-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">System Health</h1>
            <p className="text-muted-foreground">Real-time system performance monitoring</p>
          </div>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {["cpu_usage", "memory_usage", "network_latency"].map((metricType) => {
            const latestMetric = metrics.find(m => m.metric_name === metricType);
            return (
              <Card key={metricType}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(latestMetric?.status || "healthy")}
                    {metricType.replace(/_/g, " ").toUpperCase()}
                  </CardTitle>
                  <CardDescription>
                    {latestMetric ? getStatusBadge(latestMetric.status) : "No data"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {latestMetric ? `${latestMetric.metric_value.toFixed(2)}${metricType.includes('latency') ? 'ms' : '%'}` : "N/A"}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Metric History</CardTitle>
            <CardDescription>All system health metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recorded At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric) => (
                  <TableRow key={metric.id}>
                    <TableCell className="font-medium">{metric.metric_name}</TableCell>
                    <TableCell>{metric.metric_value.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(metric.status)}</TableCell>
                    <TableCell>{new Date(metric.recorded_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
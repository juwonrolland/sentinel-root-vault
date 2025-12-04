import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { cn } from "@/lib/utils";
import { format, subHours, startOfHour } from "date-fns";

interface HourlyData {
  hour: string;
  timestamp: Date;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface ThreatAnalyticsChartProps {
  className?: string;
  variant?: "area" | "bar";
  showLegend?: boolean;
  hours?: number;
}

const severityColors = {
  critical: "#ff4757",
  high: "#ffa502",
  medium: "#00d4ff",
  low: "#2ed573",
};

export const ThreatAnalyticsChart = ({
  className,
  variant = "area",
  showLegend = true,
  hours = 24,
}: ThreatAnalyticsChartProps) => {
  const [data, setData] = useState<HourlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();

    // Real-time subscription
    const channel = supabase
      .channel('threat-analytics')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_events'
        },
        () => {
          // Reload data on new event
          loadAnalytics();
        }
      )
      .subscribe();

    // Auto-refresh every minute
    const interval = setInterval(loadAnalytics, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [hours]);

  const loadAnalytics = async () => {
    const startTime = subHours(new Date(), hours);

    const { data: events, error } = await supabase
      .from('security_events')
      .select('severity, detected_at')
      .gte('detected_at', startTime.toISOString())
      .order('detected_at', { ascending: true });

    if (error) {
      console.error('Error loading analytics:', error);
      setIsLoading(false);
      return;
    }

    // Generate hourly buckets
    const hourlyBuckets: Map<string, HourlyData> = new Map();
    
    for (let i = hours; i >= 0; i--) {
      const hourStart = startOfHour(subHours(new Date(), i));
      const key = format(hourStart, 'HH:mm');
      hourlyBuckets.set(key, {
        hour: key,
        timestamp: hourStart,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
      });
    }

    // Populate with actual data
    events?.forEach(event => {
      if (!event.detected_at) return;
      const eventHour = startOfHour(new Date(event.detected_at));
      const key = format(eventHour, 'HH:mm');
      
      const bucket = hourlyBuckets.get(key);
      if (bucket) {
        const severity = event.severity as keyof typeof severityColors;
        if (severity in bucket) {
          (bucket[severity] as number)++;
        }
        bucket.total++;
      }
    });

    setData(Array.from(hourlyBuckets.values()));
    setIsLoading(false);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-2 font-mono">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs capitalize text-foreground">{entry.name}</span>
              </div>
              <span className="text-xs font-mono font-bold" style={{ color: entry.color }}>
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={280}>
        {variant === "area" ? (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={severityColors.critical} stopOpacity={0.4} />
                <stop offset="95%" stopColor={severityColors.critical} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={severityColors.high} stopOpacity={0.4} />
                <stop offset="95%" stopColor={severityColors.high} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={severityColors.medium} stopOpacity={0.4} />
                <stop offset="95%" stopColor={severityColors.medium} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={severityColors.low} stopOpacity={0.4} />
                <stop offset="95%" stopColor={severityColors.low} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" vertical={false} />
            <XAxis
              dataKey="hour"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground capitalize">{value}</span>
                )}
              />
            )}
            <Area
              type="monotone"
              dataKey="critical"
              stackId="1"
              stroke={severityColors.critical}
              fill="url(#colorCritical)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="high"
              stackId="1"
              stroke={severityColors.high}
              fill="url(#colorHigh)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="medium"
              stackId="1"
              stroke={severityColors.medium}
              fill="url(#colorMedium)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="low"
              stackId="1"
              stroke={severityColors.low}
              fill="url(#colorLow)"
              strokeWidth={2}
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" vertical={false} />
            <XAxis
              dataKey="hour"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground capitalize">{value}</span>
                )}
              />
            )}
            <Bar dataKey="critical" stackId="a" fill={severityColors.critical} radius={[0, 0, 0, 0]} />
            <Bar dataKey="high" stackId="a" fill={severityColors.high} radius={[0, 0, 0, 0]} />
            <Bar dataKey="medium" stackId="a" fill={severityColors.medium} radius={[0, 0, 0, 0]} />
            <Bar dataKey="low" stackId="a" fill={severityColors.low} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

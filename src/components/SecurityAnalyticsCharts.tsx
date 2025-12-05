import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Activity, PieChart as PieChartIcon, BarChart3, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface SecurityAnalyticsChartsProps {
  className?: string;
}

interface ThreatTrend {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface AttackTypeData {
  name: string;
  value: number;
  percentage: number;
}

interface SeverityDistribution {
  name: string;
  value: number;
  color: string;
}

const SEVERITY_COLORS = {
  critical: "hsl(0, 84%, 60%)",
  high: "hsl(38, 92%, 50%)",
  medium: "hsl(185, 100%, 50%)",
  low: "hsl(142, 71%, 45%)",
};

const CHART_COLORS = [
  "hsl(185, 100%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(215, 100%, 60%)",
];

export const SecurityAnalyticsCharts = ({ className }: SecurityAnalyticsChartsProps) => {
  const [threatTrends, setThreatTrends] = useState<ThreatTrend[]>([]);
  const [attackTypes, setAttackTypes] = useState<AttackTypeData[]>([]);
  const [severityDistribution, setSeverityDistribution] = useState<SeverityDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
    
    const channel = supabase
      .channel('analytics-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'security_events'
      }, () => loadAnalyticsData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAnalyticsData = async () => {
    setLoading(true);
    
    // Get events from last 7 days
    const startDate = subDays(new Date(), 7);
    
    const { data: events } = await supabase
      .from('security_events')
      .select('*')
      .gte('detected_at', startDate.toISOString())
      .order('detected_at', { ascending: true });

    if (events) {
      // Process threat trends
      const days = eachDayOfInterval({ start: startDate, end: new Date() });
      const trends: ThreatTrend[] = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayEvents = events.filter(e => 
          format(new Date(e.detected_at), 'yyyy-MM-dd') === dayStr
        );
        
        return {
          date: format(day, 'MMM dd'),
          critical: dayEvents.filter(e => e.severity === 'critical').length,
          high: dayEvents.filter(e => e.severity === 'high').length,
          medium: dayEvents.filter(e => e.severity === 'medium').length,
          low: dayEvents.filter(e => e.severity === 'low').length,
          total: dayEvents.length,
        };
      });
      setThreatTrends(trends);

      // Process attack types
      const typeCount: Record<string, number> = {};
      events.forEach(e => {
        typeCount[e.event_type] = (typeCount[e.event_type] || 0) + 1;
      });
      
      const total = events.length || 1;
      const types: AttackTypeData[] = Object.entries(typeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value]) => ({
          name: name.length > 20 ? name.substring(0, 20) + '...' : name,
          value,
          percentage: Math.round((value / total) * 100),
        }));
      setAttackTypes(types);

      // Process severity distribution
      const severities: SeverityDistribution[] = [
        { name: 'Critical', value: events.filter(e => e.severity === 'critical').length, color: SEVERITY_COLORS.critical },
        { name: 'High', value: events.filter(e => e.severity === 'high').length, color: SEVERITY_COLORS.high },
        { name: 'Medium', value: events.filter(e => e.severity === 'medium').length, color: SEVERITY_COLORS.medium },
        { name: 'Low', value: events.filter(e => e.severity === 'low').length, color: SEVERITY_COLORS.low },
      ];
      setSeverityDistribution(severities);
    }
    
    setLoading(false);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
      {/* Threat Trends Over Time */}
      <Card className="cyber-card lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Threat Trends (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={threatTrends}>
                <defs>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SEVERITY_COLORS.critical} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={SEVERITY_COLORS.critical} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SEVERITY_COLORS.high} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={SEVERITY_COLORS.high} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SEVERITY_COLORS.medium} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={SEVERITY_COLORS.medium} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SEVERITY_COLORS.low} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={SEVERITY_COLORS.low} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(222 10% 50%)" 
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(222 10% 50%)" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Area
                  type="monotone"
                  dataKey="critical"
                  name="Critical"
                  stroke={SEVERITY_COLORS.critical}
                  fillOpacity={1}
                  fill="url(#colorCritical)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="high"
                  name="High"
                  stroke={SEVERITY_COLORS.high}
                  fillOpacity={1}
                  fill="url(#colorHigh)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="medium"
                  name="Medium"
                  stroke={SEVERITY_COLORS.medium}
                  fillOpacity={1}
                  fill="url(#colorMedium)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="low"
                  name="Low"
                  stroke={SEVERITY_COLORS.low}
                  fillOpacity={1}
                  fill="url(#colorLow)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Severity Distribution */}
      <Card className="cyber-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-primary" />
            Severity Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {severityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value, entry: any) => (
                    <span style={{ color: entry.color }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Attack Types Distribution */}
      <Card className="cyber-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Top Attack Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attackTypes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" horizontal={false} />
                <XAxis type="number" stroke="hsl(222 10% 50%)" fontSize={11} tickLine={false} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="hsl(222 10% 50%)" 
                  fontSize={10}
                  tickLine={false}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Events" radius={[0, 4, 4, 0]}>
                  {attackTypes.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

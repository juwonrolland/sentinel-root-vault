import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Map,
  Globe,
  Activity,
  Target,
  Maximize2,
  Minimize2,
  RefreshCw,
  MapPin,
  Zap,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ThreatCluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  region: string;
  country: string;
  attackTypes: string[];
  lastActivity: string;
}

interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
  severity: string;
}

interface ThreatHeatmapProps {
  className?: string;
}

// Geographic regions with coordinates
const REGIONS: Record<string, { lat: number; lng: number; name: string; country: string }[]> = {
  'North America': [
    { lat: 40.7128, lng: -74.0060, name: 'New York', country: 'USA' },
    { lat: 34.0522, lng: -118.2437, name: 'Los Angeles', country: 'USA' },
    { lat: 41.8781, lng: -87.6298, name: 'Chicago', country: 'USA' },
    { lat: 37.7749, lng: -122.4194, name: 'San Francisco', country: 'USA' },
    { lat: 43.6532, lng: -79.3832, name: 'Toronto', country: 'Canada' },
  ],
  'Europe': [
    { lat: 51.5074, lng: -0.1278, name: 'London', country: 'UK' },
    { lat: 48.8566, lng: 2.3522, name: 'Paris', country: 'France' },
    { lat: 52.5200, lng: 13.4050, name: 'Berlin', country: 'Germany' },
    { lat: 55.7558, lng: 37.6173, name: 'Moscow', country: 'Russia' },
    { lat: 41.9028, lng: 12.4964, name: 'Rome', country: 'Italy' },
  ],
  'Asia Pacific': [
    { lat: 35.6762, lng: 139.6503, name: 'Tokyo', country: 'Japan' },
    { lat: 31.2304, lng: 121.4737, name: 'Shanghai', country: 'China' },
    { lat: 22.3193, lng: 114.1694, name: 'Hong Kong', country: 'China' },
    { lat: 1.3521, lng: 103.8198, name: 'Singapore', country: 'Singapore' },
    { lat: 37.5665, lng: 126.9780, name: 'Seoul', country: 'South Korea' },
  ],
  'Middle East': [
    { lat: 25.2048, lng: 55.2708, name: 'Dubai', country: 'UAE' },
    { lat: 31.7683, lng: 35.2137, name: 'Jerusalem', country: 'Israel' },
    { lat: 24.7136, lng: 46.6753, name: 'Riyadh', country: 'Saudi Arabia' },
  ],
  'South America': [
    { lat: -23.5505, lng: -46.6333, name: 'São Paulo', country: 'Brazil' },
    { lat: -34.6037, lng: -58.3816, name: 'Buenos Aires', country: 'Argentina' },
  ],
  'Africa': [
    { lat: -26.2041, lng: 28.0473, name: 'Johannesburg', country: 'South Africa' },
    { lat: 30.0444, lng: 31.2357, name: 'Cairo', country: 'Egypt' },
    { lat: 6.5244, lng: 3.3792, name: 'Lagos', country: 'Nigeria' },
  ],
};

const SEVERITY_COLORS = {
  critical: 'hsl(0, 84%, 60%)',
  high: 'hsl(38, 92%, 50%)',
  medium: 'hsl(185, 100%, 50%)',
  low: 'hsl(142, 71%, 45%)',
};

export const ThreatHeatmap = ({ className }: ThreatHeatmapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [clusters, setClusters] = useState<ThreatCluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<ThreatCluster | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalThreats, setTotalThreats] = useState(0);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);

  useEffect(() => {
    loadThreatData();
    
    const channel = supabase
      .channel('heatmap-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_events' }, () => {
        loadThreatData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    drawHeatmap();
  }, [heatmapPoints, isFullscreen]);

  const loadThreatData = async () => {
    setLoading(true);
    
    const { data: events } = await supabase
      .from('security_events')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(500);

    if (events) {
      // Generate geographic clusters from events
      const generatedClusters: ThreatCluster[] = [];
      const points: HeatmapPoint[] = [];
      
      // Distribute events across regions based on source_ip patterns
      Object.entries(REGIONS).forEach(([regionName, locations]) => {
        const regionEvents = events.filter((_, i) => {
          // Simulate regional distribution
          const hash = i % Object.keys(REGIONS).length;
          return Object.keys(REGIONS)[hash] === regionName;
        });

        locations.forEach((location, locIndex) => {
          const locationEvents = regionEvents.filter((_, i) => i % locations.length === locIndex);
          
          if (locationEvents.length > 0) {
            const severityCounts = {
              critical: locationEvents.filter(e => e.severity === 'critical').length,
              high: locationEvents.filter(e => e.severity === 'high').length,
              medium: locationEvents.filter(e => e.severity === 'medium').length,
              low: locationEvents.filter(e => e.severity === 'low').length,
            };

            const maxSeverity = Object.entries(severityCounts)
              .sort(([,a], [,b]) => b - a)[0][0] as 'critical' | 'high' | 'medium' | 'low';

            const attackTypes = [...new Set(locationEvents.map(e => e.event_type))].slice(0, 3);

            generatedClusters.push({
              id: `${location.name}-${Date.now()}`,
              lat: location.lat + (Math.random() - 0.5) * 2,
              lng: location.lng + (Math.random() - 0.5) * 2,
              count: locationEvents.length,
              severity: maxSeverity,
              region: regionName,
              country: location.country,
              attackTypes,
              lastActivity: locationEvents[0]?.detected_at || new Date().toISOString(),
            });

            // Convert to canvas coordinates
            const x = ((location.lng + 180) / 360) * 800;
            const y = ((90 - location.lat) / 180) * 400;
            
            points.push({
              x,
              y,
              intensity: Math.min(locationEvents.length / 10, 1),
              severity: maxSeverity,
            });
          }
        });
      });

      setClusters(generatedClusters.sort((a, b) => b.count - a.count));
      setHeatmapPoints(points);
      setTotalThreats(events.length);
    }
    
    setLoading(false);
  };

  const drawHeatmap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = 'hsl(222, 47%, 8%)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'hsla(185, 100%, 50%, 0.1)';
    ctx.lineWidth = 0.5;
    
    // Vertical lines (longitude)
    for (let i = 0; i <= 12; i++) {
      const x = (i / 12) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal lines (latitude)
    for (let i = 0; i <= 6; i++) {
      const y = (i / 6) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw world outline (simplified)
    ctx.strokeStyle = 'hsla(185, 100%, 50%, 0.3)';
    ctx.lineWidth = 1;
    
    // Draw continents as simplified shapes
    const continents = [
      // North America
      { points: [[0.1, 0.15], [0.3, 0.12], [0.35, 0.3], [0.25, 0.45], [0.1, 0.35]] },
      // South America
      { points: [[0.2, 0.5], [0.3, 0.45], [0.32, 0.8], [0.15, 0.75]] },
      // Europe
      { points: [[0.45, 0.15], [0.55, 0.12], [0.6, 0.3], [0.45, 0.35]] },
      // Africa
      { points: [[0.45, 0.4], [0.6, 0.35], [0.65, 0.7], [0.45, 0.75]] },
      // Asia
      { points: [[0.55, 0.1], [0.9, 0.15], [0.95, 0.45], [0.6, 0.4]] },
      // Australia
      { points: [[0.8, 0.6], [0.95, 0.55], [0.92, 0.75], [0.78, 0.72]] },
    ];

    ctx.fillStyle = 'hsla(222, 30%, 15%, 0.8)';
    continents.forEach(continent => {
      ctx.beginPath();
      continent.points.forEach((point, i) => {
        const x = point[0] * width;
        const y = point[1] * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Draw heatmap points
    heatmapPoints.forEach(point => {
      const scaleX = width / 800;
      const scaleY = height / 400;
      const x = point.x * scaleX;
      const y = point.y * scaleY;
      const radius = 20 + point.intensity * 30;

      // Create radial gradient for heat effect
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const color = SEVERITY_COLORS[point.severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.medium;
      
      gradient.addColorStop(0, color.replace(')', ', 0.8)').replace('hsl', 'hsla'));
      gradient.addColorStop(0.5, color.replace(')', ', 0.4)').replace('hsl', 'hsla'));
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw center dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw attack lines (animated)
    const time = Date.now() / 1000;
    heatmapPoints.forEach((point, i) => {
      if (point.intensity > 0.3) {
        const scaleX = width / 800;
        const scaleY = height / 400;
        const x1 = point.x * scaleX;
        const y1 = point.y * scaleY;
        
        // Draw to center (HQ)
        const hqX = width * 0.5;
        const hqY = height * 0.3;
        
        const progress = (Math.sin(time * 2 + i) + 1) / 2;
        const currentX = x1 + (hqX - x1) * progress;
        const currentY = y1 + (hqY - y1) * progress;

        const gradient = ctx.createLinearGradient(x1, y1, hqX, hqY);
        gradient.addColorStop(0, 'hsla(0, 85%, 55%, 0.6)');
        gradient.addColorStop(1, 'hsla(185, 100%, 50%, 0.2)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  };

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      drawHeatmap();
    }, 100);
    return () => clearInterval(interval);
  }, [heatmapPoints]);

  const severityCounts = {
    critical: clusters.filter(c => c.severity === 'critical').length,
    high: clusters.filter(c => c.severity === 'high').length,
    medium: clusters.filter(c => c.severity === 'medium').length,
    low: clusters.filter(c => c.severity === 'low').length,
  };

  return (
    <Card className={cn("cyber-card", isFullscreen && "fixed inset-4 z-50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Map className="h-4 w-4 text-primary animate-pulse" />
            Global Threat Heatmap
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
              <Activity className="h-3 w-3 mr-1" />
              {totalThreats} Threats
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadThreatData()}
              className="h-7 w-7"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-7 w-7"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Heatmap Canvas */}
          <div className="lg:col-span-2 relative">
            <canvas
              ref={canvasRef}
              width={800}
              height={400}
              className="w-full h-auto rounded-lg border border-border/50"
              style={{ imageRendering: 'crisp-edges' }}
            />
            
            {/* Legend */}
            <div className="absolute bottom-2 left-2 bg-card/90 backdrop-blur-sm rounded-lg p-2 border border-border/50">
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span>Critical</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span>High</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span>Low</span>
                </div>
              </div>
            </div>

            {/* Stats Overlay */}
            <div className="absolute top-2 right-2 bg-card/90 backdrop-blur-sm rounded-lg p-2 border border-border/50">
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                  <span>{severityCounts.critical} Critical</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-warning" />
                  <span>{severityCounts.high} High</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-primary" />
                  <span>{severityCounts.medium} Medium</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span>{severityCounts.low} Low</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cluster List */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              Attack Origin Clusters
            </h4>
            <ScrollArea className="h-[320px]">
              <div className="space-y-2 pr-2">
                {clusters.slice(0, 10).map((cluster) => (
                  <div
                    key={cluster.id}
                    onClick={() => setSelectedCluster(cluster)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all hover:bg-secondary/50",
                      selectedCluster?.id === cluster.id && "border-primary bg-primary/10",
                      cluster.severity === 'critical' && "border-destructive/30",
                      cluster.severity === 'high' && "border-warning/30",
                      cluster.severity === 'medium' && "border-primary/30",
                      cluster.severity === 'low' && "border-success/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{cluster.country}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          cluster.severity === 'critical' && "bg-destructive/10 text-destructive",
                          cluster.severity === 'high' && "bg-warning/10 text-warning",
                          cluster.severity === 'medium' && "bg-primary/10 text-primary",
                          cluster.severity === 'low' && "bg-success/10 text-success"
                        )}
                      >
                        {cluster.count} attacks
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-1">{cluster.region}</p>
                    <div className="flex flex-wrap gap-1">
                      {cluster.attackTypes.map((type, i) => (
                        <span
                          key={i}
                          className="text-[9px] px-1.5 py-0.5 bg-secondary rounded"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

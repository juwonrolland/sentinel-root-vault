import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Globe,
  MapPin,
  AlertTriangle,
  Shield,
  Eye,
  RefreshCw,
  Maximize2,
  Target,
  Radio,
  Users,
  Activity,
  Crosshair,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getMapboxToken } from '@/lib/mapbox';

interface MapThreat {
  id: string;
  type: 'threat' | 'identity' | 'device' | 'event';
  lat: number;
  lng: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  name: string;
  description: string;
  timestamp: string;
  country: string;
  city: string;
  ip?: string;
  status: 'active' | 'resolved' | 'monitoring';
}

interface GlobalIdentityMapProps {
  className?: string;
  onThreatSelected?: (threat: MapThreat) => void;
}

export const GlobalIdentityMap: React.FC<GlobalIdentityMapProps> = ({
  className,
  onThreatSelected,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  
  const [threats, setThreats] = useState<MapThreat[]>([]);
  const [selectedThreat, setSelectedThreat] = useState<MapThreat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [liveTracking, setLiveTracking] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);

  // Fetch Mapbox token on mount
  useEffect(() => {
    const fetchToken = async () => {
      const token = await getMapboxToken();
      if (token) {
        setMapboxToken(token);
      } else {
        setTokenError(true);
        setIsLoading(false);
      }
    };
    fetchToken();
  }, []);

  // Generate simulated global threats
  const generateGlobalThreats = useCallback((): MapThreat[] => {
    const locations = [
      { city: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
      { city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
      { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
      { city: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6173 },
      { city: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074 },
      { city: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
      { city: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
      { city: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333 },
      { city: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777 },
      { city: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
      { city: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
      { city: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
      { city: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050 },
      { city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
      { city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780 },
      { city: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
      { city: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },
      { city: 'Johannesburg', country: 'South Africa', lat: -26.2041, lng: 28.0473 },
      { city: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
      { city: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816 },
    ];

    const types: MapThreat['type'][] = ['threat', 'identity', 'device', 'event'];
    const severities: MapThreat['severity'][] = ['low', 'medium', 'high', 'critical'];
    const statuses: MapThreat['status'][] = ['active', 'resolved', 'monitoring'];
    
    const threatNames = [
      'Unauthorized Access Attempt',
      'Suspicious Identity Scan',
      'Malware Detection',
      'Brute Force Attack',
      'Data Exfiltration Attempt',
      'DDoS Attack Origin',
      'Phishing Campaign Source',
      'Ransomware Activity',
      'APT Indicator Detected',
      'Identity Theft Alert',
    ];

    return locations.slice(0, 15 + Math.floor(Math.random() * 5)).map((loc, i) => ({
      id: `threat-${Date.now()}-${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      lat: loc.lat + (Math.random() - 0.5) * 2,
      lng: loc.lng + (Math.random() - 0.5) * 2,
      severity: severities[Math.floor(Math.random() * severities.length)],
      name: threatNames[Math.floor(Math.random() * threatNames.length)],
      description: `Detected from ${loc.city}, ${loc.country}`,
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      country: loc.country,
      city: loc.city,
      ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
    }));
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/satellite-streets-v12',
      projection: 'globe',
      zoom: 1.5,
      center: [20, 20],
      pitch: 45,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(20, 20, 30)',
        'high-color': 'rgb(40, 40, 60)',
        'horizon-blend': 0.2,
      });
      setIsLoading(false);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, mapStyle]);

  // Auto-rotate globe
  useEffect(() => {
    if (!map.current || !autoRotate) return;

    let animationFrame: number;
    let userInteracting = false;

    const spinGlobe = () => {
      if (!map.current || userInteracting) return;
      
      const zoom = map.current.getZoom();
      if (zoom < 5) {
        const center = map.current.getCenter();
        center.lng -= 0.1;
        map.current.easeTo({ center, duration: 100, easing: (n) => n });
      }
      animationFrame = requestAnimationFrame(spinGlobe);
    };

    map.current.on('mousedown', () => { userInteracting = true; });
    map.current.on('mouseup', () => { userInteracting = false; });
    map.current.on('dragstart', () => { userInteracting = true; });
    map.current.on('dragend', () => { userInteracting = false; });

    spinGlobe();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [autoRotate]);

  // Load and update threats
  useEffect(() => {
    const loadThreats = () => {
      const newThreats = generateGlobalThreats();
      setThreats(newThreats);
    };

    loadThreats();

    if (liveTracking) {
      const interval = setInterval(loadThreats, 30000);
      return () => clearInterval(interval);
    }
  }, [liveTracking, generateGlobalThreats]);

  // Update markers
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    threats.forEach(threat => {
      const el = document.createElement('div');
      el.className = 'threat-marker';
      el.style.cssText = `
        width: ${threat.severity === 'critical' ? '20px' : threat.severity === 'high' ? '16px' : '12px'};
        height: ${threat.severity === 'critical' ? '20px' : threat.severity === 'high' ? '16px' : '12px'};
        border-radius: 50%;
        cursor: pointer;
        background: ${
          threat.severity === 'critical' ? '#ef4444' :
          threat.severity === 'high' ? '#f97316' :
          threat.severity === 'medium' ? '#eab308' : '#22c55e'
        };
        box-shadow: 0 0 ${threat.severity === 'critical' ? '15px' : '10px'} ${
          threat.severity === 'critical' ? '#ef4444' :
          threat.severity === 'high' ? '#f97316' :
          threat.severity === 'medium' ? '#eab308' : '#22c55e'
        };
        animation: pulse 2s infinite;
        border: 2px solid white;
      `;

      el.addEventListener('click', () => {
        setSelectedThreat(threat);
        onThreatSelected?.(threat);
        map.current?.flyTo({ center: [threat.lng, threat.lat], zoom: 5 });
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([threat.lng, threat.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [threats, onThreatSelected]);

  // Real-time security events subscription
  useEffect(() => {
    if (!liveTracking) return;

    const channel = supabase
      .channel('global-map-events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_events'
      }, (payload) => {
        const event = payload.new as any;
        if (event.source_ip) {
          // Add random location for demo
          const lat = (Math.random() - 0.5) * 180;
          const lng = (Math.random() - 0.5) * 360;
          
          const newThreat: MapThreat = {
            id: event.id,
            type: 'event',
            lat,
            lng,
            severity: event.severity,
            name: event.event_type,
            description: event.description || 'Security event detected',
            timestamp: event.detected_at,
            country: 'Unknown',
            city: 'Unknown',
            ip: event.source_ip,
            status: 'active',
          };

          setThreats(prev => [newThreat, ...prev.slice(0, 29)]);
          
          if (event.severity === 'critical' || event.severity === 'high') {
            toast.warning(`New ${event.severity} threat detected`, {
              description: event.event_type,
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveTracking]);

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-destructive/20 text-destructive border-destructive/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-warning/20 text-warning border-warning/30',
      low: 'bg-success/20 text-success border-success/30',
    };
    return colors[severity] || colors.low;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'threat': return <AlertTriangle className="h-3 w-3" />;
      case 'identity': return <Users className="h-3 w-3" />;
      case 'device': return <Shield className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const stats = {
    total: threats.length,
    critical: threats.filter(t => t.severity === 'critical').length,
    high: threats.filter(t => t.severity === 'high').length,
    active: threats.filter(t => t.status === 'active').length,
    countries: new Set(threats.map(t => t.country)).size,
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <Card className="cyber-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Globe className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Global Threat Intelligence Map
                  <Badge variant="outline" className="text-[10px] bg-destructive/10 border-destructive/30 text-destructive">
                    {stats.active} ACTIVE
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Real-time global visualization of threats and identity scans
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch id="auto-rotate" checked={autoRotate} onCheckedChange={setAutoRotate} />
                <Label htmlFor="auto-rotate" className="text-xs cursor-pointer">Rotate</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="live-tracking" checked={liveTracking} onCheckedChange={setLiveTracking} />
                <Label htmlFor="live-tracking" className="text-xs cursor-pointer flex items-center gap-1">
                  <Radio className={cn("h-3 w-3", liveTracking && "text-destructive animate-pulse")} />
                  Live
                </Label>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setThreats(generateGlobalThreats())}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Bar */}
      <div className="grid grid-cols-5 gap-2">
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-center">
          <p className="text-xl font-bold text-primary">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Total Events</p>
        </div>
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
          <p className="text-xl font-bold text-destructive">{stats.critical}</p>
          <p className="text-[10px] text-muted-foreground">Critical</p>
        </div>
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-center">
          <p className="text-xl font-bold text-orange-400">{stats.high}</p>
          <p className="text-[10px] text-muted-foreground">High</p>
        </div>
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-center">
          <p className="text-xl font-bold text-warning">{stats.active}</p>
          <p className="text-[10px] text-muted-foreground">Active</p>
        </div>
        <div className="p-3 rounded-lg bg-info/10 border border-info/30 text-center">
          <p className="text-xl font-bold text-info">{stats.countries}</p>
          <p className="text-[10px] text-muted-foreground">Countries</p>
        </div>
      </div>

      {/* Map and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map */}
        <Card className="cyber-card lg:col-span-3">
          <CardContent className="p-0">
            <div className="relative h-[500px] rounded-lg overflow-hidden">
              {/* Token Error State */}
              {tokenError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/95 z-20">
                  <div className="text-center p-6 max-w-sm">
                    <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-foreground mb-2">Map Unavailable</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      The map cannot be displayed because the Mapbox token is not configured.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                      Retry
                    </Button>
                  </div>
                </div>
              )}
              {isLoading && !tokenError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading global map...</p>
                  </div>
                </div>
              )}
              <div ref={mapContainer} className="absolute inset-0" />
              
              {/* Map Legend */}
              <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-background/90 border border-border backdrop-blur">
                <p className="text-xs font-medium mb-2">Threat Severity</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className="w-3 h-3 rounded-full bg-destructive shadow-lg shadow-destructive/50"></div>
                    <span>Critical</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className="w-3 h-3 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50"></div>
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className="w-3 h-3 rounded-full bg-warning shadow-lg shadow-warning/50"></div>
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className="w-3 h-3 rounded-full bg-success shadow-lg shadow-success/50"></div>
                    <span>Low</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Threat List */}
        <Card className="cyber-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Recent Threats
              </span>
              <Badge variant="outline">{threats.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[430px]">
              <div className="space-y-2 pr-2">
                {threats.slice(0, 20).map((threat) => (
                  <div
                    key={threat.id}
                    className={cn(
                      "p-2 rounded-lg border cursor-pointer transition-all hover:scale-[1.02]",
                      getSeverityColor(threat.severity),
                      selectedThreat?.id === threat.id && "ring-2 ring-primary"
                    )}
                    onClick={() => {
                      setSelectedThreat(threat);
                      onThreatSelected?.(threat);
                      map.current?.flyTo({ center: [threat.lng, threat.lat], zoom: 5 });
                    }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1">
                        {getTypeIcon(threat.type)}
                        <span className="text-[10px] font-medium truncate max-w-[100px]">{threat.name}</span>
                      </div>
                      <Badge className={cn("text-[8px] px-1", getSeverityColor(threat.severity))}>
                        {threat.severity}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-2 w-2" />
                        {threat.city}
                      </span>
                      <span>{formatTime(threat.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Selected Threat Details */}
      {selectedThreat && (
        <Card className={cn("border-2", getSeverityColor(selectedThreat.severity))}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-primary" />
                Threat Details
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedThreat(null)}>
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-2 rounded bg-secondary/30">
                <p className="text-[10px] text-muted-foreground">Location</p>
                <p className="text-xs font-medium">{selectedThreat.city}, {selectedThreat.country}</p>
              </div>
              <div className="p-2 rounded bg-secondary/30">
                <p className="text-[10px] text-muted-foreground">Coordinates</p>
                <p className="text-xs font-mono">{selectedThreat.lat.toFixed(4)}, {selectedThreat.lng.toFixed(4)}</p>
              </div>
              <div className="p-2 rounded bg-secondary/30">
                <p className="text-[10px] text-muted-foreground">IP Address</p>
                <p className="text-xs font-mono">{selectedThreat.ip || 'N/A'}</p>
              </div>
              <div className="p-2 rounded bg-secondary/30">
                <p className="text-[10px] text-muted-foreground">Status</p>
                <Badge variant="outline" className="text-[10px]">{selectedThreat.status}</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{selectedThreat.description}</p>
          </CardContent>
        </Card>
      )}

      {/* CSS for marker animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

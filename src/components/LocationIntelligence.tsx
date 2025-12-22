import { useState, useEffect, useCallback, memo } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Globe,
  MapPin,
  Search,
  RefreshCw,
  Building2,
  Wifi,
  AlertTriangle,
  Target,
  Navigation,
  Compass,
  Clock,
  Signal,
  Shield,
  Crosshair,
  Radio,
} from 'lucide-react';
import { toast } from 'sonner';
import { useGeoLocation, GeoLocationData } from '@/hooks/useGeoLocation';
import { cn } from '@/lib/utils';

interface TrackedLocation {
  ip: string;
  location: GeoLocationData;
  timestamp: string;
  type: 'network' | 'device' | 'threat' | 'user' | 'security_event';
  status: 'active' | 'inactive' | 'suspicious' | 'blocked';
  name?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  eventType?: string;
}

interface LocationIntelligenceProps {
  className?: string;
  initialIPs?: string[];
  onLocationResolved?: (ip: string, location: GeoLocationData) => void;
}

export const LocationIntelligence: React.FC<LocationIntelligenceProps> = memo(({
  className,
  initialIPs = [],
  onLocationResolved,
}) => {
  const { lookupIP, lookupMultipleIPs, getCurrentLocation, getDistanceBetweenPoints, isLoading, cacheSize } = useGeoLocation();
  const [searchIP, setSearchIP] = useState('');
  const [trackedLocations, setTrackedLocations] = useState<TrackedLocation[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Get user's current location on mount
  useEffect(() => {
    getCurrentLocation().then(loc => {
      if (loc) {
        setUserLocation(loc);
      }
    });
  }, [getCurrentLocation]);

  // Process initial IPs
  useEffect(() => {
    if (initialIPs.length > 0) {
      processIPs(initialIPs);
    }
  }, [initialIPs]);

  // Real-time security events monitoring for threat locations
  useEffect(() => {
    if (!autoRefresh) return;

    // Load existing security events with IPs
    loadSecurityEventLocations();

    // Subscribe to real-time security events
    const channel = supabase
      .channel('location-intelligence-events')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'security_events' 
      }, async (payload) => {
        const event = payload.new as any;
        if (event.source_ip) {
          await addThreatLocation(event);
        }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'threat_detections' 
      }, async (payload) => {
        const detection = payload.new as any;
        if (detection.indicators?.source_ip) {
          await addThreatFromDetection(detection);
        }
      })
      .subscribe();

    // Refresh threat locations every 30 seconds
    const interval = setInterval(() => {
      loadSecurityEventLocations();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadSecurityEventLocations = async () => {
    try {
      // Get recent security events with source IPs
      const { data: events } = await supabase
        .from('security_events')
        .select('*')
        .not('source_ip', 'is', null)
        .order('detected_at', { ascending: false })
        .limit(50);

      if (events && events.length > 0) {
        const ipsToLookup = events
          .map(e => e.source_ip)
          .filter((ip): ip is string => ip !== null);

        if (ipsToLookup.length > 0) {
          const uniqueIPs = [...new Set(ipsToLookup)];
          const results = await lookupMultipleIPs(uniqueIPs);

          const threatLocations: TrackedLocation[] = [];
          events.forEach(event => {
            if (event.source_ip) {
              const result = results.get(event.source_ip);
              if (result?.success && result.data) {
                threatLocations.push({
                  ip: event.source_ip,
                  location: result.data,
                  timestamp: event.detected_at || new Date().toISOString(),
                  type: 'security_event',
                  status: event.severity === 'critical' ? 'blocked' : 
                         event.severity === 'high' ? 'suspicious' : 'active',
                  name: event.event_type,
                  severity: event.severity,
                  eventType: event.event_type,
                });
              }
            }
          });

          setTrackedLocations(prev => {
            // Merge with existing, removing duplicates by IP + timestamp combo
            const existingKeys = new Set(threatLocations.map(l => `${l.ip}-${l.timestamp}`));
            const filtered = prev.filter(l => !existingKeys.has(`${l.ip}-${l.timestamp}`) && l.type !== 'security_event');
            return [...threatLocations, ...filtered];
          });
        }
      }
    } catch (error) {
      console.error('Failed to load security event locations:', error);
    }
  };

  const addThreatLocation = async (event: any) => {
    const result = await lookupIP(event.source_ip);
    if (result.success && result.data) {
      const newLocation: TrackedLocation = {
        ip: event.source_ip,
        location: result.data,
        timestamp: event.detected_at || new Date().toISOString(),
        type: 'threat',
        status: event.severity === 'critical' ? 'blocked' : 'suspicious',
        name: `Threat: ${event.event_type}`,
        severity: event.severity,
        eventType: event.event_type,
      };

      setTrackedLocations(prev => [newLocation, ...prev.slice(0, 49)]);
      onLocationResolved?.(event.source_ip, result.data);
      
      toast.warning(`Threat detected from ${result.data.city}, ${result.data.country}`, {
        description: `${event.event_type} - ${event.severity} severity`,
      });
    }
  };

  const addThreatFromDetection = async (detection: any) => {
    const ip = detection.indicators?.source_ip;
    if (!ip) return;

    const result = await lookupIP(ip);
    if (result.success && result.data) {
      const newLocation: TrackedLocation = {
        ip,
        location: result.data,
        timestamp: detection.detected_at || new Date().toISOString(),
        type: 'threat',
        status: detection.severity === 'critical' ? 'blocked' : 'suspicious',
        name: `Detection: ${detection.threat_type}`,
        severity: detection.severity,
        eventType: detection.threat_type,
      };

      setTrackedLocations(prev => [newLocation, ...prev.slice(0, 49)]);
    }
  };

  const processIPs = async (ips: string[]) => {
    setIsScanning(true);
    try {
      const results = await lookupMultipleIPs(ips);
      const newLocations: TrackedLocation[] = [];

      results.forEach((result, ip) => {
        if (result.success && result.data) {
          newLocations.push({
            ip,
            location: result.data,
            timestamp: new Date().toISOString(),
            type: 'device',
            status: 'active',
          });
          onLocationResolved?.(ip, result.data);
        }
      });

      setTrackedLocations(prev => {
        const existing = new Set(prev.map(l => l.ip));
        return [...prev, ...newLocations.filter(l => !existing.has(l.ip))];
      });

      if (newLocations.length > 0) {
        toast.success(`Resolved ${newLocations.length} locations`);
      }
    } catch (error) {
      console.error('Failed to process IPs:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSearch = async () => {
    if (!searchIP.trim()) return;

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(searchIP)) {
      toast.error('Invalid IP address format');
      return;
    }

    const result = await lookupIP(searchIP);
    if (result.success && result.data) {
      setTrackedLocations(prev => {
        const existing = prev.find(l => l.ip === searchIP);
        if (existing) {
          return prev.map(l => l.ip === searchIP ? { ...l, location: result.data!, timestamp: new Date().toISOString() } : l);
        }
        return [{
          ip: searchIP,
          location: result.data!,
          timestamp: new Date().toISOString(),
          type: 'device' as const,
          status: 'active' as const,
        }, ...prev];
      });
      onLocationResolved?.(searchIP, result.data);
      toast.success(`Location resolved: ${result.data.city}, ${result.data.country}`);
    } else {
      toast.error(result.error || 'Failed to resolve location');
    }
    setSearchIP('');
  };

  const getDistanceFromUser = useCallback((lat: number, lon: number): string | null => {
    if (!userLocation) return null;
    const distance = getDistanceBetweenPoints(
      userLocation.latitude, userLocation.longitude,
      lat, lon
    );
    if (distance < 1) return `${(distance * 1000).toFixed(0)}m away`;
    if (distance < 100) return `${distance.toFixed(1)}km away`;
    return `${Math.round(distance)}km away`;
  }, [userLocation, getDistanceBetweenPoints]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-success/20 text-success border-success/30',
      inactive: 'bg-muted text-muted-foreground border-border',
      suspicious: 'bg-warning/20 text-warning border-warning/30',
      blocked: 'bg-destructive/20 text-destructive border-destructive/30',
    };
    return styles[status] || styles.inactive;
  };

  const getSeverityColor = (severity?: string) => {
    const colors: Record<string, string> = {
      critical: 'text-destructive',
      high: 'text-warning',
      medium: 'text-primary',
      low: 'text-success',
    };
    return colors[severity || 'low'] || 'text-muted-foreground';
  };

  const getTypeIcon = (type: string, status: string) => {
    if (type === 'threat' || type === 'security_event') {
      return status === 'blocked' ? 
        <Shield className="h-4 w-4 text-destructive" /> : 
        <AlertTriangle className="h-4 w-4 text-warning animate-pulse" />;
    }
    const icons: Record<string, React.ReactNode> = {
      network: <Wifi className="h-4 w-4" />,
      device: <Signal className="h-4 w-4" />,
      user: <Target className="h-4 w-4" />,
    };
    return icons[type] || icons.device;
  };

  const getFlagEmoji = (countryCode: string): string => {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Stats
  const threatCount = trackedLocations.filter(l => l.type === 'threat' || l.type === 'security_event').length;
  const suspiciousCount = trackedLocations.filter(l => l.status === 'suspicious' || l.status === 'blocked').length;
  const countriesCount = new Set(trackedLocations.map(l => l.location.country)).size;

  return (
    <Card className={cn("cyber-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary animate-pulse" />
            <div>
              <CardTitle className="text-sm sm:text-base">Location Intelligence</CardTitle>
              <CardDescription className="text-xs">
                Real-time geolocation tracking & threat origins
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="h-7 text-xs"
            >
              <Radio className={cn("h-3 w-3 mr-1", autoRefresh && "animate-pulse")} />
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
            <Badge variant="outline" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              {trackedLocations.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter IP address to track..."
            value={searchIP}
            onChange={(e) => setSearchIP(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-8 text-xs font-mono"
          />
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={isLoading || !searchIP.trim()}
            className="h-8"
          >
            {isLoading ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <p className="text-lg font-bold text-primary">{countriesCount}</p>
            <p className="text-[9px] text-muted-foreground">Countries</p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <p className="text-lg font-bold text-destructive">{threatCount}</p>
            <p className="text-[9px] text-muted-foreground">Threats</p>
          </div>
          <div className="p-2 rounded-lg bg-warning/10 border border-warning/20 text-center">
            <p className="text-lg font-bold text-warning">{suspiciousCount}</p>
            <p className="text-[9px] text-muted-foreground">Suspicious</p>
          </div>
          <div className="p-2 rounded-lg bg-info/10 border border-info/20 text-center">
            <p className="text-lg font-bold text-info">{cacheSize}</p>
            <p className="text-[9px] text-muted-foreground">Cached</p>
          </div>
        </div>

        {/* Location List */}
        <ScrollArea className="h-[320px]">
          <div className="space-y-2 pr-2">
            {trackedLocations.map((tracked, idx) => {
              const distance = getDistanceFromUser(tracked.location.latitude, tracked.location.longitude);
              const isThreat = tracked.type === 'threat' || tracked.type === 'security_event';
              
              return (
                <div
                  key={`${tracked.ip}-${idx}`}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    isThreat 
                      ? "bg-destructive/5 border-destructive/30 hover:border-destructive/50" 
                      : "bg-secondary/30 border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getFlagEmoji(tracked.location.countryCode)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{tracked.name || tracked.ip}</p>
                          {tracked.severity && (
                            <Badge variant="outline" className={cn("text-[9px] uppercase", getSeverityColor(tracked.severity))}>
                              {tracked.severity}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{tracked.ip}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[10px]", getStatusBadge(tracked.status))}>
                        {tracked.status}
                      </Badge>
                      <div className={cn(
                        "p-1.5 rounded",
                        isThreat ? "bg-destructive/20" : "bg-secondary/50"
                      )}>
                        {getTypeIcon(tracked.type, tracked.status)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{tracked.location.city}, {tracked.location.country}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{tracked.location.organization || tracked.location.isp}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Compass className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">
                        {tracked.location.latitude.toFixed(4)}, {tracked.location.longitude.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{formatTimestamp(tracked.timestamp)}</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    {distance && (
                      <div className="flex items-center gap-1 text-primary">
                        <Navigation className="h-3 w-3" />
                        <span>{distance}</span>
                      </div>
                    )}
                    {tracked.eventType && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Crosshair className="h-3 w-3" />
                        <span>{tracked.eventType}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {trackedLocations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No locations tracked</p>
                <p className="text-xs">Security events will appear here automatically</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

LocationIntelligence.displayName = 'LocationIntelligence';
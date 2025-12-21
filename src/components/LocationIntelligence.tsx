import { useState, useEffect, useCallback } from 'react';
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
  Flag,
  Building2,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Target,
  Navigation,
  Compass,
  Clock,
  Signal,
} from 'lucide-react';
import { toast } from 'sonner';
import { useGeoLocation, GeoLocationData } from '@/hooks/useGeoLocation';
import { cn } from '@/lib/utils';

interface TrackedLocation {
  ip: string;
  location: GeoLocationData;
  timestamp: string;
  type: 'network' | 'device' | 'threat' | 'user';
  status: 'active' | 'inactive' | 'suspicious';
  name?: string;
}

interface LocationIntelligenceProps {
  className?: string;
  initialIPs?: string[];
  onLocationResolved?: (ip: string, location: GeoLocationData) => void;
}

export const LocationIntelligence: React.FC<LocationIntelligenceProps> = ({
  className,
  initialIPs = [],
  onLocationResolved,
}) => {
  const { lookupIP, lookupMultipleIPs, getCurrentLocation, getDistanceBetweenPoints, isLoading, cacheSize } = useGeoLocation();
  const [searchIP, setSearchIP] = useState('');
  const [trackedLocations, setTrackedLocations] = useState<TrackedLocation[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

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

      toast.success(`Resolved ${newLocations.length} locations`);
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
        return [...prev, {
          ip: searchIP,
          location: result.data!,
          timestamp: new Date().toISOString(),
          type: 'device' as const,
          status: 'active' as const,
        }];
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
      suspicious: 'bg-destructive/20 text-destructive border-destructive/30',
    };
    return styles[status] || styles.inactive;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      network: <Wifi className="h-4 w-4" />,
      device: <Signal className="h-4 w-4" />,
      threat: <AlertTriangle className="h-4 w-4" />,
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

  // Demo locations for showcase
  const demoLocations: TrackedLocation[] = [
    {
      ip: '192.168.1.1',
      location: {
        ip: '192.168.1.1',
        country: 'United States',
        countryCode: 'US',
        region: 'NY',
        regionName: 'New York',
        city: 'New York',
        zip: '10001',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        isp: 'Verizon Business',
        organization: 'Corporate HQ',
        as: '',
        query: '192.168.1.1',
        status: 'success',
      },
      timestamp: new Date().toISOString(),
      type: 'network',
      status: 'active',
      name: 'Corporate HQ Gateway',
    },
    {
      ip: '10.0.0.15',
      location: {
        ip: '10.0.0.15',
        country: 'United Kingdom',
        countryCode: 'GB',
        region: 'ENG',
        regionName: 'England',
        city: 'London',
        zip: 'EC1A',
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London',
        isp: 'British Telecom',
        organization: 'London Office',
        as: '',
        query: '10.0.0.15',
        status: 'success',
      },
      timestamp: new Date(Date.now() - 300000).toISOString(),
      type: 'device',
      status: 'active',
      name: 'London Data Center',
    },
    {
      ip: '185.220.101.34',
      location: {
        ip: '185.220.101.34',
        country: 'Russia',
        countryCode: 'RU',
        region: 'MOW',
        regionName: 'Moscow',
        city: 'Moscow',
        zip: '101000',
        latitude: 55.7558,
        longitude: 37.6173,
        timezone: 'Europe/Moscow',
        isp: 'Unknown ISP',
        organization: 'Unknown',
        as: '',
        query: '185.220.101.34',
        status: 'success',
      },
      timestamp: new Date(Date.now() - 600000).toISOString(),
      type: 'threat',
      status: 'suspicious',
      name: 'Suspicious Source',
    },
  ];

  const allLocations = [...demoLocations, ...trackedLocations];

  return (
    <Card className={cn("cyber-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary animate-pulse" />
            <div>
              <CardTitle className="text-sm sm:text-base">Location Intelligence</CardTitle>
              <CardDescription className="text-xs">
                Geolocation tracking and IP intelligence
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              {allLocations.length} Tracked
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              {cacheSize} Cached
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
            <p className="text-lg font-bold text-primary">
              {new Set(allLocations.map(l => l.location.country)).size}
            </p>
            <p className="text-[9px] text-muted-foreground">Countries</p>
          </div>
          <div className="p-2 rounded-lg bg-success/10 border border-success/20 text-center">
            <p className="text-lg font-bold text-success">
              {allLocations.filter(l => l.status === 'active').length}
            </p>
            <p className="text-[9px] text-muted-foreground">Active</p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <p className="text-lg font-bold text-destructive">
              {allLocations.filter(l => l.status === 'suspicious').length}
            </p>
            <p className="text-[9px] text-muted-foreground">Suspicious</p>
          </div>
          <div className="p-2 rounded-lg bg-info/10 border border-info/20 text-center">
            <p className="text-lg font-bold text-info">
              {allLocations.filter(l => l.type === 'threat').length}
            </p>
            <p className="text-[9px] text-muted-foreground">Threats</p>
          </div>
        </div>

        {/* Location List */}
        <ScrollArea className="h-[280px]">
          <div className="space-y-2 pr-2">
            {allLocations.map((tracked, idx) => {
              const distance = getDistanceFromUser(tracked.location.latitude, tracked.location.longitude);
              return (
                <div
                  key={`${tracked.ip}-${idx}`}
                  className="p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getFlagEmoji(tracked.location.countryCode)}</span>
                      <div>
                        <p className="text-sm font-medium">{tracked.name || tracked.ip}</p>
                        <p className="text-xs text-muted-foreground font-mono">{tracked.ip}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusBadge(tracked.status)}>
                        {tracked.status}
                      </Badge>
                      <div className="p-1.5 rounded bg-secondary/50">
                        {getTypeIcon(tracked.type)}
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
                      <span>{tracked.location.timezone}</span>
                    </div>
                  </div>

                  {distance && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                      <Navigation className="h-3 w-3" />
                      <span>{distance}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {allLocations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No locations tracked</p>
                <p className="text-xs">Enter an IP address to start tracking</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

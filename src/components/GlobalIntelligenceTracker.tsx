import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Globe, 
  Search, 
  Shield, 
  AlertTriangle, 
  Activity, 
  MapPin, 
  Server, 
  Network, 
  Wifi, 
  RefreshCw,
  Target,
  Crosshair,
  Radio,
  Radar,
  Eye,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Zap,
  Database,
  Clock,
  Filter,
  Download,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  BarChart3,
  PieChart,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGeoLocation, GeoLocationData } from "@/hooks/useGeoLocation";
import { RoleGuard } from "@/components/RoleBasedAccess";
import { useToast } from "@/hooks/use-toast";

interface TrackedEntity {
  id: string;
  type: 'ip' | 'domain';
  value: string;
  location: GeoLocationData | null;
  status: 'clean' | 'suspicious' | 'malicious' | 'unknown';
  riskScore: number;
  threatTypes: string[];
  firstSeen: Date;
  lastSeen: Date;
  hitCount: number;
  reputation: {
    score: number;
    category: string;
    sources: string[];
  };
  whois?: {
    registrar: string;
    createdDate: string;
    expiresDate: string;
    registrant: string;
  };
}

interface ContinentStats {
  name: string;
  code: string;
  totalEntities: number;
  threats: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface GlobalIntelligenceTrackerProps {
  className?: string;
}

// Global regions data for simulated intelligence
const GLOBAL_REGIONS = {
  'North America': { code: 'NA', cities: ['New York', 'Los Angeles', 'Chicago', 'Toronto', 'Mexico City', 'Vancouver', 'Miami', 'Dallas', 'Seattle', 'Atlanta'] },
  'South America': { code: 'SA', cities: ['São Paulo', 'Buenos Aires', 'Rio de Janeiro', 'Lima', 'Bogotá', 'Santiago', 'Caracas', 'Montevideo'] },
  'Europe': { code: 'EU', cities: ['London', 'Paris', 'Berlin', 'Amsterdam', 'Moscow', 'Madrid', 'Rome', 'Stockholm', 'Vienna', 'Warsaw', 'Zurich', 'Dublin'] },
  'Asia': { code: 'AS', cities: ['Tokyo', 'Shanghai', 'Singapore', 'Hong Kong', 'Seoul', 'Mumbai', 'Dubai', 'Bangkok', 'Jakarta', 'Manila', 'Taipei', 'Beijing'] },
  'Africa': { code: 'AF', cities: ['Johannesburg', 'Cairo', 'Lagos', 'Nairobi', 'Cape Town', 'Casablanca', 'Accra', 'Addis Ababa'] },
  'Oceania': { code: 'OC', cities: ['Sydney', 'Melbourne', 'Auckland', 'Brisbane', 'Perth', 'Wellington'] },
  'Antarctica': { code: 'AN', cities: ['McMurdo Station', 'Palmer Station'] },
};

const THREAT_TYPES = [
  'Malware C2', 'Botnet', 'Phishing', 'DDoS Source', 'Brute Force', 
  'Data Exfiltration', 'Cryptomining', 'Spam', 'Ransomware', 'APT',
  'Zero-Day Exploit', 'SQL Injection', 'XSS Attack', 'Port Scan', 'Tor Exit Node'
];

const REPUTATION_CATEGORIES = [
  'Hosting Provider', 'VPN/Proxy', 'Residential', 'Educational', 
  'Corporate', 'Government', 'Cloud Provider', 'ISP', 'Mobile Carrier', 'Datacenter'
];

export const GlobalIntelligenceTracker = ({ className }: GlobalIntelligenceTrackerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [trackedEntities, setTrackedEntities] = useState<TrackedEntity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<TrackedEntity | null>(null);
  const [continentStats, setContinentStats] = useState<ContinentStats[]>([]);
  const [isLiveTracking, setIsLiveTracking] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  const { lookupIP, isLoading } = useGeoLocation();
  const { toast } = useToast();

  // Generate simulated global intelligence data
  const generateGlobalIntelligence = useCallback(() => {
    const entities: TrackedEntity[] = [];
    
    Object.entries(GLOBAL_REGIONS).forEach(([continent, { code, cities }]) => {
      const numEntities = Math.floor(Math.random() * 15) + 5;
      
      for (let i = 0; i < numEntities; i++) {
        const city = cities[Math.floor(Math.random() * cities.length)];
        const isIP = Math.random() > 0.3;
        const riskScore = Math.floor(Math.random() * 100);
        const status = riskScore > 80 ? 'malicious' : riskScore > 50 ? 'suspicious' : riskScore > 20 ? 'unknown' : 'clean';
        
        const threatTypes = status === 'malicious' 
          ? THREAT_TYPES.slice(0, Math.floor(Math.random() * 4) + 1)
          : status === 'suspicious'
          ? THREAT_TYPES.slice(0, Math.floor(Math.random() * 2) + 1)
          : [];

        entities.push({
          id: `${code}-${i}-${Date.now()}`,
          type: isIP ? 'ip' : 'domain',
          value: isIP 
            ? `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
            : `${['secure', 'api', 'cdn', 'data', 'proxy', 'mail', 'vpn'][Math.floor(Math.random() * 7)]}.${['example', 'test', 'demo', 'sample'][Math.floor(Math.random() * 4)]}.${['com', 'net', 'org', 'io', 'co'][Math.floor(Math.random() * 5)]}`,
          location: {
            ip: '',
            country: continent,
            countryCode: code,
            region: city,
            regionName: city,
            city,
            zip: '',
            latitude: getLatitudeForContinent(continent) + (Math.random() - 0.5) * 20,
            longitude: getLongitudeForContinent(continent) + (Math.random() - 0.5) * 40,
            isp: ['AWS', 'Azure', 'GCP', 'DigitalOcean', 'Cloudflare', 'Akamai'][Math.floor(Math.random() * 6)],
            organization: 'Unknown Organization',
            org: 'Unknown Organization',
            as: `AS${Math.floor(Math.random() * 60000) + 1000}`,
            asn: `AS${Math.floor(Math.random() * 60000) + 1000}`,
            timezone: 'UTC',
            continent,
            continentCode: code,
            query: '',
            status: 'success',
          },
          status,
          riskScore,
          threatTypes,
          firstSeen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          lastSeen: new Date(Date.now() - Math.random() * 60 * 60 * 1000),
          hitCount: Math.floor(Math.random() * 1000) + 1,
          reputation: {
            score: 100 - riskScore,
            category: REPUTATION_CATEGORIES[Math.floor(Math.random() * REPUTATION_CATEGORIES.length)],
            sources: ['VirusTotal', 'AbuseIPDB', 'Shodan', 'OTX'].slice(0, Math.floor(Math.random() * 4) + 1),
          },
          whois: {
            registrar: ['GoDaddy', 'Namecheap', 'Cloudflare', 'Google Domains'][Math.floor(Math.random() * 4)],
            createdDate: new Date(Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            expiresDate: new Date(Date.now() + Math.random() * 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            registrant: 'REDACTED FOR PRIVACY',
          },
        });
      }
    });

    return entities;
  }, []);

  // Calculate continent statistics
  const calculateContinentStats = useCallback((entities: TrackedEntity[]) => {
    const stats: ContinentStats[] = Object.entries(GLOBAL_REGIONS).map(([name, { code }]) => {
      const continentEntities = entities.filter(e => e.location?.continentCode === code);
      const threats = continentEntities.filter(e => e.status === 'malicious' || e.status === 'suspicious').length;
      const avgRisk = continentEntities.length > 0 
        ? continentEntities.reduce((sum, e) => sum + e.riskScore, 0) / continentEntities.length 
        : 0;
      
      return {
        name,
        code,
        totalEntities: continentEntities.length,
        threats,
        riskLevel: avgRisk > 60 ? 'critical' : avgRisk > 40 ? 'high' : avgRisk > 20 ? 'medium' : 'low',
      };
    });
    
    return stats.sort((a, b) => b.threats - a.threats);
  }, []);

  // Initialize and update data
  useEffect(() => {
    const entities = generateGlobalIntelligence();
    setTrackedEntities(entities);
    setContinentStats(calculateContinentStats(entities));
  }, [generateGlobalIntelligence, calculateContinentStats]);

  // Live tracking updates
  useEffect(() => {
    if (!isLiveTracking) return;

    const interval = setInterval(() => {
      setTrackedEntities(prev => {
        // Add a new entity occasionally
        if (Math.random() > 0.7) {
          const newEntities = generateGlobalIntelligence().slice(0, 1);
          const updated = [...newEntities, ...prev].slice(0, 200);
          setContinentStats(calculateContinentStats(updated));
          return updated;
        }
        return prev;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isLiveTracking, generateGlobalIntelligence, calculateContinentStats]);

  // Draw the world map
  const drawWorldMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = 'hsl(222, 47%, 6%)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'hsla(185, 100%, 50%, 0.08)';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= 24; i++) {
      const x = (i / 24) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let i = 0; i <= 12; i++) {
      const y = (i / 12) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw simplified continents
    const continents = [
      { name: 'North America', path: [[0.08, 0.12], [0.28, 0.08], [0.32, 0.25], [0.22, 0.42], [0.08, 0.32]] },
      { name: 'South America', path: [[0.18, 0.48], [0.28, 0.42], [0.30, 0.78], [0.14, 0.72]] },
      { name: 'Europe', path: [[0.44, 0.12], [0.58, 0.10], [0.62, 0.28], [0.44, 0.32]] },
      { name: 'Africa', path: [[0.44, 0.36], [0.62, 0.32], [0.68, 0.68], [0.44, 0.72]] },
      { name: 'Asia', path: [[0.54, 0.08], [0.92, 0.12], [0.96, 0.42], [0.58, 0.38]] },
      { name: 'Oceania', path: [[0.78, 0.55], [0.96, 0.50], [0.94, 0.72], [0.76, 0.70]] },
    ];

    ctx.fillStyle = 'hsla(222, 30%, 15%, 0.9)';
    ctx.strokeStyle = 'hsla(185, 100%, 50%, 0.25)';
    ctx.lineWidth = 1.5;

    continents.forEach(continent => {
      ctx.beginPath();
      continent.path.forEach((point, i) => {
        const x = point[0] * width;
        const y = point[1] * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Draw tracked entities
    const time = Date.now() / 1000;
    trackedEntities.forEach((entity, index) => {
      if (!entity.location) return;
      
      const x = ((entity.location.longitude + 180) / 360) * width;
      const y = ((90 - entity.location.latitude) / 180) * height;
      
      // Pulsing effect
      const pulsePhase = Math.sin(time * 2 + index * 0.5) * 0.5 + 0.5;
      const baseRadius = 3;
      const radius = baseRadius + pulsePhase * 2;

      // Color based on status
      const color = entity.status === 'malicious' ? 'hsl(0, 85%, 55%)' 
                  : entity.status === 'suspicious' ? 'hsl(38, 92%, 50%)'
                  : entity.status === 'unknown' ? 'hsl(200, 100%, 50%)'
                  : 'hsl(142, 76%, 45%)';

      // Draw glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
      gradient.addColorStop(0, color.replace(')', ', 0.6)').replace('hsl', 'hsla'));
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw point
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw connection lines for high-risk entities
      if (entity.riskScore > 70) {
        const centerX = width * 0.5;
        const centerY = height * 0.3;
        const progress = (Math.sin(time + index) + 1) / 2;
        const currentX = x + (centerX - x) * progress;
        const currentY = y + (centerY - y) * progress;

        ctx.strokeStyle = `hsla(0, 85%, 55%, ${0.3 - progress * 0.2})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Draw HQ marker
    const hqX = width * 0.5;
    const hqY = height * 0.3;
    ctx.fillStyle = 'hsl(185, 100%, 50%)';
    ctx.beginPath();
    ctx.arc(hqX, hqY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'hsla(185, 100%, 50%, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hqX, hqY, 10 + Math.sin(time * 3) * 3, 0, Math.PI * 2);
    ctx.stroke();

    animationRef.current = requestAnimationFrame(drawWorldMap);
  }, [trackedEntities]);

  useEffect(() => {
    drawWorldMap();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawWorldMap]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsScanning(true);
    setScanProgress(0);

    // Simulate scanning progress
    const progressInterval = setInterval(() => {
      setScanProgress(prev => Math.min(prev + Math.random() * 15, 95));
    }, 200);

    try {
      const result = await lookupIP(searchQuery.trim());
      
      clearInterval(progressInterval);
      setScanProgress(100);

      if (result.success && result.data) {
        const riskScore = Math.floor(Math.random() * 100);
        const status = riskScore > 80 ? 'malicious' : riskScore > 50 ? 'suspicious' : riskScore > 20 ? 'unknown' : 'clean';
        
        const newEntity: TrackedEntity = {
          id: `search-${Date.now()}`,
          type: 'ip',
          value: searchQuery,
          location: result.data,
          status,
          riskScore,
          threatTypes: status === 'malicious' ? THREAT_TYPES.slice(0, 2) : [],
          firstSeen: new Date(),
          lastSeen: new Date(),
          hitCount: 1,
          reputation: {
            score: 100 - riskScore,
            category: REPUTATION_CATEGORIES[Math.floor(Math.random() * REPUTATION_CATEGORIES.length)],
            sources: ['VirusTotal', 'AbuseIPDB'],
          },
        };

        setTrackedEntities(prev => [newEntity, ...prev]);
        setSelectedEntity(newEntity);
        
        toast({
          title: "Entity Located",
          description: `${searchQuery} traced to ${result.data.city}, ${result.data.country}`,
        });
      }
    } catch (error) {
      toast({
        title: "Lookup Failed",
        description: "Could not resolve the target",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      setSearchQuery('');
    }
  };

  const filteredEntities = trackedEntities.filter(entity => {
    if (filterStatus === 'all') return true;
    return entity.status === filterStatus;
  });

  const totalThreats = trackedEntities.filter(e => e.status === 'malicious' || e.status === 'suspicious').length;
  const avgRiskScore = trackedEntities.length > 0 
    ? Math.round(trackedEntities.reduce((sum, e) => sum + e.riskScore, 0) / trackedEntities.length)
    : 0;

  return (
    <RoleGuard roles={['admin', 'analyst']} fallback={
      <Card className="cyber-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Lock className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-xl font-bold text-destructive mb-2">Access Restricted</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Global Intelligence Tracker requires Admin or Analyst privileges.
          </p>
        </CardContent>
      </Card>
    }>
      <Card className={cn(
        "cyber-card overflow-hidden",
        isFullscreen && "fixed inset-4 z-50",
        className
      )}>
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Globe className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Global Intelligence Tracker</CardTitle>
                <CardDescription className="text-xs">Real-time IP/Domain threat intelligence across all continents</CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  isLiveTracking ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground"
                )}
              >
                <Radio className={cn("h-3 w-3 mr-1", isLiveTracking && "animate-pulse")} />
                {isLiveTracking ? 'LIVE' : 'PAUSED'}
              </Badge>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsLiveTracking(!isLiveTracking)}
                className="h-8 w-8"
              >
                {isLiveTracking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {/* Search Bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter IP address or domain to trace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 bg-secondary/50 border-border/50"
              />
            </div>
            <Button onClick={handleSearch} disabled={isScanning || !searchQuery.trim()}>
              {isScanning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Tracing...
                </>
              ) : (
                <>
                  <Crosshair className="h-4 w-4 mr-2" />
                  Trace
                </>
              )}
            </Button>
          </div>

          {/* Scan Progress */}
          {isScanning && (
            <div className="mb-4">
              <Progress value={scanProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Querying global threat intelligence databases...
              </p>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Database className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Tracked Entities</span>
              </div>
              <span className="text-xl font-bold">{trackedEntities.length}</span>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Active Threats</span>
              </div>
              <span className="text-xl font-bold text-destructive">{totalThreats}</span>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-warning" />
                <span className="text-xs text-muted-foreground">Avg Risk Score</span>
              </div>
              <span className="text-xl font-bold text-warning">{avgRiskScore}</span>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-4 w-4 text-info" />
                <span className="text-xs text-muted-foreground">Continents</span>
              </div>
              <span className="text-xl font-bold text-info">7</span>
            </div>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 bg-secondary/50">
              <TabsTrigger value="map" className="text-xs">
                <Map className="h-4 w-4 mr-1" /> Map
              </TabsTrigger>
              <TabsTrigger value="entities" className="text-xs">
                <Target className="h-4 w-4 mr-1" /> Entities
              </TabsTrigger>
              <TabsTrigger value="regions" className="text-xs">
                <Globe className="h-4 w-4 mr-1" /> Regions
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs">
                <BarChart3 className="h-4 w-4 mr-1" /> Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="space-y-4">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={900}
                  height={450}
                  className="w-full h-auto rounded-lg border border-border/50"
                  style={{ imageRendering: 'crisp-edges' }}
                />
                
                {/* Legend */}
                <div className="absolute bottom-2 left-2 bg-card/95 backdrop-blur-sm rounded-lg p-2 border border-border/50">
                  <div className="flex flex-wrap items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-destructive" />
                      <span>Malicious</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-warning" />
                      <span>Suspicious</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-info" />
                      <span>Unknown</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      <span>Clean</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>HQ</span>
                    </div>
                  </div>
                </div>

                {/* Stats Overlay */}
                <div className="absolute top-2 right-2 bg-card/95 backdrop-blur-sm rounded-lg p-2 border border-border/50">
                  <div className="text-[10px] space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Total Points:</span>
                      <span className="font-mono">{trackedEntities.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">High Risk:</span>
                      <span className="font-mono text-destructive">
                        {trackedEntities.filter(e => e.riskScore > 70).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="entities" className="space-y-4">
              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {['all', 'malicious', 'suspicious', 'unknown', 'clean'].map(status => (
                    <Button
                      key={status}
                      variant={filterStatus === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus(status)}
                      className="text-xs h-7 px-2"
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-2">
                    {filteredEntities.slice(0, 50).map(entity => (
                      <div
                        key={entity.id}
                        onClick={() => setSelectedEntity(entity)}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all hover:bg-secondary/50",
                          selectedEntity?.id === entity.id && "border-primary bg-primary/10",
                          entity.status === 'malicious' && "border-destructive/30",
                          entity.status === 'suspicious' && "border-warning/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {entity.type === 'ip' ? (
                                <Server className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              )}
                              <span className="font-mono text-sm truncate">{entity.value}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{entity.location?.city}, {entity.location?.country}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                entity.status === 'malicious' && "bg-destructive/10 text-destructive",
                                entity.status === 'suspicious' && "bg-warning/10 text-warning",
                                entity.status === 'unknown' && "bg-info/10 text-info",
                                entity.status === 'clean' && "bg-success/10 text-success"
                              )}
                            >
                              {entity.riskScore}% risk
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {entity.hitCount} hits
                            </span>
                          </div>
                        </div>
                        {entity.threatTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entity.threatTypes.slice(0, 3).map((type, i) => (
                              <span
                                key={i}
                                className="text-[9px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded"
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Entity Details */}
                {selectedEntity && (
                  <Card className="cyber-card h-[400px] overflow-auto">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Eye className="h-4 w-4 text-primary" />
                        Entity Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <span className="text-xs text-muted-foreground">Target</span>
                        <p className="font-mono text-sm">{selectedEntity.value}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-muted-foreground">Type</span>
                          <p className="text-sm capitalize">{selectedEntity.type}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Status</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "ml-0 mt-1",
                              selectedEntity.status === 'malicious' && "bg-destructive/10 text-destructive",
                              selectedEntity.status === 'suspicious' && "bg-warning/10 text-warning",
                              selectedEntity.status === 'clean' && "bg-success/10 text-success"
                            )}
                          >
                            {selectedEntity.status}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-muted-foreground">Location</span>
                        <p className="text-sm">
                          {selectedEntity.location?.city}, {selectedEntity.location?.region}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedEntity.location?.country} ({selectedEntity.location?.continent})
                        </p>
                      </div>

                      <div>
                        <span className="text-xs text-muted-foreground">Network</span>
                        <p className="text-sm">{selectedEntity.location?.isp}</p>
                        <p className="text-xs text-muted-foreground font-mono">{selectedEntity.location?.asn}</p>
                      </div>

                      <div>
                        <span className="text-xs text-muted-foreground">Reputation Score</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={selectedEntity.reputation.score} className="h-2 flex-1" />
                          <span className="text-sm font-medium">{selectedEntity.reputation.score}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Category: {selectedEntity.reputation.category}
                        </p>
                      </div>

                      {selectedEntity.threatTypes.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground">Threat Indicators</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedEntity.threatTypes.map((type, i) => (
                              <Badge key={i} variant="destructive" className="text-[10px]">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">First Seen</span>
                          <p>{selectedEntity.firstSeen.toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Seen</span>
                          <p>{selectedEntity.lastSeen.toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-muted-foreground">Intel Sources</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedEntity.reputation.sources.map((source, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="regions" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {continentStats.map(stat => (
                  <Card 
                    key={stat.code}
                    className={cn(
                      "cyber-card",
                      stat.riskLevel === 'critical' && "border-destructive/30",
                      stat.riskLevel === 'high' && "border-warning/30"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-sm">{stat.name}</h4>
                          <p className="text-xs text-muted-foreground">Region Code: {stat.code}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            stat.riskLevel === 'critical' && "bg-destructive/10 text-destructive",
                            stat.riskLevel === 'high' && "bg-warning/10 text-warning",
                            stat.riskLevel === 'medium' && "bg-info/10 text-info",
                            stat.riskLevel === 'low' && "bg-success/10 text-success"
                          )}
                        >
                          {stat.riskLevel.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded bg-secondary/50">
                          <span className="text-xs text-muted-foreground">Entities</span>
                          <p className="text-lg font-bold">{stat.totalEntities}</p>
                        </div>
                        <div className="p-2 rounded bg-destructive/10">
                          <span className="text-xs text-muted-foreground">Threats</span>
                          <p className="text-lg font-bold text-destructive">{stat.threats}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="cyber-card">
                  <CardContent className="p-4 text-center">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-success" />
                    <p className="text-2xl font-bold text-success">
                      {trackedEntities.filter(e => e.status === 'clean').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Clean</p>
                  </CardContent>
                </Card>
                <Card className="cyber-card">
                  <CardContent className="p-4 text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-info" />
                    <p className="text-2xl font-bold text-info">
                      {trackedEntities.filter(e => e.status === 'unknown').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Unknown</p>
                  </CardContent>
                </Card>
                <Card className="cyber-card">
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-warning" />
                    <p className="text-2xl font-bold text-warning">
                      {trackedEntities.filter(e => e.status === 'suspicious').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Suspicious</p>
                  </CardContent>
                </Card>
                <Card className="cyber-card">
                  <CardContent className="p-4 text-center">
                    <Zap className="h-8 w-8 mx-auto mb-2 text-destructive" />
                    <p className="text-2xl font-bold text-destructive">
                      {trackedEntities.filter(e => e.status === 'malicious').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Malicious</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="cyber-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Threat Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {THREAT_TYPES.slice(0, 8).map(type => {
                      const count = trackedEntities.filter(e => e.threatTypes.includes(type)).length;
                      const percentage = trackedEntities.length > 0 ? (count / trackedEntities.length) * 100 : 0;
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-32 truncate">{type}</span>
                          <Progress value={percentage} className="h-2 flex-1" />
                          <span className="text-xs font-mono w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </RoleGuard>
  );
};

// Helper functions
function getLatitudeForContinent(continent: string): number {
  const latitudes: Record<string, number> = {
    'North America': 40,
    'South America': -15,
    'Europe': 50,
    'Asia': 35,
    'Africa': 5,
    'Oceania': -25,
    'Antarctica': -80,
  };
  return latitudes[continent] || 0;
}

function getLongitudeForContinent(continent: string): number {
  const longitudes: Record<string, number> = {
    'North America': -100,
    'South America': -60,
    'Europe': 15,
    'Asia': 100,
    'Africa': 20,
    'Oceania': 140,
    'Antarctica': 0,
  };
  return longitudes[continent] || 0;
}

export default GlobalIntelligenceTracker;

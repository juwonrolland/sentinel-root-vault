import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectorNetworkConfig } from '@/components/SectorNetworkConfig';
import { 
  Shield, 
  Globe, 
  Building2, 
  Landmark, 
  Heart, 
  Factory,
  GraduationCap,
  Plane,
  Banknote,
  Cpu,
  Lock,
  Eye,
  Users,
  AlertTriangle,
  Activity,
  Target,
  Zap,
  Database,
  Network,
  Radio,
  Settings,
} from 'lucide-react';

interface SecurityPlatform {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  sector: string;
  features: string[];
  status: 'active' | 'standby' | 'maintenance';
  threatLevel: 'low' | 'moderate' | 'elevated' | 'high' | 'severe';
  metrics: {
    monitored: number;
    threats: number;
    resolved: number;
    uptime: string;
  };
}

const platforms: SecurityPlatform[] = [
  {
    id: 'govt',
    name: 'Government Security Platform',
    description: 'Sovereign infrastructure protection and national security monitoring',
    icon: <Landmark className="h-8 w-8" />,
    sector: 'Government',
    features: ['Classified Network Monitoring', 'Diplomatic Communication Security', 'Critical Infrastructure Protection', 'Cyber Warfare Defense', 'State Actor Detection'],
    status: 'active',
    threatLevel: 'elevated',
    metrics: { monitored: 45000, threats: 234, resolved: 198, uptime: '99.999%' }
  },
  {
    id: 'finance',
    name: 'Financial Security Intelligence',
    description: 'Banking, trading, and financial infrastructure protection',
    icon: <Banknote className="h-8 w-8" />,
    sector: 'Financial',
    features: ['Transaction Fraud Detection', 'Market Manipulation Monitoring', 'SWIFT Network Security', 'Cryptocurrency Threat Analysis', 'Regulatory Compliance'],
    status: 'active',
    threatLevel: 'high',
    metrics: { monitored: 128000, threats: 567, resolved: 534, uptime: '99.99%' }
  },
  {
    id: 'healthcare',
    name: 'Healthcare Defense System',
    description: 'Patient data protection and medical infrastructure security',
    icon: <Heart className="h-8 w-8" />,
    sector: 'Healthcare',
    features: ['HIPAA Compliance Monitoring', 'Medical Device Security', 'PHI Protection', 'Ransomware Defense', 'Research Data Security'],
    status: 'active',
    threatLevel: 'moderate',
    metrics: { monitored: 67000, threats: 123, resolved: 115, uptime: '99.98%' }
  },
  {
    id: 'corporate',
    name: 'Enterprise Security Suite',
    description: 'Corporate network and intellectual property protection',
    icon: <Building2 className="h-8 w-8" />,
    sector: 'Corporate',
    features: ['Insider Threat Detection', 'IP Theft Prevention', 'Supply Chain Security', 'M&A Data Protection', 'Executive Communications'],
    status: 'active',
    threatLevel: 'moderate',
    metrics: { monitored: 89000, threats: 345, resolved: 312, uptime: '99.97%' }
  },
  {
    id: 'critical',
    name: 'Critical Infrastructure Shield',
    description: 'Power grids, water systems, and essential services protection',
    icon: <Factory className="h-8 w-8" />,
    sector: 'Infrastructure',
    features: ['SCADA/ICS Security', 'Power Grid Monitoring', 'Water Treatment Security', 'Telecommunications Protection', 'Transportation Systems'],
    status: 'active',
    threatLevel: 'severe',
    metrics: { monitored: 23000, threats: 78, resolved: 71, uptime: '99.9999%' }
  },
  {
    id: 'defense',
    name: 'Defense Operations Center',
    description: 'Military and defense contractor security operations',
    icon: <Shield className="h-8 w-8" />,
    sector: 'Defense',
    features: ['Weapons System Security', 'Intelligence Network Protection', 'Combat System Defense', 'Supply Chain Integrity', 'Personnel Security'],
    status: 'active',
    threatLevel: 'elevated',
    metrics: { monitored: 34000, threats: 156, resolved: 149, uptime: '99.999%' }
  },
  {
    id: 'education',
    name: 'Academic Security Network',
    description: 'Research institutions and educational infrastructure protection',
    icon: <GraduationCap className="h-8 w-8" />,
    sector: 'Education',
    features: ['Research IP Protection', 'Student Data Security', 'Foreign Interference Detection', 'Grant Fraud Prevention', 'Campus Network Security'],
    status: 'active',
    threatLevel: 'low',
    metrics: { monitored: 56000, threats: 89, resolved: 82, uptime: '99.95%' }
  },
  {
    id: 'aviation',
    name: 'Aviation Security Command',
    description: 'Air traffic, airline, and aerospace security operations',
    icon: <Plane className="h-8 w-8" />,
    sector: 'Aviation',
    features: ['Air Traffic Control Security', 'Aircraft System Protection', 'Airline Network Defense', 'Satellite Communications', 'Airport Infrastructure'],
    status: 'active',
    threatLevel: 'elevated',
    metrics: { monitored: 18000, threats: 45, resolved: 43, uptime: '99.9999%' }
  }
];

export const MultiPlatformSecurityHub: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<SecurityPlatform | null>(null);
  const [activePlatforms, setActivePlatforms] = useState<string[]>(platforms.map(p => p.id));
  const [showNetworkConfig, setShowNetworkConfig] = useState(false);

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'severe': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'elevated': return 'bg-yellow-500 text-black';
      case 'moderate': return 'bg-blue-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-muted';
    }
  };

  const getThreatLevelBorder = (level: string) => {
    switch (level) {
      case 'severe': return 'border-red-500/50 shadow-red-500/20';
      case 'high': return 'border-orange-500/50 shadow-orange-500/20';
      case 'elevated': return 'border-yellow-500/50 shadow-yellow-500/20';
      case 'moderate': return 'border-blue-500/50 shadow-blue-500/20';
      case 'low': return 'border-green-500/50 shadow-green-500/20';
      default: return 'border-border';
    }
  };

  const totalMetrics = platforms.reduce((acc, p) => ({
    monitored: acc.monitored + p.metrics.monitored,
    threats: acc.threats + p.metrics.threats,
    resolved: acc.resolved + p.metrics.resolved
  }), { monitored: 0, threats: 0, resolved: 0 });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Global Overview Header */}
      <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
                <Globe className="h-5 w-5 sm:h-8 sm:w-8 text-primary" />
                Global Security Intelligence Hub
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Unified multi-sector security operations platform
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-2xl sm:text-4xl font-bold text-primary">{platforms.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Active Platforms</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
            <div className="text-center p-2 sm:p-4 bg-background/50 rounded-lg border border-primary/20">
              <div className="text-lg sm:text-3xl font-bold text-primary">{totalMetrics.monitored.toLocaleString()}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Monitored Assets</div>
            </div>
            <div className="text-center p-2 sm:p-4 bg-background/50 rounded-lg border border-primary/20">
              <div className="text-lg sm:text-3xl font-bold text-red-400">{totalMetrics.threats}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Active Threats</div>
            </div>
            <div className="text-center p-2 sm:p-4 bg-background/50 rounded-lg border border-primary/20">
              <div className="text-lg sm:text-3xl font-bold text-green-400">{totalMetrics.resolved}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Resolved Today</div>
            </div>
            <div className="text-center p-2 sm:p-4 bg-background/50 rounded-lg border border-primary/20">
              <div className="text-lg sm:text-3xl font-bold text-yellow-400">{platforms.filter(p => p.threatLevel === 'severe' || p.threatLevel === 'high').length}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">High Alert</div>
            </div>
            <div className="text-center p-2 sm:p-4 bg-background/50 rounded-lg border border-primary/20 col-span-2 sm:col-span-1">
              <div className="text-lg sm:text-3xl font-bold text-blue-400">99.99%</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Global Uptime</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
        {platforms.map(platform => (
          <Card 
            key={platform.id}
            className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg border-2 ${getThreatLevelBorder(platform.threatLevel)} ${
              selectedPlatform?.id === platform.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedPlatform(platform)}
          >
            <CardContent className="pt-3 sm:pt-4 px-2 sm:px-4">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`p-1.5 sm:p-2 rounded-lg ${platform.threatLevel === 'severe' || platform.threatLevel === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'}`}>
                  <div className="h-4 w-4 sm:h-6 sm:w-6">{platform.icon}</div>
                </div>
                <Badge className={`text-[8px] sm:text-[10px] ${getThreatLevelColor(platform.threatLevel)}`}>
                  {platform.threatLevel.toUpperCase()}
                </Badge>
              </div>
              <h3 className="font-bold text-[10px] sm:text-sm mb-0.5 sm:mb-1 line-clamp-1">{platform.name}</h3>
              <p className="text-[8px] sm:text-xs text-muted-foreground mb-2 sm:mb-3 line-clamp-2 hidden sm:block">{platform.description}</p>
              <div className="grid grid-cols-2 gap-1 sm:gap-2 text-center text-[8px] sm:text-xs">
                <div className="p-1 sm:p-2 bg-background/50 rounded">
                  <div className="font-bold text-[10px] sm:text-sm">{platform.metrics.monitored.toLocaleString()}</div>
                  <div className="text-muted-foreground hidden sm:block">Assets</div>
                </div>
                <div className="p-1 sm:p-2 bg-background/50 rounded">
                  <div className="font-bold text-[10px] sm:text-sm text-red-400">{platform.metrics.threats}</div>
                  <div className="text-muted-foreground hidden sm:block">Threats</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Platform Details */}
      {selectedPlatform && (
        <Card className={`border-2 ${getThreatLevelBorder(selectedPlatform.threatLevel)}`}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${selectedPlatform.threatLevel === 'severe' || selectedPlatform.threatLevel === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'}`}>
                  {selectedPlatform.icon}
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base">{selectedPlatform.name}</CardTitle>
                  <CardDescription className="text-xs">{selectedPlatform.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{selectedPlatform.sector}</Badge>
                <Badge className={`text-xs ${getThreatLevelColor(selectedPlatform.threatLevel)}`}>
                  {selectedPlatform.threatLevel.toUpperCase()}
                </Badge>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowNetworkConfig(!showNetworkConfig)}
                  className="text-xs"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  {showNetworkConfig ? 'Hide' : 'Configure'} Network
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="metrics" className="text-xs">Metrics</TabsTrigger>
                <TabsTrigger value="network" className="text-xs">Network Config</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-primary" />
                      Security Features
                    </h4>
                    <div className="space-y-2">
                      {selectedPlatform.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-background/50 rounded">
                          <Zap className="h-3 w-3 text-primary flex-shrink-0" />
                          <span className="truncate">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4 text-primary" />
                      Real-Time Metrics
                    </h4>
                    <div className="space-y-2">
                      <div className="p-2 bg-background/50 rounded-lg">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Monitored Assets</span>
                          <span className="font-bold">{selectedPlatform.metrics.monitored.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="p-2 bg-background/50 rounded-lg">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Active Threats</span>
                          <span className="font-bold text-red-400">{selectedPlatform.metrics.threats}</span>
                        </div>
                      </div>
                      <div className="p-2 bg-background/50 rounded-lg">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Resolved Today</span>
                          <span className="font-bold text-green-400">{selectedPlatform.metrics.resolved}</span>
                        </div>
                      </div>
                      <div className="p-2 bg-background/50 rounded-lg">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Platform Uptime</span>
                          <span className="font-bold text-primary">{selectedPlatform.metrics.uptime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      Threat Intelligence
                    </h4>
                    <div className="p-4 bg-background/50 rounded-lg border border-primary/20">
                      <div className="text-center mb-3">
                        <div className={`text-4xl font-bold ${
                          selectedPlatform.threatLevel === 'severe' ? 'text-red-500' :
                          selectedPlatform.threatLevel === 'high' ? 'text-orange-500' :
                          selectedPlatform.threatLevel === 'elevated' ? 'text-yellow-500' :
                          selectedPlatform.threatLevel === 'moderate' ? 'text-blue-500' :
                          'text-green-500'
                        }`}>
                          {selectedPlatform.threatLevel === 'severe' ? '5' :
                           selectedPlatform.threatLevel === 'high' ? '4' :
                           selectedPlatform.threatLevel === 'elevated' ? '3' :
                           selectedPlatform.threatLevel === 'moderate' ? '2' : '1'}
                        </div>
                        <div className="text-xs text-muted-foreground">Threat Level</div>
                      </div>
                      <div className="text-[10px] text-muted-foreground text-center">
                        {selectedPlatform.threatLevel === 'severe' && 'MAXIMUM ALERT: Imminent attack'}
                        {selectedPlatform.threatLevel === 'high' && 'HIGH ALERT: Significant threat'}
                        {selectedPlatform.threatLevel === 'elevated' && 'ELEVATED: Increased activity'}
                        {selectedPlatform.threatLevel === 'moderate' && 'GUARDED: General awareness'}
                        {selectedPlatform.threatLevel === 'low' && 'LOW: Normal posture'}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="metrics">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <div className="text-2xl font-bold text-primary">{selectedPlatform.metrics.monitored.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Assets</div>
                  </div>
                  <div className="p-3 bg-destructive/10 rounded-lg text-center">
                    <div className="text-2xl font-bold text-destructive">{selectedPlatform.metrics.threats}</div>
                    <div className="text-xs text-muted-foreground">Threats</div>
                  </div>
                  <div className="p-3 bg-success/10 rounded-lg text-center">
                    <div className="text-2xl font-bold text-success">{selectedPlatform.metrics.resolved}</div>
                    <div className="text-xs text-muted-foreground">Resolved</div>
                  </div>
                  <div className="p-3 bg-info/10 rounded-lg text-center">
                    <div className="text-2xl font-bold text-info">{selectedPlatform.metrics.uptime}</div>
                    <div className="text-xs text-muted-foreground">Uptime</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="network">
                <SectorNetworkConfig
                  sectorId={selectedPlatform.id}
                  sectorName={selectedPlatform.name}
                  sectorIcon={selectedPlatform.icon}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MultiPlatformSecurityHub;

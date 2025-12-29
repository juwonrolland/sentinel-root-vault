import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shield, Zap, Globe, Server, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HydraNetworkStatus from '@/components/HydraNetworkStatus';
import { AttackSimulation } from '@/components/AttackSimulation';
import { GlobalNodeMap } from '@/components/GlobalNodeMap';
import { HydraSpawnAnimation } from '@/components/HydraSpawnAnimation';
import { Globe3DMap } from '@/components/Globe3DMap';
import { RoleBadge } from '@/components/RoleBasedAccess';

const NetworkResilience = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Hydra Network Defense
                </h1>
              </div>
              <p className="text-muted-foreground mt-1">
                Distributed resilience & threat mitigation system
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-success/20 text-success border-success/30 animate-pulse">
              <Zap className="h-3 w-3 mr-1" />
              DEFENSE ACTIVE
            </Badge>
            <RoleBadge />
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg cyber-card border border-primary/20 text-center">
            <Server className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-3xl font-bold text-primary">47</div>
            <div className="text-sm text-muted-foreground">Global Nodes</div>
          </div>
          <div className="p-4 rounded-lg cyber-card border border-success/20 text-center">
            <Globe className="h-8 w-8 text-success mx-auto mb-2" />
            <div className="text-3xl font-bold text-success">12</div>
            <div className="text-sm text-muted-foreground">Regions</div>
          </div>
          <div className="p-4 rounded-lg cyber-card border border-accent/20 text-center">
            <Activity className="h-8 w-8 text-accent mx-auto mb-2" />
            <div className="text-3xl font-bold text-accent">99.99%</div>
            <div className="text-sm text-muted-foreground">Uptime</div>
          </div>
          <div className="p-4 rounded-lg cyber-card border border-info/20 text-center">
            <Shield className="h-8 w-8 text-info mx-auto mb-2" />
            <div className="text-3xl font-bold text-info">100%</div>
            <div className="text-sm text-muted-foreground">Protected</div>
          </div>
        </div>

        {/* 3D Globe Map */}
        <div className="mb-6">
          <Globe3DMap />
        </div>

        {/* Attack Simulation & Hydra Spawn Animation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <AttackSimulation />
          <HydraSpawnAnimation />
        </div>

        {/* Interactive Node Map */}
        <div className="mb-6">
          <GlobalNodeMap />
        </div>

        {/* Main Content */}
        <HydraNetworkStatus />

        {/* Security Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-6 rounded-lg cyber-card border border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold">Decentralized</h3>
                <p className="text-sm text-muted-foreground">Multi-continent hosting</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Infrastructure distributed across 12+ global regions. No single point of failure ensures 
              continuous operation even under coordinated attacks.
            </p>
          </div>

          <div className="p-6 rounded-lg cyber-card border border-accent/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-bold">DDoS Mitigation</h3>
                <p className="text-sm text-muted-foreground">Layer 4 & 7 protection</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Advanced traffic analysis and automatic mitigation for TCP/UDP floods, 
              SYN attacks, and application-layer threats.
            </p>
          </div>

          <div className="p-6 rounded-lg cyber-card border border-success/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-success/10">
                <Zap className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-bold">Auto-Spawn</h3>
                <p className="text-sm text-muted-foreground">Hydra regeneration</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              When a node goes down, two more automatically spawn. The network becomes 
              stronger with every attack attempt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkResilience;

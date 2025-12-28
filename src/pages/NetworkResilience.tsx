import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HydraNetworkStatus from '@/components/HydraNetworkStatus';
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
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50 animate-pulse">
              <Zap className="h-3 w-3 mr-1" />
              DEFENSE ACTIVE
            </Badge>
            <RoleBadge />
          </div>
        </div>

        {/* Main Content */}
        <HydraNetworkStatus />
      </div>
    </div>
  );
};

export default NetworkResilience;

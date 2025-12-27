import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, Shield, Radar, Network, Target, Lock, Activity, Server, AlertTriangle } from "lucide-react";
import { RoleBadge, RoleGuard } from "@/components/RoleBasedAccess";
import { GlobalIntelligenceTracker } from "@/components/GlobalIntelligenceTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const GlobalTracking = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    };
    checkAuth();
  }, [navigate]);

  if (!user) return null;

  return (
    <>
      
      <div className="min-h-screen bg-background cyber-grid">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" className="hover:bg-accent">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                <Globe className="h-6 w-6 md:h-8 md:w-8 text-primary animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">Global Intelligence Tracker</h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                  Professional-grade IP/Domain tracking across all continents
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 hidden sm:flex">
                <Radar className="h-3 w-3 mr-1 animate-spin" />
                SCANNING GLOBALLY
              </Badge>
              <RoleBadge />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <RoleGuard 
            roles={['admin', 'analyst']} 
            fallback={
              <Card className="cyber-card max-w-2xl mx-auto">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 rounded-full bg-destructive/10 mb-4">
                    <Lock className="h-12 w-12 text-destructive" />
                  </div>
                  <h3 className="text-2xl font-bold text-destructive mb-2">Access Restricted</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    The Global Intelligence Tracker requires elevated privileges. 
                    Only Administrators and Security Analysts can access this advanced tracking system.
                  </p>
                  <div className="flex gap-3">
                    <Link to="/dashboard">
                      <Button variant="outline">Return to Dashboard</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            }
          >
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="cyber-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Coverage</p>
                      <p className="text-xl font-bold">7 Continents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cyber-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Shield className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Protection</p>
                      <p className="text-xl font-bold text-success">ACTIVE</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cyber-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-info/10">
                      <Server className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Intel Sources</p>
                      <p className="text-xl font-bold text-info">12+</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cyber-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Activity className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Update Rate</p>
                      <p className="text-xl font-bold text-warning">Real-time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Tracker Component */}
            <GlobalIntelligenceTracker />

            {/* Capabilities Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card className="cyber-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    IP Geolocation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Precise geographic location tracking for any IP address worldwide with ISP and ASN identification.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="cyber-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Network className="h-4 w-4 text-info" />
                    Domain Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    WHOIS data, DNS records, SSL certificate analysis, and historical domain reputation scoring.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="cyber-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Threat Detection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Real-time correlation with global threat feeds including VirusTotal, AbuseIPDB, and Shodan.
                  </p>
                </CardContent>
              </Card>
            </div>
          </RoleGuard>
        </main>
      </div>
    </>
  );
};

export default GlobalTracking;

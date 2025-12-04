import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertTriangle, 
  Lock, 
  MessageSquare, 
  FileText,
  Activity,
  TrendingUp,
  Users,
  Bell,
  Shield,
  Radar,
  Globe,
  Zap,
  Eye,
  LogOut,
  ChevronRight,
  Fingerprint,
  Scan,
  FlaskConical,
  Loader2,
  BarChart3,
  Brain,
  Cpu,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { LiveMetricCard } from "@/components/LiveMetricCard";
import { RadarScanner } from "@/components/RadarScanner";
import { useSecurityAlerts } from "@/hooks/useSecurityAlerts";
import { useAlertPreferences } from "@/hooks/useAlertPreferences";
import { AlertSettingsPanel } from "@/components/AlertSettingsPanel";
import { AlertHistoryPanel } from "@/components/AlertHistoryPanel";
import { ThreatLevelIndicator } from "@/components/ThreatLevelIndicator";
import { NetworkTopology } from "@/components/NetworkTopology";
import { ThreatIntelligenceFeed } from "@/components/ThreatIntelligenceFeed";
import { GlobalThreatMap } from "@/components/GlobalThreatMap";
import { ThreatAnalyticsChart } from "@/components/ThreatAnalyticsChart";
import { ThreatStatsSummary } from "@/components/ThreatStatsSummary";
import { AIThreatAnalyzer } from "@/components/AIThreatAnalyzer";
import { LiveActivityFeed } from "@/components/LiveActivityFeed";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [threats, setThreats] = useState(0);
  const [events, setEvents] = useState(0);
  const [systemHealth, setSystemHealth] = useState(100);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [simulating, setSimulating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Alert preferences from local storage
  const { preferences, updatePreference } = useAlertPreferences();
  
  // Enable sound alerts and browser notifications based on preferences
  const { playAlertSound } = useSecurityAlerts({ preferences });

  useEffect(() => {
    // Auth check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    // Load real data
    loadDashboardData();

    // Real-time subscriptions
    const threatChannel = supabase
      .channel('dashboard-threats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threat_detections' }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_events' }, () => loadDashboardData())
      .subscribe();

    // Update time every second
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(threatChannel);
      clearInterval(timeInterval);
    };
  }, [navigate]);

  const loadDashboardData = async () => {
    const [threatsData, eventsData] = await Promise.all([
      supabase.from('threat_detections').select('*', { count: 'exact' }).eq('status', 'active'),
      supabase.from('security_events').select('*', { count: 'exact' }),
    ]);

    setThreats(threatsData.count || 0);
    setEvents(eventsData.count || 0);
  };

  const simulateSecurityEvent = async () => {
    setSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('simulate-security-event');
      
      if (error) throw error;
      
      toast({
        title: "Event Simulated",
        description: `${data.event?.event_type} (${data.event?.severity?.toUpperCase()})`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Simulation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSimulating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) return null;

  const features = [
    {
      title: "Security Command Center",
      description: "Real-time threat monitoring and system surveillance",
      icon: Shield,
      path: "/security-dashboard",
      color: "text-primary",
      gradient: "from-primary/20 to-info/10"
    },
    {
      title: "Threat Intelligence",
      description: "AI-powered threat detection and pattern analysis",
      icon: AlertTriangle,
      path: "/threat-detection",
      color: "text-destructive",
      gradient: "from-destructive/20 to-warning/10"
    },
    {
      title: "Access Control Matrix",
      description: "Zero-trust security and permission management",
      icon: Fingerprint,
      path: "/access-control",
      color: "text-success",
      gradient: "from-success/20 to-primary/10"
    },
    {
      title: "Forensic NLP Analysis",
      description: "Deep learning sentiment and threat detection",
      icon: MessageSquare,
      path: "/sentiment-analysis",
      color: "text-accent",
      gradient: "from-accent/20 to-primary/10"
    },
    {
      title: "Incident Response Center",
      description: "Automated incident tracking and resolution",
      icon: FileText,
      path: "/incident-response",
      color: "text-warning",
      gradient: "from-warning/20 to-destructive/10"
    },
    {
      title: "Infrastructure Monitor",
      description: "System performance and uptime analytics",
      icon: Activity,
      path: "/system-health",
      color: "text-info",
      gradient: "from-info/20 to-primary/10"
    },
    {
      title: "Compliance Engine",
      description: "GDPR, HIPAA, SOC2 automated compliance",
      icon: FileText,
      path: "/compliance-reports",
      color: "text-primary-light",
      gradient: "from-primary-light/20 to-accent/10"
    },
    {
      title: "Alert Management",
      description: "Real-time security notifications and alerts",
      icon: Bell,
      path: "/notifications",
      color: "text-warning",
      gradient: "from-warning/20 to-info/10"
    },
    {
      title: "Security Standards",
      description: "Global security protocols and audit trails",
      icon: Globe,
      path: "/security-compliance",
      color: "text-success",
      gradient: "from-success/20 to-accent/10"
    },
    {
      title: "Piracy Detection",
      description: "AI-powered copyright and IP protection",
      icon: Scan,
      path: "/piracy-detection",
      color: "text-accent",
      gradient: "from-accent/20 to-destructive/10"
    }
  ];

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 animate-pulse-glow">
                  <img 
                    src={logo} 
                    alt="GGSIP Logo" 
                    className="h-10 w-10 md:h-12 md:w-12 object-contain" 
                  />
                </div>
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gradient tracking-tight">
                  GLORIOUS GLOBAL SECURITY
                </h1>
                <p className="text-xs text-muted-foreground font-mono hidden md:block">
                  INTELLIGENCE PLATFORM v2.0
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Live Clock */}
              <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-secondary/50 rounded-lg border border-border/50">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-muted-foreground">SYSTEM TIME</span>
                <span className="font-mono text-sm text-foreground">
                  {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                </span>
              </div>

              <AlertSettingsPanel
                preferences={preferences}
                onUpdatePreference={updatePreference}
                onTestSound={() => playAlertSound("high")}
              />

              <AlertHistoryPanel />

              <Button 
                onClick={handleSignOut} 
                variant="outline" 
                size="sm" 
                className="border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="animate-fade-in">
              <p className="text-sm text-primary font-mono mb-1">
                // OPERATOR: {user?.email?.split('@')[0]?.toUpperCase() || 'AGENT'}
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Security Operations Center
              </h2>
              <p className="text-muted-foreground">
                Real-time global threat intelligence and security monitoring
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-full bg-success/10 border border-success/30 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-medium text-success">ALL SYSTEMS OPERATIONAL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <LiveMetricCard
            title="Active Threats"
            value={threats}
            icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
            status={threats > 0 ? "critical" : "success"}
            trend={threats > 0 ? "up" : "neutral"}
            trendValue={threats > 0 ? "Requires attention" : "All clear"}
          />
          <LiveMetricCard
            title="Security Events"
            value={events}
            icon={<Activity className="h-6 w-6 text-info" />}
            status="info"
            trend="neutral"
            trendValue="Last 24h"
          />
          <LiveMetricCard
            title="System Health"
            value={systemHealth}
            suffix="%"
            icon={<TrendingUp className="h-6 w-6 text-success" />}
            status="success"
            trend="up"
            trendValue="Optimal"
          />
          <LiveMetricCard
            title="Protection Level"
            value="MAX"
            icon={<Shield className="h-6 w-6 text-primary" />}
            status="info"
            trend="neutral"
            trendValue="Enterprise Grade"
            animate={false}
          />
        </div>

        {/* Visualization Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left Column - Radar & Network */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Radar Scanner */}
              <Card className="cyber-card overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Radar className="h-4 w-4 text-primary" />
                      Threat Radar
                    </CardTitle>
                    <span className="text-xs text-muted-foreground font-mono">SCANNING</span>
                  </div>
                </CardHeader>
                <CardContent className="flex justify-center py-4">
                  <RadarScanner size={160} threats={threats} />
                </CardContent>
              </Card>

              {/* Network Topology */}
              <Card className="cyber-card md:col-span-2 overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      Network Infrastructure
                    </CardTitle>
                    <span className="text-xs text-muted-foreground font-mono">LIVE TOPOLOGY</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <NetworkTopology />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Threat Intelligence Feed */}
          <Card className="cyber-card lg:col-span-4 overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Intelligence Feed</CardTitle>
              <Button
                onClick={simulateSecurityEvent}
                disabled={simulating}
                size="sm"
                variant="outline"
                className="h-7 text-xs border-primary/30 hover:bg-primary/10 hover:border-primary/50"
              >
                {simulating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <FlaskConical className="h-3 w-3 mr-1" />
                    Simulate
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="p-4 h-[350px]">
              <ThreatIntelligenceFeed maxItems={10} />
            </CardContent>
          </Card>
        </div>

        {/* Threat Level */}
        <Card className="cyber-card mb-8 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Global Threat Assessment</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              LAST UPDATE: {currentTime.toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
          <ThreatLevelIndicator level={threats > 0 ? 65 : 12} size="lg" />
        </Card>

        {/* Global Threat Map */}
        <Card className="cyber-card mb-8 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Global Threat Origins
              </CardTitle>
              <span className="text-xs text-muted-foreground font-mono">REAL-TIME GEOLOCATION</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <GlobalThreatMap height="450px" />
          </CardContent>
        </Card>

        {/* AI Intelligence & Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* AI Threat Analyzer */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">AI Threat Analysis</h3>
              <span className="text-xs text-accent font-mono ml-auto">NEURAL ENGINE</span>
            </div>
            <AIThreatAnalyzer />
          </div>
          
          {/* Live Activity Feed */}
          <Card className="cyber-card lg:col-span-7 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  System Activity Monitor
                </CardTitle>
                <span className="text-xs text-muted-foreground font-mono">REAL-TIME</span>
              </div>
            </CardHeader>
            <CardContent className="h-[450px]">
              <LiveActivityFeed maxItems={15} />
            </CardContent>
          </Card>
        </div>

        {/* Analytics Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Threat Analytics</h3>
            <span className="text-xs text-muted-foreground font-mono ml-auto">LAST 24 HOURS</span>
          </div>
          
          {/* Stats Summary */}
          <ThreatStatsSummary className="mb-6" />
          
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="cyber-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Threat Trends</CardTitle>
                <CardDescription className="text-xs">Stacked area view of events by severity</CardDescription>
              </CardHeader>
              <CardContent>
                <ThreatAnalyticsChart variant="area" hours={24} />
              </CardContent>
            </Card>
            
            <Card className="cyber-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Event Distribution</CardTitle>
                <CardDescription className="text-xs">Hourly breakdown by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                <ThreatAnalyticsChart variant="bar" hours={24} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Security Modules</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {features.map((feature, index) => (
              <Link key={feature.path} to={feature.path}>
                <Card 
                  className="cyber-card h-full cursor-pointer group transition-all duration-300 hover:border-primary/40 hover:shadow-glow-sm"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`h-5 w-5 ${feature.color}`} />
                    </div>
                    <h4 className="font-semibold text-sm text-foreground mb-1 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {feature.description}
                    </p>
                    <div className="mt-3 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Access Module</span>
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-border/30">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-primary transition-colors">About</Link>
              <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
              <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms</Link>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              © {new Date().getFullYear()} GLORIOUS GLOBAL TECHNOLOGY // ALL RIGHTS RESERVED
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Dashboard;

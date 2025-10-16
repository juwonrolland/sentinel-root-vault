import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Bell
} from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
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

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) return null;

  const features = [
    {
      title: "Security Dashboard",
      description: "Real-time monitoring of system health and access patterns",
      icon: Activity,
      path: "/security-dashboard",
      color: "text-blue-500"
    },
    {
      title: "Threat Detection",
      description: "AI-powered pattern recognition and anomaly detection",
      icon: AlertTriangle,
      path: "/threat-detection",
      color: "text-red-500"
    },
    {
      title: "Access Control",
      description: "Role-based permissions and comprehensive audit logging",
      icon: Lock,
      path: "/access-control",
      color: "text-green-500"
    },
    {
      title: "Sentiment Analysis",
      description: "Text analysis for communication monitoring and threat detection",
      icon: MessageSquare,
      path: "/sentiment-analysis",
      color: "text-purple-500"
    },
    {
      title: "Incident Response",
      description: "Track and manage security incidents efficiently",
      icon: FileText,
      path: "/incident-response",
      color: "text-orange-500"
    },
    {
      title: "System Health",
      description: "Monitor system performance and uptime metrics",
      icon: TrendingUp,
      path: "/system-health",
      color: "text-cyan-500"
    },
    {
      title: "Compliance Reports",
      description: "Generate GDPR, HIPAA, and SOC2 compliance documentation",
      icon: FileText,
      path: "/compliance-reports",
      color: "text-indigo-500"
    },
    {
      title: "Notifications",
      description: "Real-time system alerts and security updates",
      icon: Bell,
      path: "/notifications",
      color: "text-yellow-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Glorious Global Security Intelligence Platform" className="h-14 w-14 animate-fade-in object-contain" />
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Glorious Global Security Intelligence Platform
            </h1>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="hover:shadow-md transition-all">
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 animate-fade-in-up">
          <h2 className="text-4xl font-bold mb-3 bg-gradient-primary bg-clip-text text-transparent">
            Welcome back
          </h2>
          <p className="text-muted-foreground text-lg">
            Comprehensive security monitoring and threat management system
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="gradient-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Threats</CardTitle>
              <div className="p-2 rounded-lg bg-destructive/10">
                <Activity className="h-5 w-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">0</div>
              <p className="text-xs text-success mt-1 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-success"></span>
                No active threats detected
              </p>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">System Health</CardTitle>
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">100%</div>
              <p className="text-xs text-success mt-1 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-success"></span>
                All systems operational
              </p>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">1</div>
              <p className="text-xs text-muted-foreground mt-1">Currently logged in</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Link key={feature.path} to={feature.path}>
              <Card className="gradient-card border-0 shadow-lg hover:shadow-glow transition-all duration-300 cursor-pointer h-full group animate-fade-in-up hover:scale-105" style={{ animationDelay: `${index * 0.05}s` }}>
                <CardHeader>
                  <div className={`p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 w-fit mb-3 group-hover:shadow-glow transition-all`}>
                    <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    Open {feature.title}
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <footer className="mt-16 pt-8 border-t border-border/50">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/about" className="hover:text-primary transition-colors">About Us</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            © {new Date().getFullYear()} Glorious Global Technology. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Dashboard;
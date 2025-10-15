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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Glorious Global Technology" className="h-12 w-12" />
            <h1 className="text-2xl font-bold">Glorious Global Security Intelligence Platform</h1>
          </div>
          <Button onClick={handleSignOut} variant="outline">Sign Out</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
          <p className="text-muted-foreground">
            Comprehensive security monitoring and threat management system
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">No active threats detected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">100%</div>
              <p className="text-xs text-muted-foreground">All systems operational</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground">Currently logged in</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link key={feature.path} to={feature.path}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <feature.icon className={`h-12 w-12 ${feature.color} mb-2`} />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Open {feature.title}
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <footer className="mt-12 pt-8 border-t">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/about" className="hover:text-foreground transition-colors">About Us</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-foreground transition-colors">Terms of Service</Link>
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